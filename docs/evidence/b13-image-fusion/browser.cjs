// Run from the repo root with pnpm dev active. Set PLAYWRIGHT_REQUIRE to a project
// package.json that can resolve @playwright/test, or install it in a local QA workspace.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const qaRequire = createRequire(path.resolve(process.env.PLAYWRIGHT_REQUIRE || 'package.json'));
const { chromium, expect } = qaRequire('@playwright/test');
const evidence = __dirname;
const samples = path.resolve('node_modules/.cache/fusion-browser');
const methods = ['Blend', 'Colored Halftone', 'Hybrid'];
const unicode = ' https://example.net/雪?q=狐#🦊 ';

async function choose(page, label, option) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function range(page, label, value, min) {
  const slider = page.getByRole('slider', { name: new RegExp('^' + label) });
  const current = Number(await slider.inputValue());
  await slider.focus();
  // Real keyboard input exercises the native range and React's change handling.
  if (value === min) await slider.press('Home');
  else for (let i = 0; i < Math.abs(value - current); i++) await slider.press(value > current ? 'ArrowRight' : 'ArrowLeft');
  await expect(slider).toHaveValue(String(value));
}

async function download(page, button) {
  const next = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await next;
  return { name: file.suggestedFilename(), bytes: await fs.readFile(await file.path()) };
}

async function open(browser, { port = 4322, theme = 'light', width = 1440, mobile = false } = {}) {
  const page = await browser.newPage({
    viewport: { width, height: mobile ? 844 : 1180 },
    deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: theme, reducedMotion: 'reduce',
  });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
  await page.addInitScript(theme => localStorage.setItem('t4f.appearance', theme), theme);
  const origin = 'http://127.0.0.1:' + port;
  await page.goto(origin + '/lab/image-fusion', { waitUntil: 'networkidle' });
  const lab = page.locator('[data-image-fusion-lab]');
  await expect(lab.locator('[data-status]').first()).toBeVisible({ timeout: 30_000 });
  await expect(lab.getByRole('img')).toHaveCount(3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  return { page, lab, errors, requests, origin };
}

async function run(page) {
  await expect(page.getByRole('button', { name: 'Results JSON' })).toBeDisabled();
  await page.getByRole('button', { name: 'Run all three methods' }).click();
  await expect(page.getByRole('button', { name: 'Results JSON' })).toBeEnabled({ timeout: 60_000 });
}

async function collect(page, id, expected) {
  const reportFile = await download(page, 'Results JSON');
  const data = JSON.parse(reportFile.bytes);
  assert.equal(reportFile.name, 'fusion-results.json');
  assert.equal(data.parameters.content, expected);
  assert.equal(data.results.length, 3);
  assert(data.results.every(result => result.scans.length === 6 && result.renderMs > 0));
  const params = await download(page, 'Parameters JSON');
  assert.deepEqual(JSON.parse(params.bytes).parameters, data.parameters);
  for (const label of methods) {
    await page.getByRole('group', { name: 'Choose a method to inspect' }).getByRole('button', { name: label + ' ', exact: false }).click();
    const png = await download(page, 'Download selected PNG');
    assert.equal(png.bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(png.bytes.readUInt32BE(16), data.parameters.size);
    assert.equal(png.bytes.readUInt32BE(20), data.parameters.size);
    await fs.writeFile(path.join(samples, id + '-' + png.name), png.bytes);
  }
  return { id, ...data };
}

(async () => {
  await fs.mkdir(samples, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const groups = [];
  try {
    const { page, lab, errors, requests, origin } = await open(browser);
    await expect(page.getByRole('heading', { name: 'QR Image Fusion Lab' })).toBeVisible();
    for (const source of ['Chromatic', 'Graphic']) {
      if (source === 'Graphic') await choose(page, 'Image source', source);
      for (const anchor of [50, 60, 72, 85]) {
        await range(page, 'Center anchor', anchor, 25);
        await run(page);
        groups.push(await collect(page, source.toLowerCase() + '-' + anchor, 'https://example.com'));
        if (source === 'Graphic' && anchor === 72)
          await lab.screenshot({ path: path.join(evidence, 'global-light-comparison.png') });
      }
    }
    await range(page, 'Center anchor', 72, 25);
    await page.getByRole('checkbox', { name: 'Adaptive local luminance' }).check();
    await run(page);
    groups.push(await collect(page, 'graphic-adaptive', 'https://example.com'));
    await choose(page, 'Output size', '2048 px');
    await choose(page, 'Error correction', 'Q');
    await choose(page, 'Dithering', 'Ordered Bayer');
    await page.getByRole('button', { name: 'Run all three methods' }).click();
    await page.getByRole('button', { name: 'Cancel run' }).click();
    await expect(page.getByRole('button', { name: 'Results JSON' })).toBeDisabled();
    await run(page);
    groups.push(await collect(page, 'graphic-2048-ordered', 'https://example.com'));
    assert(groups.slice(0, 8).every(group => group.results[0].scans[0].status === 'pass'));
    await choose(page, 'Output size', '592 px');
    await range(page, 'Center anchor', 25, 25);
    await range(page, 'Constraint strength', 0, 0);
    await run(page);
    const unconstrained = await collect(page, 'graphic-no-constraint', 'https://example.com');
    assert(unconstrained.results.every(result => result.scans.some(scan => scan.status === 'fail')));
    groups.push(unconstrained);
    assert.deepEqual(errors, []);
    assert(requests.every(request => request.method === 'GET' &&
      (request.url.startsWith(origin + '/') || request.url.startsWith('blob:'))));
    await page.close();

    const mobile = await open(browser, { width: 390, mobile: true });
    const uploaded = await mobile.page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#173a5e';
      ctx.fillRect(14, 16, 260, 100);
      ctx.fillStyle = '#d88b4b';
      ctx.fillRect(100, 103, 174, 60);
      return canvas.toDataURL().split(',')[1];
    });
    await mobile.page.locator('input[type=file]').setInputFiles({
      name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image'),
    });
    await mobile.page.getByRole('button', { name: 'Run all three methods' }).click();
    await expect(mobile.lab.getByRole('alert')).toHaveText('Choose a PNG, JPEG or WebP image.');
    await mobile.page.locator('input[type=file]').setInputFiles({
      name: 'transparent-rectangular.png', mimeType: 'image/png', buffer: Buffer.from(uploaded, 'base64'),
    });
    await mobile.page.getByRole('textbox', { name: 'QR content' }).fill(unicode);
    await choose(mobile.page, 'Dithering', 'None');
    await choose(mobile.page, 'Error correction', 'M');
    await choose(mobile.page, 'Output size', '384 px');
    await run(mobile.page);
    const upload = await collect(mobile.page, 'mobile-upload', unicode);
    assert.deepEqual(upload.source, { name: 'transparent-rectangular.png', width: 300, height: 180 });
    groups.push(upload);
    await mobile.lab.getByRole('region', { name: 'Image comparison', exact: true })
      .screenshot({ path: path.join(evidence, 'mobile-upload.png') });
    assert.deepEqual(mobile.errors, []);
    assert(mobile.requests.every(request => request.method === 'GET' &&
      (request.url.startsWith(mobile.origin + '/') || request.url.startsWith('blob:'))));
    await mobile.page.close();

    const china = await open(browser, { port: 4321, theme: 'dark' });
    await expect(china.page.getByRole('heading', { name: '二维码图像融合实验' })).toBeVisible();
    assert.deepEqual(china.errors, []);
    await china.lab.screenshot({ path: path.join(evidence, 'cn-dark-comparison.png') });
    await china.page.close();
    await fs.writeFile(path.join(evidence, 'browser-results.json'), JSON.stringify({
      browser: await browser.version(), system: process.platform, samples: groups,
    }, null, 2) + '\n');
    console.log(`Captured ${groups.length} comparisons with ${groups.length * methods.length} PNG downloads.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
