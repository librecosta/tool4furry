import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { createHash } from 'node:crypto';

const appearanceSource = (await readFile('src/styles/appearance-controller.js', 'utf8')).replace(/\r\n?/g, '\n');
const navigationSource = (await readFile('src/styles/navigation-disclosure.js', 'utf8')).replace(/\r\n?/g, '\n');
const pillarsSource = (await readFile('src/styles/pillars-reveal.js', 'utf8')).replace(/\r\n?/g, '\n');
const storiesSource = (await readFile('src/styles/stories-reveal.js', 'utf8')).replace(/\r\n?/g, '\n');
const principlesSource = (await readFile('src/styles/principles-reveal.js', 'utf8')).replace(/\r\n?/g, '\n');
const scrollMetrics = (await readFile('src/ui/scroll-metrics.js', 'utf8')).replace(/\r\n?/g, '\n');
const scrollSource = (await readFile('src/styles/document-scroll.js', 'utf8')).replace(/\r\n?/g, '\n');
const documentScrollSource = `(() => {\n${scrollMetrics.replace('export function ', 'function ')}\n${scrollSource}\n})();`;
function assertDocumentScroll(dom, enabled = !dom.querySelector('[data-workbench="canvas"], [data-tools-catalog]')) {
  const scripts = dom.querySelectorAll('script#t4f-document-scroll');
  const docks = dom.querySelectorAll('[data-document-dock]');
  if (!enabled) {
    assert.equal(scripts.length, 0, 'Canvas/catalog never receives the document dock script');
    assert.equal(docks.length, 0, 'Canvas/catalog never receives a document dock');
    return;
  }
  assert.equal(scripts.length, 1, 'One audited document-scroll enhancement');
  assert.equal(scripts[0].parentElement, dom.body);
  assert.deepEqual([...scripts[0].attributes].map(attribute => attribute.name), ['id']);
  assert.equal(scripts[0].textContent.trim(), documentScrollSource.trim());
  assert.equal(docks.length, 1);
  assert(docks[0].hidden && docks[0].hasAttribute('inert') && docks[0].getAttribute('aria-hidden') === 'true');
}
function assertNavigationScript(dom) {
  const scripts = dom.querySelectorAll('script#t4f-navigation');
  assert.equal(scripts.length, 1, 'Exactly one independent navigation enhancement');
  const script = scripts[0];
  assert.equal(script.parentElement, dom.body, 'Navigation enhancement runs after static content');
  assert.deepEqual([...script.attributes].map(attribute => attribute.name), ['id']);
  assert.equal(script.textContent.trim(), navigationSource.trim(), 'Only the audited disclosure script is allowed');
}
function assertAppearanceScript(dom) {
  const scripts = dom.querySelectorAll('script#t4f-appearance');
  assert.equal(scripts.length, 1, 'Exactly one shared appearance initializer');
  const script = scripts[0];
  assert.equal(script.parentElement, dom.head, 'Theme restores synchronously in head');
  assert(!script.hasAttribute('src') && !script.hasAttribute('type') && !script.hasAttribute('defer') && !script.hasAttribute('async'));
  assert.equal(script.textContent.trim(), appearanceSource.trim(), 'Only the audited theme controller is allowed');
  assert.equal(script.dataset.default, 'dark');
  assert.deepEqual(JSON.parse(script.dataset.regionOrigins), ['https://tool4furry.cn', 'https://tool4furry.com']);
  assert(script.dataset.dark && script.dataset.light && script.dataset.dark !== script.dataset.light);
  return script;
}
function assertStaticNavigation(dom, homepage = false) {
  const workbench = dom.documentElement.hasAttribute('data-catalog-workbench');
  assert.equal(dom.querySelectorAll('[data-site-background]').length, 1, 'One shared page canvas');
  const dots = dom.querySelectorAll('[data-page-dots]');
  assert.equal(dots.length, 1, 'One shared fixed CSS dot field on every static page');
  assert.equal(dots[0].getAttribute('aria-hidden'), 'true');
  assert.deepEqual([...dots[0].children].map(side => side.dataset.pageDotSide), ['left', 'right']);
  assert.equal(dots[0].querySelectorAll('img, svg, canvas').length, 0, 'Dot pattern is CSS only');
  assertAppearanceScript(dom);
  assertNavigationScript(dom);
  assertDocumentScroll(dom);
  assert.equal(dom.querySelectorAll('astro-island').length, 0);
  const scripts = [...dom.querySelectorAll('script')];
  assert.deepEqual(scripts.filter(script => !script.hasAttribute('src')).map(script => script.id),
    homepage ? ['t4f-appearance', 't4f-home-pillars', 't4f-home-stories', 't4f-home-principles', 't4f-navigation', 't4f-document-scroll'] : workbench ? ['t4f-appearance', 't4f-navigation'] : ['t4f-appearance', 't4f-navigation', 't4f-document-scroll'], 'Audited inline scripts retain their content and order');
  assert.equal(scripts.length, homepage ? 7 : 3, 'Only explicitly owned route enhancements are allowed');
  if (homepage) {
    const pillars = dom.querySelector('script#t4f-home-pillars');
    assert.deepEqual([...pillars.attributes].map(attribute => attribute.name), ['id']);
    assert.equal(pillars.textContent.trim(), pillarsSource.trim());
    assert(pillars.previousElementSibling.matches('[data-home-pillars]'));
    const stories = dom.querySelector('script#t4f-home-stories');
    assert.deepEqual([...stories.attributes].map(attribute => attribute.name), ['id']);
    assert.equal(stories.textContent.trim(), storiesSource.trim());
    assert(stories.previousElementSibling.matches('[data-home-stories]'));
    const principles = dom.querySelector('script#t4f-home-principles');
    assert.deepEqual([...principles.attributes].map(attribute => attribute.name), ['id']);
    assert.equal(principles.textContent.trim(), principlesSource.trim());
    assert(principles.previousElementSibling.matches('section[data-home-section="principles"]'));
    const external = scripts.filter(script => script.hasAttribute('src'));
    assert.equal(external.length, 1);
    assert.deepEqual([...external[0].attributes].map(a => a.name).sort(), ['src', 'type']);
    assert.equal(external[0].type, 'module');
    assert.equal(external[0].getAttribute('src'), waveEntry, 'Only the identified homepage enhancement entry');
  } else if (workbench) {
    const external = scripts.filter(script => script.hasAttribute('src'));
    assert.equal(external.length, 1, 'Catalog owns exactly one module');
    assert.deepEqual([...external[0].attributes].map(a => a.name).sort(), ['src', 'type']);
    assert.equal(external[0].type, 'module');
    assert.equal(external[0].getAttribute('src'), catalogEntry, 'Only the identified catalog enhancement');
  }
  assert.equal(dom.querySelectorAll('link[rel="modulepreload"], link[as="script"]').length, 0);
}
function copyWithoutLanguageLink(dom) {
  const body = dom.body.cloneNode(true);
  for (const link of body.querySelectorAll('[data-language-link]')) {
    assert.equal(link.textContent.trim(), 'EN / 中');
    link.remove();
  }
  return body.textContent;
}

const region = process.argv[2];
assert(['cn', 'global'].includes(region), 'Specify cn or global');
const root = process.argv[3]
  ? resolve(process.argv[3])
  : resolve('dist', region);
const fixtureMode = process.argv[4] === '--fixture';
if (fixtureMode)
  assert.equal(
    root,
    resolve('../.validation/platform-v04a', region),
    'Fixture guards require the isolated output directory',
  );
const files = (await readdir(root, { recursive: true })).map((file) =>
  file.replaceAll('\\', '/'),
);
const catalogModules = files.filter(file => /^_astro\/ToolsCatalog\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/.test(file));
assert.equal(catalogModules.length, 1, 'One traceable catalog module');
const catalogEntry = '/' + catalogModules[0];
const catalogCode = await readFile(resolve(root, catalogModules[0]), 'utf8');
assert(catalogCode.length < 40000 && catalogCode.includes('[data-tools-catalog]') && catalogCode.includes('popstate') && catalogCode.includes('replaceState'));
assert(!/astro-island|react-dom|fetch\(|XMLHttpRequest|localStorage|ConverterSession|createShaderModule/.test(catalogCode), 'Catalog enhancement has no app root, persistence, network or tool core');
// Identify the owned Astro entry and inspect its actual emitted dependency;
// never allow arbitrary external scripts or an eager WebGPU dependency.
const waveEntries = [];
for (const file of files.filter(file => /^_astro\/HomeHero\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/.test(file))) {
  const code = await readFile(resolve(root, file), 'utf8');
  waveEntries.push({ file, code });
}
assert.equal(waveEntries.length, 1, 'One traceable Wavefield startup entry');
assert(/^_astro\/HomeHero\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/.test(waveEntries[0].file));
const waveEntry = '/' + waveEntries[0].file, waveCode = waveEntries[0].code;
assert(waveCode.length < 6000 && waveCode.includes('[data-wavefield]') && waveCode.includes('import(') && waveCode.includes('IntersectionObserver'));
assert(!/GPUBufferUsage|createShaderModule|@vertex|sampleNodes/.test(waveCode), 'No eager GPU/shader core in the startup chunk');
assert(!/waveSeed|waveStatic|waveFail|waveDpr|waveReference/.test(waveCode), 'DEV QA is stripped from production startup');
const runtimeImport = waveCode.match(/import\((['"\x60])\.\/(runtime\.[\w-]+\.js)\1\)/);
assert(runtimeImport && files.includes('_astro/' + runtimeImport[2]), 'GPU runtime is a real separate dynamic chunk');
const waveRuntime = await readFile(resolve(root, '_astro', runtimeImport[2]), 'utf8');
assert(waveRuntime.includes('createShaderModule') && waveRuntime.includes('sampleNodes') && waveRuntime.includes('premultiplied'));
assert(!/waveReference|waveSeed|waveFail|waveDpr|3592\.922|react-particle-orb/.test(waveRuntime), 'No article reference/DEV controls in production GPU core');
const wavePoster = await readFile(resolve(root, 'visuals/wavefield/wavefield.avif'));
assert.deepEqual(wavePoster, await readFile('public/visuals/wavefield/wavefield.avif'), 'Approved poster bytes are unchanged');
assert.equal(wavePoster.length, 16651);
assert.equal(createHash('sha256').update(wavePoster).digest('hex'), '27593852d0a627510e4fe304f63ffdec91707bf26692f5cb567f9d8bd09a72e7');
assert.equal(wavePoster.toString('ascii', 4, 8), 'ftyp');
assert(wavePoster.subarray(8, 32).toString('ascii').includes('avif'), 'Real AVIF poster');
const ispe = wavePoster.indexOf('ispe');
assert(ispe > 0);
assert.equal(wavePoster.readUInt32BE(ispe + 8), 1440);
assert.equal(wavePoster.readUInt32BE(ispe + 12), 576);
assert(files.includes('visuals/wavefield/NOTICE.txt'), 'Redistributed core retains its license and reference notices');
const allHTMLFiles = files.filter((file) => file.endsWith('.html'));
if (!fixtureMode)
  assert(
    !files.some((file) =>
      /FixtureTool|(^|\/)(fixtures|spikes)(\/|$)/.test(file),
    ),
    'Test-only assets leaked into production',
  );
assert(
  !files.some((file) => /(^|\/)lab(\/|$)/i.test(file)),
  'Lab paths leaked into production',
);
assert(
  !files.some((file) => /(^|\/)preview(\/|$)/i.test(file)),
  'Obsolete separate tool route emitted',
);
assert(
  !files.some((file) =>
    /LabRuntime|WorkbenchLab|LabMenu|CanvasDemo|FormDemo|BatchDemo|UILab|FilesLab|HeroEffectsLab|FlowFieldWaves|waves-renderer|scene-runtime/.test(
      file,
    ),
  ),
  'Lab entry assets leaked into production',
);
assert(allHTMLFiles.includes('404.html'), 'Missing static 404');
const origin = region === 'cn' ? 'https://tool4furry.cn' : 'https://tool4furry.com';
const socialImagePath = '/brand/tool4furry-og.png';
const socialImageURL = origin + socialImagePath;
const socialImage = await readFile(resolve(root, socialImagePath.slice(1)));
assert.equal(socialImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Social cover must be a real PNG');
assert.equal(socialImage.toString('ascii', 12, 16), 'IHDR');
assert.equal(socialImage.readUInt32BE(16), 1200);
assert.equal(socialImage.readUInt32BE(20), 630);
assert(socialImage.length > 33, 'Social cover must include image data');
assert.deepEqual(socialImage, await readFile(resolve('public', socialImagePath.slice(1))), 'Static social cover is copied without modification');
const secondary = region === 'cn' ? 'en' : 'zh';
assert(!allHTMLFiles.some(page => page.startsWith((region === 'cn' ? 'zh' : 'en') + '/')), 'Default locale must not have redundant prefixed routes');
for (const locale of ['zh', 'en']) {
const prefix = locale === (region === 'cn' ? 'zh' : 'en') ? '' : `${locale}/`;
const htmlFiles = allHTMLFiles.filter(page => prefix ? page.startsWith(prefix) : !/^(zh|en)\//.test(page)).map(page => prefix ? page.slice(prefix.length) : page);
const localPath = path => '/' + prefix + path.slice(1);
const alternatePath = path => prefix ? path : '/' + secondary + path;
const readHTML = page => readFile(resolve(root, prefix + page), 'utf8');

const informationPages = {
  about: locale === 'zh' ? ['关于 Tool4Furry', '关于 Tool4Furry'] : ['About Tool4Furry', 'About Tool4Furry'],
  privacy: locale === 'zh' ? ['隐私说明', '隐私说明 · Tool4Furry'] : ['Privacy', 'Privacy · Tool4Furry'],
  terms: locale === 'zh' ? ['使用条款', '使用条款 · Tool4Furry'] : ['Terms', 'Terms · Tool4Furry'],
};
for (const kind of Object.keys(informationPages))
  assert(htmlFiles.includes(`${kind}/index.html`), `Missing static information page: ${kind}`);
const home = await readHTML('index.html');
const document = new JSDOM(home).window.document;
const site = origin + '/' + prefix;
assert.equal(document.documentElement.lang, locale === 'zh' ? 'zh-CN' : 'en');
assert.equal(
  document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  site,
);
const expectedTitle =
  locale === 'zh'
    ? 'Tool4Furry — Furry 创作者的浏览器工具箱'
    : 'Tool4Furry — Browser Tools for Furry Creators';
const expectedDescription =
  locale === 'zh'
    ? 'Tool4Furry 正在为 Furry 创作者打造轻巧的浏览器工具箱，涵盖创作、素材处理与日常效率。首批工具开发中。'
    : 'Tool4Furry is building browser-based tools for furry creators, focused on creative tasks, assets and everyday productivity. Tools are on the way.';
assert.equal(
  document.title,
  expectedTitle,
  'Homepage title must not repeat the brand',
);
assert.equal(
  document.querySelector('meta[name="description"]')?.content,
  expectedDescription,
);
for (const [property, expected] of Object.entries({
  'og:title': expectedTitle,
  'og:description': expectedDescription,
  'og:url': site,
  'og:type': 'website',
  'og:site_name': 'Tool4Furry',
})) {
  const tags = document.querySelectorAll(`meta[property="${property}"]`);
  assert.equal(tags.length, 1, `Exactly one ${property}`);
  assert.equal(tags[0].content, expected);
}
assert.equal(document.querySelectorAll('h1').length, 1);
const principles = document.querySelector('section[data-home-section="principles"]');
assert(principles && principles === document.querySelector('main > section:last-of-type'), 'The editorial finale is the last semantic homepage section');
assert.equal(principles.getAttribute('aria-labelledby'), 'principles-heading');
assert.equal(principles.querySelectorAll('h2').length, 1);
assert.equal(principles.querySelector('h2').textContent, locale === 'zh' ? '技术与工程' : 'Technology & Engineering');
assert.deepEqual([...principles.querySelectorAll('p')].map(p => p.textContent), locale === 'zh' ? [
  'Tool4Furry 基于 Astro、React 与 StyleX 构建，面向 Furry 创作者开发实用的浏览器工具。我们从浏览器原生图像处理起步，逐步拓展至创作流程中的更多任务。',
  '在技术实现上，我们也将按需探索 WebAssembly、WebGL、WebGPU 与 Three.js，以支持更复杂的图像计算、实时渲染和交互式创作。',
] : [
  'Tool4Furry is built with Astro, React, and StyleX to develop practical browser-based tools for furry creators. Starting with native browser image processing, we aim to support more tasks across the creative workflow.',
  "On the technical side, we'll explore WebAssembly, WebGL, WebGPU, and Three.js as needed to support more advanced image computation, real-time rendering, and interactive creation.",
]);
assert.equal(principles.querySelectorAll('a').length, 1);
const sourceLink = principles.querySelector('a');
assert.equal(sourceLink.textContent, locale === 'zh' ? '查看源代码' : 'View source code');
assert.equal(sourceLink.getAttribute('href'), 'https://github.com/librecosta/tool4furry');
assert.equal(sourceLink.target, '_blank'); assert.equal(sourceLink.rel, 'noopener noreferrer');
assert.equal(principles.querySelectorAll('[data-principles-part]').length, 4);
assert(!principles.hasAttribute('data-principles-reveal'), 'The static finale is readable without JavaScript');
assert(!principles.querySelector('img, picture, svg, canvas, video, button, script, astro-island, [aria-hidden]'), 'The finale is text only, with no old media placeholder or hidden duplicate copy');
const pillars = document.querySelector('[data-home-section="workflow"] [data-home-pillars]');
assert(pillars, 'Three static pillars precede the editorial stories');
const stories = [...document.querySelectorAll('[data-home-story]')];
assert.deepEqual(stories.map(story => story.dataset.homeStory), ['feedback', 'collaboration']);
assert(!document.querySelector('#workflow-heading, [data-home-dev-preview]'), 'Obsolete workflow content and preview link are removed');
const storyAssets = [
  ['luminous-blue.avif', 'e4ec08ff7285dd922a23dee64f47da03510f0658fa256d3b744c77fc1d1225ec'],
  ['luminous-purple.avif', 'c9222193d9103b54a0eeede5dd460d14c41a796ec8f101a4d112ae42b82c99a2'],
];
for (const [index, story] of stories.entries()) {
  const heading = story.querySelector('h2');
  assert.equal(story.getAttribute('aria-labelledby'), heading?.id);
  assert.equal(heading.textContent, (locale === 'zh' ? ['反馈与改进', '交流与合作'] : ['Feedback & Improvements', 'Contact & Collaboration'])[index]);
  assert.equal(story.querySelector('a')?.textContent, (locale === 'zh' ? ['提交反馈', '联系我们'] : ['Submit feedback', 'Contact us'])[index]);
  assert.equal(story.querySelector('a')?.getAttribute('href'), ['https://github.com/librecosta/tool4furry/issues', 'mailto:contact@librecosta.com'][index]);
  const img = story.querySelector('img');
  assert.equal(img?.getAttribute('src'), `/visuals/home/${storyAssets[index][0]}`);
  assert.equal(img.width, 500); assert.equal(img.height, 400);
  assert.equal(img.alt, ''); assert.equal(img.getAttribute('loading'), 'lazy'); assert.equal(img.getAttribute('decoding'), 'async');
  assert.equal(img.getAttribute('draggable'), 'false', 'Only these decorative images explicitly disable native dragging');
  assert.equal(story.querySelectorAll('[data-story-part]').length, 4);
  assert(!story.hasAttribute('data-story-reveal'), 'Static stories remain visible without JavaScript');
  assert(!(story.querySelector('script, astro-island, canvas, video, button')));
  assert(story.firstElementChild.contains(heading) && !story.firstElementChild.contains(img), 'Reading order is text before decorative artwork');
  const bytes = await readFile(resolve(root, `visuals/home/${storyAssets[index][0]}`));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), storyAssets[index][1], 'Approved AVIF is copied without re-encoding');
}
assert.equal(stories[0].querySelector('a').target, '_blank');
assert.equal(stories[0].querySelector('a').rel, 'noopener noreferrer');
assert(!stories[1].querySelector('a').hasAttribute('target'));
const community = document.querySelector('[data-home-community]');
assert.equal(community?.nextElementSibling, pillars, 'Community cards immediately precede the existing pillars');
const communityCards = [...community.querySelectorAll('[data-community-card]')];
assert.deepEqual(communityCards.map(card => card.dataset.communityCard), region === 'cn' ? ['qq', 'telegram', 'support'] : ['discord', 'telegram', 'support']);
assert.deepEqual([...community.querySelectorAll('h3')].map(h => h.textContent), region === 'cn'
  ? (locale === 'zh' ? ['QQ 交流群', 'Telegram 群组', '赞助与支持'] : ['QQ Group', 'Telegram Group', 'Support the Project'])
  : (locale === 'zh' ? ['Discord 社群', 'Telegram 群组', '赞助与支持'] : ['Discord Community', 'Telegram Group', 'Support the Project']));
const communityLinks = [...community.querySelectorAll('a')];
assert.deepEqual(communityLinks.map(a => a.getAttribute('href')), region === 'cn'
  ? ['https://t.me/+-Fn3F3hprS8wY2M9', 'https://afdian.com/a/gofurry']
  : ['https://discord.gg/gEEgV8pkS', 'https://t.me/+-Fn3F3hprS8wY2M9', 'https://ko-fi.com/gofurry']);
assert(communityLinks.every(a => a.target === '_blank' && a.rel === 'noopener noreferrer'), 'Community destinations are native external links');
const communityLogos = region === 'cn' ? ['/community/telegram.png', '/community/afdian.png'] : ['/community/discord.png', '/community/telegram.png', '/community/ko-fi.png'];
assert.deepEqual(communityLinks.map(a => a.querySelector('img')?.getAttribute('src')), communityLogos);
assert(communityLinks.every(a => a.querySelector('img')?.getAttribute('alt') === '' && a.querySelector('img')?.getAttribute('aria-hidden') === 'true'), 'Link text owns the accessible name');
for (const name of ['discord.png', 'telegram.png', 'afdian.png', 'ko-fi.ico', 'ko-fi.png'])
  assert.deepEqual(await readFile(resolve(root, 'community', name)), await readFile(resolve('public/community', name)), 'Platform assets are copied unchanged');
assert.equal(community.querySelectorAll('button, script, astro-island').length, 0, 'Community cards add no scripts or fake actions');
if (region === 'cn') {
  const qr = community.querySelector('img');
  assert.equal(qr?.getAttribute('src'), '/community/QQ-Group.avif');
  assert.equal(qr.width, 128); assert.equal(qr.height, 128);
  assert.equal(communityCards[0].querySelectorAll('a').length, 0, 'QQ has no invented direct link');
  const qrBytes = await readFile(resolve(root, 'community/QQ-Group.avif'));
  assert.deepEqual(qrBytes, await readFile('public/community/QQ-Group.avif'));
  assert.equal(createHash('sha256').update(qrBytes).digest('hex'), '3cd0e1d70b2a0153024d13212cce2844bc0ff5ed00b6b634e4b57ad9748fc3b4', 'Approved QR bytes remain unchanged');
  assert(communityCards[2].textContent.includes('GoFurry'), 'Support identifies the actual Afdian account');
} else {
  assert.equal(community.querySelectorAll('img[src="/community/QQ-Group.avif"]').length, 0, 'Global pages never request the CN QR image');
  assert.equal(communityCards[2].querySelectorAll('a').length, 1, 'One real Ko-fi sponsorship entry');
  assert.equal(communityCards[2].querySelector('a').textContent.trim(), locale === 'zh' ? '在 Ko-fi 支持我们' : 'Support on Ko-fi');
  assert(communityCards[2].textContent.includes('GoFurry'), 'Support identifies the actual Ko-fi account');
}
assert.equal(pillars.nextElementSibling?.id, 't4f-home-pillars');
assert.equal(pillars.querySelectorAll('h2').length, 1);
assert.equal(pillars.querySelector('h2')?.textContent.trim(), locale === 'zh' ? '关于 Tool4Furry' : 'About Tool4Furry');
assert.deepEqual([...pillars.querySelectorAll('[data-pillar]')].map(item => item.dataset.pillar), ['experience', 'safety', 'privacy']);
assert.deepEqual([...pillars.querySelectorAll('h3')].map(item => item.textContent), locale === 'zh' ? ['体验优先', '安全优先', '隐私优先'] : ['Experience First', 'Security First', 'Privacy First']);
assert.deepEqual([...pillars.querySelectorAll('[data-pillar-part="number"]')].map(item => item.textContent), ['01', '02', '03']);
assert.equal(pillars.querySelectorAll('[data-pillar-part="cap"]').length, 2, 'Two shared cap segments leave room for the visible H2');
assert.equal(pillars.querySelectorAll('[data-pillar-separator]').length, 2);
assert.equal(pillars.querySelectorAll('[data-pillar-artwork] svg').length, 3);
assert.equal(new Set([...pillars.querySelectorAll('[data-pillar-artwork] svg')].map(item => item.innerHTML)).size, 3, 'Distinct experience, security and privacy icons');
assert.equal(pillars.querySelectorAll('[data-pillar-reveal], [data-pillars-enhanced]').length, 0, 'Static HTML is fully visible without enhancement');
assert(!pillars.hasAttribute('data-pillars-enhanced'), 'The static root is not pre-armed');
assert(!pillars.hasAttribute('data-pillar-reveal'), 'The group is fully visible without JavaScript');
const pillarLinks = [...pillars.querySelectorAll('a')];
assert.deepEqual(pillarLinks.map(link => link.getAttribute('href')), [localPath('/tools/'), localPath('/about/'), 'https://github.com/librecosta/tool4furry/issues', 'mailto:contact@librecosta.com', localPath('/privacy/'), localPath('/terms/')]);
assert.equal(pillarLinks[2].target, '_blank');
assert.equal(pillarLinks[2].rel, 'noopener noreferrer');
assert.equal(
  document.querySelector('h1')?.textContent.trim().replace(/\s+/g, ' '),
  locale === 'zh'
    ? '那些梦幻中的世界，等你创造。'
    : "Worlds you've dreamed of. Yours to bring to life.",
);
const hero = document.querySelector('[data-home-section="hero"]');
assert.deepEqual(
  [...hero.querySelectorAll('p')].map(p => p.textContent.trim()),
  locale === 'zh'
    ? ['从一个角色的诞生，到一件作品的完成。', '我们打磨工具，也珍惜创作中的每一份热爱。']
    : ["From a character's first spark to the finishing touch on a creation.", 'We craft tools with care, knowing how much heart goes into everything you make.'],
  'Hero has exactly the two frozen introduction paragraphs, without a status tail',
);
assert(document.querySelector('main#main-content'), 'Missing skip-link target');
assert.equal(
  document.querySelector('a[href="#main-content"]')?.textContent.trim(),
  locale === 'zh' ? '跳到主要内容' : 'Skip to content',
);
const catalog = document.querySelector(
  'section#tools[aria-labelledby="tools-heading"]',
);
assert(
  catalog?.querySelector('h2#tools-heading'),
  'The toolbox anchor and heading must always exist',
);
assert.equal(
  document.querySelectorAll('input[type="search"], [role="search"]').length,
  0,
  'No empty search UI',
);
const github = 'https://github.com/librecosta/tool4furry';
const symbol = '/brand/tool4furry-symbol.svg';
const horizontal = '/brand/tool4furry-horizontal.svg';
function assertFavicon(dom) {
  assert.equal(dom.querySelectorAll('link[rel="icon"]').length, 2);
  assert.equal(dom.querySelector('link[rel="icon"][type="image/vnd.microsoft.icon"]')?.getAttribute('href'), '/favicon.ico');
  assert.equal(dom.querySelector('link[rel="icon"][type="image/png"][sizes="96x96"]')?.getAttribute('href'), '/brand/tool4furry-favicon.png');
  assert.equal(dom.querySelector('link[rel="icon"][type="image/svg+xml"]'), null);
}
for (const tag of ['header', 'footer']) {
  const shell = document.querySelector(tag);
  assert(
    shell?.querySelector(`a[href="${localPath('/tools/')}"]`),
    `${tag}: missing cross-page toolbox link`,
  );
  if (tag === 'footer')
    assert(
      shell.querySelector(`a[href="${github}"]`),
      'Footer: missing real GitHub link',
    );
  else {
    assert(shell.querySelector(`a[href="${github}"][rel="noopener noreferrer"]`), 'Header: missing GitHub entry');
    assert(shell.querySelector('details[data-tool-disclosure] > summary'), 'Native no-JS toolbox required');
    assert.equal(shell.querySelectorAll('[role="menu"], [role="menuitem"]').length, 0, 'Toolbox contains ordinary navigation links');
  }
  const brand = shell.querySelector(`a[href="${localPath('/')}"]`);
  assert.equal(brand?.getAttribute('aria-label'), 'Tool4Furry');
  assert.equal(brand.querySelectorAll('[data-brand-symbol][aria-hidden="true"]').length, 1);
  assert.equal(brand.querySelectorAll('[data-brand-wordmark]').length, 1);
  assert.equal(brand.querySelector('[data-brand-wordmark]')?.textContent.trim(), 'Tool4Furry');
  assert.equal(brand.querySelectorAll('img').length, 0, 'The monochrome symbol inherits the brand color through a CSS mask');
}
assert(
  document.querySelector(`footer a[href="${github}/blob/master/LICENSE"]`),
  'Missing real license link',
);
assert(
  document
    .querySelector('footer')
    ?.textContent.includes('by LibreCosta') === false,
  'Footer brand does not repeat the copyright attribution',
);
assertFavicon(document);
const ico = await readFile(resolve(root, 'favicon.ico'));
assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 7, 0], 'Real multi-size ICO');
const png = await readFile(resolve(root, 'brand/tool4furry-favicon.png'));
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Real PNG favicon');
assert.equal(png.readUInt32BE(16), 96);
assert.equal(png.readUInt32BE(20), 96);
for (const path of [symbol, horizontal, '/brand/tool4furry-og-master.svg', '/brand/creative-fragments.svg']) {
  const svg = await readFile(resolve(root, path.slice(1)), 'utf8');
  const asset = new JSDOM(svg, { contentType: 'image/svg+xml' }).window
    .document;
  assert(
    asset.documentElement.hasAttribute('viewBox'),
    `${path}: missing viewBox`,
  );
  assert.equal(
    asset.querySelectorAll(
      'script, foreignObject, image, animate, animateTransform',
    ).length,
    0,
    `${path}: must be a static local vector`,
  );
  assert(
    !/\son\w+\s*=|(?:href|url)\s*[(=]/i.test(svg),
    `${path}: external resources or event handlers`,
  );
  if (path !== '/brand/creative-fragments.svg') {
    assert.equal(asset.querySelectorAll('text, filter, use, style').length, 0, 'Brand vectors use actual paths, without fonts or effects');
    assert.equal(svg.replace(/\r\n?/g, '\n'), (await readFile(resolve('public', path.slice(1)), 'utf8')).replace(/\r\n?/g, '\n'), 'Approved brand assets copied without transformation');
  }
}
for (const image of document.querySelectorAll('img')) {
  const src = image.getAttribute('src');
  const communityQR = region === 'cn' && src === '/community/QQ-Group.avif' && image.closest('[data-home-community] [data-community-card="qq"]');
  const communityLogo = communityLogos.includes(src) && image.closest('[data-home-community] a');
  const editorialArtwork = storyAssets.some(([name]) => src === `/visuals/home/${name}`) && image.closest('[data-home-story]');
  assert(
    image.closest('[data-site-compliance]')
      ? src?.startsWith('/') && !src.startsWith('//')
      : communityQR || communityLogo || editorialArtwork || src?.startsWith('/brand/') || (src === '/visuals/wavefield/wavefield.avif' && image.closest('[data-wavefield]')),
    'Homepage images are approved brand/compliance, Wavefield, regional community or exact editorial assets',
  );
  assert.equal(
    image.getAttribute('alt'),
    communityQR ? (locale === 'zh' ? 'QQ 交流群二维码' : 'QQ Group QR code') : '',
    'The community QR has descriptive alt; decorative art retains empty alt',
  );
  assert(
    image.hasAttribute('width') && image.hasAttribute('height'),
    'Reserve image geometry',
  );
}
assertStaticNavigation(document, true);
const waveRoot = document.querySelector('[data-home-section="hero"] [data-wavefield="static"]');
assert(waveRoot, 'Hero enhancement starts as complete static content');
const poster = waveRoot.querySelector('img'), waveCanvas = waveRoot.querySelector('canvas');
assert.equal(poster?.getAttribute('src'), '/visuals/wavefield/wavefield.avif');
assert.equal(poster.getAttribute('width'), '1440'); assert.equal(poster.getAttribute('height'), '576');
assert.equal(poster.getAttribute('aria-hidden'), 'true'); assert.equal(waveCanvas?.getAttribute('aria-hidden'), 'true');
assert.equal(waveRoot.querySelectorAll('img, canvas').length, 2, 'One decorative poster and one visible-size enhancement canvas');
assert(!home.includes('/lab/'), 'Lab navigation leaked into homepage');
assert.equal(
  document.querySelectorAll('link[rel="modulepreload"], link[as="script"]')
    .length,
  0,
  'Homepage must not preload JavaScript',
);
if (locale === 'en')
  assert(
    !/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(document)),
    'Chinese copy in global homepage',
  );
const fullHTML = await readHTML('tools/index.html');
const fullCatalog = new JSDOM(fullHTML).window.document;
assert.equal(
  fullCatalog.title,
  locale === 'zh' ? '工具箱 — Tool4Furry' : 'Toolbox — Tool4Furry',
);
assert.equal(fullCatalog.querySelectorAll('h1').length, 1);
assert.equal(
  fullCatalog.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  `${site}tools/`,
);
assertStaticNavigation(fullCatalog);
assert(!fullHTML.includes('/lab/'), 'Lab links leaked into full catalog');
if (locale === 'en')
  assert(
    !/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(fullCatalog)),
    'Chinese copy in global catalog',
  );
const cards = [...catalog.querySelectorAll('[data-home-tool]')];
assert.deepEqual([...document.querySelectorAll('[data-home-section]')].map(section => section.dataset.homeSection),
  ['hero', 'featured', 'roles', 'workflow', 'principles'], 'The five homepage blocks are statically rendered');
assert.deepEqual([...document.querySelectorAll('[data-home-role]')].map(role => role.dataset.homeRole),
  ['painter', 'composer', 'developer', 'animator', 'operations', 'studio']);
assert.deepEqual([...catalog.children].map(block => block.dataset.homeSection), ['featured', 'roles'], 'One continuous discovery section');
assert.equal(catalog.querySelectorAll('h2').length, 1, 'One visible discovery heading');
assert.equal(catalog.querySelectorAll('#roles-heading').length, 0, 'No duplicate role section header');
for (const artwork of catalog.querySelectorAll('[data-role-artwork]'))
  assert(artwork.querySelector('img'), 'Production role artwork requires a real asset');
assert.equal(document.querySelectorAll('[data-home-demo], [data-home-dev-preview]').length, 0, 'No development demonstration slots in production');
assert.equal(document.querySelectorAll('[data-home-dots]').length, 0, 'No obsolete document-scrolling homepage dots');
const featuredLayout = catalog.querySelector('[data-featured-layout]');
assert.equal(featuredLayout.querySelector('[data-featured-content]').parentElement, featuredLayout);
for (const decor of document.querySelectorAll('[data-home-decor]')) {
  assert.equal(decor.parentElement, featuredLayout, 'Artwork is the first normal Grid child');
  assert.equal(featuredLayout.firstElementChild, decor);
  assert.equal(decor.closest('[data-home-section]'), catalog.querySelector('[data-home-section="featured"]'), 'Artwork belongs only to the featured block');
  assert.equal(decor.querySelectorAll('img').length, 1, 'Production artwork requires a supplied asset');
  assert.equal(decor.querySelector('img').getAttribute('alt'), '');
  assert.equal(decor.querySelector('img').getAttribute('loading'), 'lazy');
}
assert(!/开发演示|封面占位|工具展示位|Development demo|Cover placeholder|Tool display slot/.test(document.body.textContent), 'No demo copy in production');
assert.equal(document.querySelectorAll('main img[src*="tool4furry-og"], main img[src*="creative-fragments"]').length, 0, 'Do not substitute OG or the old illustration for the selected Hero');
for (const image of document.querySelectorAll('main img')) {
  const src = image.getAttribute('src');
  assert(src?.startsWith('/') && files.includes(src.slice(1)), `Homepage media must exist: ${src}`);
  assert(Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0, 'Reserve media geometry');
}
for (const source of document.querySelectorAll('main picture source')) {
  for (const candidate of source.getAttribute('srcset').split(',')) {
    const src = candidate.trim().split(/\s+/)[0];
    assert(src.startsWith('/') && files.includes(src.slice(1)), `Responsive homepage media must exist: ${src}`);
  }
}
const allCards = [
  ...fullCatalog.querySelectorAll('ul > li > a[data-tool-card]'),
];
const toolLinks = new Set(allCards.map((card) => card.getAttribute('href')));
for (const link of document.querySelectorAll(`main a[href^="${localPath('/tools/')}"]`)) {
  const href = link.getAttribute('href');
  assert(href === localPath('/tools/') || toolLinks.has(href), `Homepage links only to the regional published catalog: ${href}`);
}
const toolPages = htmlFiles.filter((file) =>
  /^tools\/[^/]+\/index\.html$/.test(file),
);
assert(cards.length <= 4, 'Homepage featured grid must curate at most four tools');
assert.equal(catalog.querySelectorAll('[data-home-film], [data-home-featured] img, [data-home-featured] picture').length, 0, 'Featured grid has no filmstrip or cover images');
assert.equal(catalog.querySelectorAll('[tabindex]').length, 0, 'No obsolete focusable filmstrip');
for (const card of cards) {
  const icon = card.querySelector('svg');
  assert.equal(icon?.getAttribute('viewBox'), '0 0 256 256', 'Static Phosphor icon canvas');
  assert.equal(icon?.getAttribute('width'), '40', 'Compact featured icon size');
  assert.equal(icon?.getAttribute('aria-hidden'), 'true', 'Decorative icon does not repeat the tool name');
}
assert.equal(allCards.length, toolLinks.size, 'Duplicate full catalog URLs');
assert.equal(
  allCards.length,
  toolPages.length,
  'Full catalog must cover all real tool pages',
);
for (const [dom, list] of [
  [document, cards],
  [fullCatalog, allCards],
]) {
  assert.equal(
    new Set(list.map((card) => card.dataset.toolCard)).size,
    list.length,
    'Duplicate catalog tool IDs',
  );
  assert.equal(
    dom.querySelectorAll('[data-catalog-empty]').length,
    allCards.length === 0 ? 1 : 0,
  );
  if (!allCards.length) {
    assert(
      dom.body.textContent.includes(
        locale === 'zh' ? '工具正在准备中' : 'Tools are on the way',
      ),
      'Wrong empty state copy',
    );
    assert.equal(
      dom.querySelectorAll(
        '[id^="domain-"], [id^="audience-"], [id^="context-"]',
      ).length,
      0,
      'No obsolete/empty discovery sections',
    );
  }
  for (const card of list) {
    const href = card.getAttribute('href');
    assert(
      /^\/tools\/[a-z0-9-]+\/$/.test(href.slice(prefix.length)),
      `Invalid real tool route: ${href}`,
    );
    assert(
      allHTMLFiles.includes(`${href.slice(1)}index.html`),
      `Catalog link has no generated page: ${href}`,
    );
    assert(
      card.querySelector('h3, h4')?.textContent.trim(),
      'Missing tool title',
    );
    assert(
      card.querySelector('p')?.textContent.trim(),
      'Missing tool description',
    );
    assert.equal(
      card.querySelectorAll('a, button, input').length,
      0,
      'No nested interactive card controls',
    );
  }
}
assert.equal(document.querySelector('[data-home-cta]')?.getAttribute('href'), localPath('/tools/'), 'Hero always navigates to the regional localized catalog');
for (const card of cards) {
  const full = allCards.find(
    (entry) => entry.dataset.toolCard === card.dataset.toolCard,
  );
  assert.equal(
    full?.getAttribute('href'),
    card.getAttribute('href'),
    'Featured card must exist in the regional full catalog',
  );
}
for (const page of toolPages)
  assert(
    toolLinks.has(localPath('/' + page.replace(/index\.html$/, ''))),
    `Unlisted tool page: ${page}`,
  );
for (const role of document.querySelectorAll('[data-home-role]')) {
  const links = [...role.querySelectorAll('[data-home-role-tool]')];
  assert(links.length <= 12, 'At most twelve real tools per role');
  assert.equal(role.querySelectorAll('[data-home-media="thumbnail"], [data-home-demo]').length, 0, 'Role lists contain no covers or filler tools');
  assert.equal(new Set(links.map(link => link.dataset.homeRoleTool)).size, links.length);
  for (const link of links) {
    assert.equal(link.querySelector('svg')?.getAttribute('width'), '20', 'Compact role tool icon');
    assert.equal(link.getAttribute('title'), link.textContent.trim(), 'Full tool name is available when truncated');
    const entry = allCards.find(card => card.dataset.toolCard === link.dataset.homeRoleTool);
    assert(entry && entry.getAttribute('href') === link.getAttribute('href'), 'Role tools must exist in the published regional catalog');
  }
}
for (const link of fullCatalog.querySelectorAll(`a[href^="${localPath('/tools/')}"]`)) {
  const href = link.getAttribute('href');
  assert(
    href === localPath('/tools/') || toolLinks.has(href),
    `Invalid discovery link: ${href}`,
  );
}
const fontAssets = new Set();
const inlineFonts = new Set();
for (const page of htmlFiles) {
  const content = await readHTML(page);
  if (!fixtureMode)
    assert(
      !/STATIC_GUIDE_ONLY_|data-fixture-counter/.test(content),
      `Test content leaked: ${page}`,
    );
  assert(!content.includes('virtual:stylex'), `Dev StyleX runtime in ${page}`);
  assert(
    !content.includes('stylex-dev-css'),
    `Dev StyleX refresh shim in ${page}`,
  );
  const dom = new JSDOM(content).window.document;
  assert.equal(dom.documentElement.hasAttribute('data-catalog-workbench'), page === 'tools/index.html', 'Fixed catalog shell is route-specific');
  const footers = dom.querySelectorAll('[data-site-footer]');
  if (page === 'tools/index.html') {
    assert.equal(footers.length, 0, 'Catalog has no ordinary Footer');
    assert.equal(dom.querySelectorAll('[data-site-compliance], [data-footer-compliance-slot], [data-footer-compliance-preview], [data-document-dock]').length, 0);
    assert.equal(dom.querySelectorAll('[data-site-header]').length, 1);
    assert.equal(dom.querySelectorAll('input[type="search"]').length, 1);
    assert(dom.querySelector('input[type="search"]').disabled, 'No fake search without JS');
    assert(dom.querySelector('noscript')?.textContent.includes('JavaScript'));
    assert.equal(dom.querySelectorAll('[data-filter="role"]').length, 6);
    assert.deepEqual([...dom.querySelectorAll('[data-filter="role"]')].map(el => el.dataset.value), ['painter', 'composer', 'developer', 'animator', 'operations', 'studio']);
    assert.equal(dom.querySelectorAll('[data-catalog-filters]').length, 1, 'One responsive filter tree');
    for (const card of dom.querySelectorAll('[data-catalog-item]')) assert.equal(card.hidden, false, 'No-JS catalog shows every real card');
    assertStaticNavigation(dom);
  } else {
  assert.equal(footers.length, 1, `Exactly one shared footer in ${page}`);
  const footer = footers[0];
  assert.equal(footer.tagName, 'FOOTER');
  assert.equal(footer.closest('main, astro-island'), null, 'Footer must be static and outside the tool');
  assert.deepEqual([...footer.firstElementChild.children].map(el => el.tagName), ['DIV', 'NAV', 'DIV', 'DIV'], 'Footer retains brand/navigation bands and the compliance slot above final legal content');
  const social = footer.querySelectorAll('[data-footer-social]');
  assert.equal(social.length, 1, 'Only the real GitHub social entry');
  assert.equal(social[0].getAttribute('href'), github);
  assert.equal(social[0].getAttribute('rel'), 'noopener noreferrer');
  assert.equal(social[0].getAttribute('target'), '_blank');
  assert(social[0].getAttribute('aria-label'));
  const groups = footer.querySelector(':scope > div > nav').children;
  assert.deepEqual([...groups].map(el => el.querySelector('p').textContent.trim()), locale === 'zh' ? ['工具', '项目', '支持'] : ['Tools', 'Project', 'Support']);
  assert.deepEqual([...groups].map(el => [...el.querySelectorAll('a')].map(a => a.getAttribute('href'))), [
    [localPath('/#tools'), localPath('/tools/')], [localPath('/about/'), github, footer.querySelector('[data-region-link]')?.getAttribute('href')], [`${github}/issues`, 'mailto:contact@librecosta.com'],
  ]);
  const regionURL = new URL(footer.querySelector('[data-region-link]')?.getAttribute('href'));
  assert.equal(regionURL.origin, region === 'cn' ? 'https://tool4furry.com' : 'https://tool4furry.cn');
  const regionalBase = locale === (region === 'cn' ? 'en' : 'zh') ? '' : `/${locale}`;
  assert(regionURL.pathname.startsWith(regionalBase + '/'), 'Region link preserves locale');
  assert.equal(regionURL.search + regionURL.hash, '', 'Static regional link is clean');
  const report = footer.querySelector('a[href="mailto:contact@librecosta.com"]');
  assert.equal(report?.textContent.trim(), locale === 'zh' ? '安全漏洞报告' : 'Report a vulnerability');
  assert.equal(footer.querySelectorAll('a[href="mailto:contact@librecosta.com"]').length, 1);
  assert.equal(footer.querySelector('a[href*="sitemap"], a[href$="robots.txt"], a[href$="llms.txt"], a[href$="security.txt"]'), null, 'No technical discovery links in Footer');
  const legal = footer.querySelector('[data-footer-legal]');
  const slots = footer.querySelectorAll('[data-footer-compliance-slot]');
  assert.equal(slots.length, 1, 'One stable compliance slot, even without records');
  const slot = slots[0];
  assert.equal(slot.nextElementSibling, legal, 'Compliance precedes the complete legal/copyright row');
  assert.equal(legal, footer.firstElementChild.lastElementChild, 'Legal/copyright remains the final footer line');
  assert.equal(legal.querySelector('[data-site-compliance]'), null, 'Compliance is no longer inside the left legal area');
  assert.equal(dom.querySelector('[data-footer-compliance-preview]'), null, 'CN DEV compliance hint must never enter production');
  assert(!/备案展示位|备案展示位置/.test(content), 'Development compliance copy leaked into static HTML');
  const records = footer.querySelectorAll('[data-site-compliance]');
  assert(records.length <= 1, 'At most one regional compliance group');
  for (const group of records)
    assert.equal(group.parentElement, slot, 'All approved records, including additional notices, belong to the bottom slot');
  if (records.length === 0) assert.equal(slot.childElementCount, 0, 'Unconfigured production slot stays empty');
  if (region === 'global')
    assert.equal(slot.querySelector('[data-compliance-kind="icp"], [data-compliance-kind="public-security"]'), null, 'Global never inherits CN registrations');
  for (const icp of slot.querySelectorAll('[data-compliance-kind="icp"]')) {
    assert(icp.querySelector('a > span')?.textContent.trim(), 'Approved ICP number itself is linked');
    assert.equal(icp.querySelector('a')?.getAttribute('href'), 'https://beian.miit.gov.cn/');
    assert.equal(icp.querySelectorAll('a').length, 1, 'No duplicate ICP query line');
  }
  assert.deepEqual([...legal.querySelectorAll('nav a')].map(a => a.getAttribute('href')), [localPath('/privacy/'), localPath('/terms/'), `${github}/blob/master/LICENSE`]);
  assert(legal.textContent.replace(/\s+/g, ' ').includes(`© ${new Date().getFullYear()} Tool4Furry · LibreCosta`));
  const attribution = legal.querySelector('[data-footer-attribution]');
  assert.equal(attribution?.textContent, 'LibreCosta');
  assert.equal(attribution?.getAttribute('href'), 'https://librecosta.com');
  assert.equal(attribution?.getAttribute('target'), '_blank');
  assert.equal(attribution?.getAttribute('rel'), 'noopener noreferrer');
  assert(footer.querySelector(`a[href="${github}/blob/master/LICENSE"]`));
  for (const kind of Object.keys(informationPages))
    assert(footer.querySelector(`a[href="${localPath(`/${kind}/`)}"]`), `Missing Footer information link: ${kind} in ${page}`);
  assert(!/TEST_ONLY_|测试ICP备|测试公网安备|待备案/.test(footer.textContent), 'Test/placeholder compliance leaked');
  for (const entry of footer.querySelectorAll('[data-site-compliance] a')) {
    assert.equal(entry.closest('[data-footer-compliance-slot]'), slot, 'Approved records stay in the bottom compliance slot');
    assert(entry.textContent.trim(), 'Empty compliance label');
    assert(new URL(entry.href).protocol === 'https:', 'Compliance queries must use HTTPS');
  }
  }
  if (toolPages.includes(page)) {
    if (page === 'tools/image-converter/index.html')
      assert(!/开发保护值|全设备兼容承诺|development (?:resource )?guardrails/i.test(dom.body.textContent),
        'Converter public copy must describe current limits, not internal guardrails');
    assert.equal(dom.querySelectorAll('[data-site-header]').length, 0, 'Tool page must keep its independent navigation');
    const main = dom.querySelector('main[data-tool-id]');
    const href = localPath('/' + page.replace(/index\.html$/, ''));
    const card = allCards.find((entry) => entry.getAttribute('href') === href);
    assert.equal(
      main?.getAttribute('data-tool-id'),
      card?.dataset.toolCard,
      `Tool identity mismatch: ${page}`,
    );
    assert.equal(main?.getAttribute('data-tool-region'), region);
    assert.equal(
      dom.querySelectorAll('h1').length,
      1,
      `Exactly one static tool H1: ${page}`,
    );
    assert.equal(
      dom.querySelectorAll('astro-island').length,
      1,
      `Exactly one tool React root: ${page}`,
    );
    assert(
      dom.querySelector('astro-island[component-url*="ToolRuntime"]'),
      `Wrong fixed root: ${page}`,
    );
    assert.equal(
      dom.querySelectorAll('[data-tool-page-entry]').length,
      1,
      'One product navigation owner',
    );
    assert.equal(
      dom.querySelectorAll('[data-tool-page-entry] h1').length,
      0,
      'Navigation identity is not the SEO H1',
    );
    const intro = dom.querySelector('[data-tool-intro]');
    const runtime = dom.querySelector('[data-tool-runtime]');
    const guide = dom.querySelector('[data-tool-guide]');
    assert(
      intro?.querySelector('h1')?.textContent.trim() &&
        intro.querySelector('p')?.textContent.trim(),
      `Missing static intro: ${page}`,
    );
    assert(
      runtime &&
        guide &&
        intro.compareDocumentPosition(runtime) & 4 &&
        runtime.compareDocumentPosition(guide) & 4,
      'Intro → runtime → static guide order',
    );
    assert.equal(
      (dom.title.match(/Tool4Furry/g) ?? []).length,
      1,
      'Single brand in tool title',
    );
    assert.equal(
      dom.querySelectorAll('meta[name="robots"]').length,
      0,
      'No unpublished/noindex/alternate tool routes',
    );
    for (const link of dom.querySelectorAll('[data-related-tools] a'))
      assert(
        toolLinks.has(link.getAttribute('href')) &&
          link.getAttribute('href') !== href,
        'Related links must be distinct regional published tools',
      );
  }
  assert.equal(dom.documentElement.lang, locale === 'zh' ? 'zh-CN' : 'en');
  if (page !== '404.html') {
    const canonical = site + page.replace(/index\.html$/, '');
    const alternates = [...dom.querySelectorAll('link[rel="alternate"][hreflang]')];
    assert.equal(alternates.length, 2, 'One alternate per supported locale');
    assert.deepEqual(new Set(alternates.map(link => link.hreflang)), new Set(['zh-CN', 'en']));
    for (const link of alternates) {
      const url = new URL(link.href);
      assert.equal(url.origin, origin, 'Alternates never cross deployment regions');
      assert(allHTMLFiles.includes(url.pathname.slice(1) + 'index.html'), 'Alternate page exists');
      const expected = link.hreflang === (locale === 'zh' ? 'zh-CN' : 'en') ? canonical : origin + alternatePath('/' + page.replace(/index\.html$/, ''));
      assert.equal(link.href, expected, 'Alternate preserves page and locale');
    }
    assert.equal(
      dom.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      canonical,
    );
    assert(
      dom.querySelector('meta[name="description"]')?.content.trim(),
      `Missing description: ${page}`,
    );
    const imageAlt = locale === 'zh'
      ? 'Tool4Furry 双兽首图形标与字标，深灰色背景'
      : 'Tool4Furry dual-animal symbol and wordmark on a dark graphite background';
    for (const [attribute, values] of Object.entries({
      property: {
        'og:title': dom.title,
        'og:description': dom.querySelector('meta[name="description"]').content,
        'og:url': canonical,
        'og:type': 'website',
        'og:site_name': 'Tool4Furry',
        'og:image': socialImageURL,
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/png',
        'og:image:alt': imageAlt,
        'og:locale': locale === 'zh' ? 'zh_CN' : 'en_US',
        'og:locale:alternate': locale === 'zh' ? 'en_US' : 'zh_CN',
      },
      name: {
        'twitter:card': 'summary_large_image',
        'twitter:image': socialImageURL,
        'twitter:image:alt': imageAlt,
      },
    })) {
      for (const [key, expected] of Object.entries(values)) {
        const tags = dom.querySelectorAll(`meta[${attribute}="${key}"]`);
        assert.equal(tags.length, 1, `Exactly one ${key} in ${page}`);
        assert.equal(tags[0].content, expected, `Correct regional/localized ${key} in ${page}`);
      }
    }
    assert.equal(dom.querySelectorAll('meta[name="twitter:site"], meta[name="twitter:creator"]').length, 0, 'No invented social account');
  } else {
    assert.equal(dom.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').length, 0, 'No social metadata on noindex pages');
  }
  if (page === 'tools/index.html')
    for (const tag of ['header'])
      assert(
        dom.querySelector(`${tag} a[href="${localPath('/tools/')}"]`),
        `Missing full catalog navigation: ${tag}`,
      );
  assertFavicon(dom);
  if (page === '404.html') {
    assertStaticNavigation(dom);
    assert.equal(
      dom.querySelector('meta[name="robots"]')?.content,
      'noindex, nofollow',
    );
    assert.equal(dom.querySelectorAll('link[rel="canonical"]').length, 0);
    assert.equal(
      dom.title,
      '404 · Tool4Furry',
      'Preserve the default title API',
    );
    assert(
      dom.querySelector(`header a[href="${localPath('/tools/')}"]`),
      '404 toolbox navigation must reach the full catalog',
    );
  }
  const stylesheets = [...dom.querySelectorAll('link[rel="stylesheet"]')];
  const appearanceScript = assertAppearanceScript(dom);
  assertNavigationScript(dom);
  assertDocumentScroll(dom);
  const featuredTrigger = dom.querySelector('[data-tool-disclosure] > summary');
  assert.equal(featuredTrigger?.getAttribute('aria-label'), locale === 'zh' ? '精选工具' : 'Featured Tools', `Featured navigation label in ${page}`);
  assert(dom.querySelector(`[data-tool-panel] a[href="${localPath('/tools/')}"]`), 'Featured navigation retains the real full catalog');
  for (const link of dom.querySelectorAll('[data-tool-panel] a')) {
    const href = link.getAttribute('href');
    assert(href?.startsWith(localPath('/tools/')), `Unexpected toolbox navigation in ${page}`);
    assert(allHTMLFiles.includes(`${href.slice(1)}index.html`), `Toolbox links to unavailable tool: ${href}`);
  }
  const language = dom.querySelector('[data-language-link]');
  assert(language, `Missing language entry in ${page}`);
  const controls = language.closest('[data-navigation-controls]');
  assert(controls.querySelector(`a[href="${github}"]`), 'GitHub remains available in desktop navigation');
  const account = controls.querySelector('[data-account-slot]');
  assert.equal(account?.getAttribute('role'), 'img');
  assert(account.getAttribute('aria-label') && !account.matches('a, button, [tabindex]'), 'Account stays a named, non-interactive placeholder');
  assert.equal(account.querySelector('svg')?.getAttribute('width'), '20');
  assert.equal(account.querySelector('svg')?.getAttribute('height'), '20');
  const languageURL = new URL(language.getAttribute('href'), origin);
  assert.equal(languageURL.origin, origin, 'Language navigation stays on the current origin');
  assert.equal(languageURL.pathname, alternatePath(page === '404.html' ? '/tools/' : '/' + page.replace(/index\.html$/, '')));
  assert.equal(languageURL.search + languageURL.hash, '', 'No query or hash crosses regions');
  const informationKind = Object.keys(informationPages).find(kind => page === `${kind}/index.html`);
  if (informationKind) {
    assertStaticNavigation(dom);
    assert.equal(dom.querySelectorAll('[data-site-header]').length, 1);
    assert.equal(dom.querySelectorAll('h1').length, 1, `Unique information H1 in ${page}`);
    const [h1, title] = informationPages[informationKind];
    assert.equal(dom.querySelector('h1').textContent.trim(), h1);
    assert.equal(dom.title, title);
    const article = dom.querySelector(`main#main-content article[data-information-page="${informationKind}"]`);
    assert(article, `Missing static information body in ${page}`);
    assert.deepEqual([...article.querySelector('header').children].map(child => child.tagName), ['H1'], 'Information header contains only its H1, without a subtitle');
    const sections = [...article.querySelectorAll(':scope > section')];
    assert.equal(sections.length, informationKind === 'about' ? 3 : 4, 'Preserve the existing information sections');
    assert(!/Image Converter|开发预览|尚无已发布工具|A toolbox in development|no published tools yet/i.test(article.textContent), 'No version-specific development status in information pages');
    if (informationKind !== 'about') {
      const contact = sections.at(-1).querySelector('a[href="mailto:contact@librecosta.com"]');
      assert.equal(contact?.textContent, locale === 'zh' ? informationKind === 'privacy' ? '隐私问题联系邮箱' : '私密联系邮箱' : informationKind === 'privacy' ? 'Privacy contact email' : 'Private contact email');
      assert(sections.at(-1).textContent.includes('contact@librecosta.com'));
    }
    for (const section of sections)
      assert(section.querySelector('h2')?.textContent.trim() && section.querySelector('p')?.textContent.trim());
    assert(!/TODO|Lorem ipsum|待完善|即将补充/i.test(article.textContent), 'No placeholder information copy');
    assert.equal(languageURL.pathname, alternatePath(`/${informationKind}/`), 'Information language link preserves path');
    if (locale === 'en') assert(!/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(dom)), 'Chinese copy in Global information page');
    for (const link of article.querySelectorAll('a[href^="/"]')) {
      const target = link.getAttribute('href').slice(1) + 'index.html';
      assert(allHTMLFiles.includes(target), `Broken local information link: ${target}`);
    }
  }
  assert.equal(
    dom.documentElement.dataset.colorTheme,
    'neutral',
    `Missing static color theme in ${page}`,
  );
  assert.equal(
    dom.documentElement.dataset.appearance,
    'dark',
    `Missing static appearance in ${page}`,
  );
  assert(
    dom.documentElement.className,
    `Missing root theme classes in ${page}`,
  );
  assert(stylesheets.length > 0, `Missing extracted CSS in ${page}`);
  const linkedCSS = [];
  for (const link of stylesheets) {
    const path = link.getAttribute('href');
    assert(
      path?.startsWith('/_astro/'),
      'CSS must use portable static asset paths',
    );
    const css = await readFile(resolve(root, path.slice(1)), 'utf8');
    linkedCSS.push(css);
    assert(!/@import\b/.test(css), `Unbundled CSS import in ${path}`);
    for (const [, , asset] of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      // Vite embeds a few tiny Unicode subsets in the locally served CSS.
      if (asset.startsWith('data:font/woff2;base64,')) {
        const bytes = Buffer.from(
          asset.slice('data:font/woff2;base64,'.length),
          'base64',
        );
        assert.equal(
          bytes.toString('ascii', 0, 4),
          'wOF2',
          'Invalid embedded WOFF2',
        );
        inlineFonts.add(asset);
        continue;
      }
      const url = new URL(asset, `https://static.invalid${path}`);
      assert(
        url.origin === 'https://static.invalid' &&
          (url.pathname.startsWith('/_astro/') || (url.pathname === symbol && !url.search && !url.hash)),
        `Non-local CSS asset: ${asset.slice(0, 100)}`,
      );
      const bytes = await readFile(resolve(root, url.pathname.slice(1)));
      assert(bytes.length > 0, `Empty CSS asset: ${asset}`);
      if (url.pathname.endsWith('.woff2')) {
        assert.equal(
          bytes.toString('ascii', 0, 4),
          'wOF2',
          `Invalid WOFF2: ${asset}`,
        );
        fontAssets.add(url.pathname);
      }
    }
  }
  const css = linkedCSS.join('\n');
  assert(css.includes(symbol), `Missing extracted brand mask in ${page}`);
  for (const appearance of ['dark', 'light'])
    for (const className of appearanceScript.dataset[appearance].split(' '))
      assert(css.includes(`.${className}`), `Missing extracted ${appearance} theme in ${page}`);
  assert(
    /color-scheme:\s*var\(--/.test(css),
    `Appearance must control native color-scheme in ${page}`,
  );
  assert(
    css.includes('@layer priority') && css.includes('--'),
    'Linked CSS must include extracted StyleX styles and tokens',
  );
  for (const family of ['DM Sans Variable', 'Noto Sans SC Variable'])
    assert(css.includes(family), `Missing self-hosted font: ${family}`);
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  assert(faces.length > 0, 'Missing bundled font faces');
  for (const face of faces) {
    assert(
      /font-style:\s*normal/.test(face) && /font-display:\s*swap/.test(face),
      'Only normal swap fonts are expected',
    );
    assert(
      /font-weight:\s*100 (900|1000)/.test(face) &&
        /unicode-range:/i.test(face),
      'Variable weight and Unicode subsets must be preserved',
    );
  }
  assert.equal(
    dom.querySelectorAll('link[rel="preload"][as="font"]').length,
    0,
    'Do not preload all font subsets',
  );
}
assert(fontAssets.size > 0, 'Missing self-hosted WOFF2 assets');
for (const font of ['dm-sans', 'noto-sans-sc']) {
  assert.equal(
    (
      await readFile(resolve(root, 'licenses', `${font}-OFL.txt`), 'utf8')
    ).replaceAll('\r\n', '\n'),
    (
      await readFile(
        resolve('node_modules/@fontsource-variable', font, 'LICENSE'),
        'utf8',
      )
    ).replaceAll('\r\n', '\n'),
    `Font license must accompany the static assets: ${font}`,
  );
}
for (const file of files.filter((file) => file.endsWith('.js'))) {
  const js = await readFile(resolve(root, file), 'utf8');
  assert(
    !js.includes('ownership diagnostics'),
    `DEV diagnostics leaked: ${file}`,
  );
  if (!files.includes('tools/image-converter/index.html'))
    assert(
      !/data-image-converter|Checking the new image|正在检查新图片/.test(js),
      `Draft converter implementation leaked: ${file}`,
    );
  assert(
    !js.includes('STATIC_GUIDE_ONLY_'),
    'Astro-only long content leaked into client JS',
  );
  if (!fixtureMode)
    assert(
      !/data-fixture-counter|publicationFixtures|image\/x-tool4furry-unsupported/.test(
        js,
      ),
      `Test implementation leaked: ${file}`,
    );
  assert(
    !/data-ui-lab|data-files-lab|data-hero-stage|simulateText|advanceTasks|canvasAction|DEV ONLY/.test(
      js,
    ),
    `Demo implementation leaked: ${file}`,
  );
  assert(
    toolPages.length > 0 || !js.includes('data-workbench'),
    `Unused workbench leaked without published tools: ${file}`,
  );
}
assert((await stat(root)).isDirectory());
console.log(
  `Verified ${region}/${locale}: ${htmlFiles.length} static pages, exact static/homepage/catalog script contracts, SEO/OG/favicon, ${cards.length} real homepage cards, extracted dark/light StyleX CSS, ${fontAssets.size} local WOFF2 assets + ${inlineFonts.size} embedded subsets, correct locale/canonical, no Lab routes or demo implementation.`,
);

}

// Discovery is verified against the actual indexable HTML, not another manifest.
const siteOrigin = region === 'cn' ? 'https://tool4furry.cn' : 'https://tool4furry.com';
const indexed = new Map();
for (const page of allHTMLFiles) {
  const dom = new JSDOM(await readFile(resolve(root, page), 'utf8')).window.document;
  if (dom.querySelector('meta[name="robots"]')?.content.includes('noindex')) continue;
  indexed.set(dom.querySelector('link[rel="canonical"]').href, [...dom.querySelectorAll('link[rel="alternate"][hreflang]')]
    .map(link => `${link.hreflang} ${link.href}`).sort());
}
for (const path of ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', '.well-known/security.txt', 'llms.txt'])
  assert(files.includes(path) && (await stat(resolve(root, path))).size > 0, `Missing static discovery file: ${path}`);
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
assert.equal(robots, `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap-index.xml\n`);
const index = new JSDOM(await readFile(resolve(root, 'sitemap-index.xml'), 'utf8'), { contentType: 'application/xml' }).window.document;
assert.equal(index.documentElement.localName, 'sitemapindex');
assert.equal(index.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
assert.deepEqual([...index.querySelectorAll('sitemap > loc')].map(node => node.textContent), [`${siteOrigin}/sitemap-0.xml`]);
const sitemap = new JSDOM(await readFile(resolve(root, 'sitemap-0.xml'), 'utf8'), { contentType: 'application/xml' }).window.document;
assert.equal(sitemap.documentElement.localName, 'urlset');
assert.equal(sitemap.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
const urls = [...sitemap.querySelectorAll('url')];
assert.equal(urls.length, indexed.size, 'Sitemap has no duplicates or omitted public pages');
assert.deepEqual(new Set(urls.map(node => node.querySelector('loc').textContent)), new Set(indexed.keys()));
assert.equal(sitemap.querySelector('lastmod'), null, 'No fabricated modification timestamps');
assert.equal(index.querySelector('lastmod'), null);
for (const entry of urls) {
  const url = entry.querySelector('loc').textContent;
  assert.equal(new URL(url).origin, siteOrigin);
  assert.equal(entry.querySelectorAll('loc').length, 1);
  const alternates = [...entry.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')];
  assert(alternates.every(link => link.getAttribute('rel') === 'alternate'));
  assert.deepEqual(alternates.map(link => `${link.getAttribute('hreflang')} ${link.getAttribute('href')}`).sort(), indexed.get(url), 'Sitemap alternates equal the rendered page alternates');
}
const security = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(resolve(root, '.well-known/security.txt')));
assert(security.endsWith('\n') && !security.includes('\r'), 'UTF-8 security.txt has complete LF-delimited lines');
const fields = security.trimEnd().split('\n').map(line => line.split(/: (.*)/s).slice(0, 2));
assert.deepEqual(fields.map(([name]) => name), ['Contact', 'Expires', 'Preferred-Languages', 'Canonical'], 'Only the real security contact fields, without duplicates');
const securityFields = Object.fromEntries(fields);
assert.equal(securityFields.Contact, 'mailto:contact@librecosta.com');
assert.equal(securityFields['Preferred-Languages'], 'zh, en');
assert.equal(securityFields.Canonical, `${siteOrigin}/.well-known/security.txt`);
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(securityFields.Expires), 'RFC 3339 UTC expiry');
const remaining = Date.parse(securityFields.Expires) - Date.now();
assert(remaining > 0 && remaining <= 181 * 86400000, 'Security contact must be refreshed before its approximately 180-day expiry');
const llms = await readFile(resolve(root, 'llms.txt'), 'utf8');
assert(llms.startsWith('# Tool4Furry\n') && llms.includes('## 简体中文') && llms.includes('## English'));
const contentLinks = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
assert.equal(contentLinks.length, indexed.size, 'No duplicate or missing content index links');
assert.deepEqual(new Set(contentLinks), new Set(indexed.keys()), 'llms.txt only links real regional indexable pages');
console.log(`Verified ${region} discovery: ${indexed.size} local HTML URLs, reciprocal hreflang, robots/Sitemap, RFC 9116 expiry/contact and llms.txt.`);
