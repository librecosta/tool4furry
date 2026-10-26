import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const appearanceSource = (await readFile('src/styles/appearance-controller.js', 'utf8')).replace(/\r\n?/g, '\n');
const navigationSource = (await readFile('src/styles/navigation-disclosure.js', 'utf8')).replace(/\r\n?/g, '\n');
const scrollMetrics = (await readFile('src/ui/scroll-metrics.js', 'utf8')).replace(/\r\n?/g, '\n');
const scrollSource = (await readFile('src/styles/document-scroll.js', 'utf8')).replace(/\r\n?/g, '\n');
const documentScrollSource = `(() => {\n${scrollMetrics.replace('export function ', 'function ')}\n${scrollSource}\n})();`;
function assertDocumentScroll(dom, enabled = !dom.querySelector('[data-workbench="canvas"]')) {
  const scripts = dom.querySelectorAll('script#t4f-document-scroll');
  const docks = dom.querySelectorAll('[data-document-dock]');
  if (!enabled) {
    assert.equal(scripts.length, 0, 'Canvas never receives the document dock script');
    assert.equal(docks.length, 0, 'Canvas never receives a document dock');
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
  assert.deepEqual(JSON.parse(script.dataset.languageOrigins), ['https://tool4furry.cn', 'https://tool4furry.com']);
  assert(script.dataset.dark && script.dataset.light && script.dataset.dark !== script.dataset.light);
  return script;
}
function assertStaticNavigation(dom) {
  assertAppearanceScript(dom);
  assertNavigationScript(dom);
  assertDocumentScroll(dom);
  assert.equal(dom.querySelectorAll('astro-island').length, 0);
  assert.equal(dom.querySelectorAll('script').length, 3, 'Only the audited inline appearance, navigation and document-scroll scripts are permitted');
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
const htmlFiles = files.filter((file) => file.endsWith('.html'));
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
    /LabRuntime|WorkbenchLab|LabMenu|CanvasDemo|FormDemo|BatchDemo|UILab|FilesLab/.test(
      file,
    ),
  ),
  'Lab entry assets leaked into production',
);
assert(htmlFiles.includes('404.html'), 'Missing static 404');
const informationPages = {
  about: region === 'cn' ? ['关于 Tool4Furry', '关于 Tool4Furry'] : ['About Tool4Furry', 'About Tool4Furry'],
  privacy: region === 'cn' ? ['隐私说明', '隐私说明 · Tool4Furry'] : ['Privacy', 'Privacy · Tool4Furry'],
  terms: region === 'cn' ? ['使用条款', '使用条款 · Tool4Furry'] : ['Terms', 'Terms · Tool4Furry'],
};
for (const kind of Object.keys(informationPages))
  assert(htmlFiles.includes(`${kind}/index.html`), `Missing static information page: ${kind}`);
const home = await readFile(resolve(root, 'index.html'), 'utf8');
const document = new JSDOM(home).window.document;
const site =
  region === 'cn' ? 'https://tool4furry.cn/' : 'https://tool4furry.com/';
assert.equal(document.documentElement.lang, region === 'cn' ? 'zh-CN' : 'en');
assert.equal(
  document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  site,
);
const expectedTitle =
  region === 'cn'
    ? 'Tool4Furry — Furry 创作者的浏览器工具箱'
    : 'Tool4Furry — Browser Tools for Furry Creators';
const expectedDescription =
  region === 'cn'
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
assert.equal(
  document.querySelectorAll('meta[property="og:image"]').length,
  0,
  'No invented share image',
);
assert.equal(document.querySelectorAll('h1').length, 1);
assert.equal(
  document.querySelector('h1')?.textContent.trim().replace(/\s+/g, ' '),
  region === 'cn'
    ? '灵感尽情发挥。繁琐留给工具。'
    : 'More room for imagination. Less time on the tedious bits.',
);
assert(document.querySelector('main#main-content'), 'Missing skip-link target');
assert.equal(
  document.querySelector('a[href="#main-content"]')?.textContent.trim(),
  region === 'cn' ? '跳到主要内容' : 'Skip to content',
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
const mark = '/brand/tool4furry-mark.svg';
for (const tag of ['header', 'footer']) {
  const shell = document.querySelector(tag);
  assert(
    shell?.querySelector('a[href="/tools/"]'),
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
  const brand = shell.querySelector('a[href="/"]');
  assert.equal(brand?.getAttribute('aria-label'), 'Tool4Furry');
  assert.equal(brand.querySelector('span')?.textContent.trim(), 'Tool4Furry');
  assert.equal(brand.querySelector('img')?.getAttribute('src'), mark);
  assert.equal(brand.querySelector('img')?.getAttribute('alt'), '');
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
assert.equal(
  document
    .querySelector('link[rel="icon"][type="image/svg+xml"]')
    ?.getAttribute('href'),
  mark,
);
for (const path of [mark, '/brand/creative-fragments.svg']) {
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
}
for (const image of document.querySelectorAll('img')) {
  const src = image.getAttribute('src');
  assert(
    image.closest('[data-site-compliance]')
      ? src?.startsWith('/') && !src.startsWith('//')
      : src?.startsWith('/brand/'),
    'Homepage images must be local brand assets or approved local compliance icons',
  );
  assert.equal(
    image.getAttribute('alt'),
    '',
    'Decorative art must have empty alt',
  );
  assert(
    image.hasAttribute('width') && image.hasAttribute('height'),
    'Reserve image geometry',
  );
}
assertStaticNavigation(document);
assert(!home.includes('/lab/'), 'Lab navigation leaked into homepage');
assert.equal(
  document.querySelectorAll('link[rel="modulepreload"], link[as="script"]')
    .length,
  0,
  'Homepage must not preload JavaScript',
);
if (region === 'global')
  assert(
    !/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(document)),
    'Chinese copy in global homepage',
  );
const fullHTML = await readFile(resolve(root, 'tools/index.html'), 'utf8');
const fullCatalog = new JSDOM(fullHTML).window.document;
assert.equal(
  fullCatalog.title,
  region === 'cn' ? '工具箱 — Tool4Furry' : 'Toolbox — Tool4Furry',
);
assert.equal(fullCatalog.querySelectorAll('h1').length, 1);
assert.equal(
  fullCatalog.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  `${site}tools/`,
);
assertStaticNavigation(fullCatalog);
assert(!fullHTML.includes('/lab/'), 'Lab links leaked into full catalog');
if (region === 'global')
  assert(
    !/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(fullCatalog)),
    'Chinese copy in global catalog',
  );
const cards = [...catalog.querySelectorAll('ul > li > a[data-tool-card]')];
const allCards = [
  ...fullCatalog.querySelectorAll('ul > li > a[data-tool-card]'),
];
const toolLinks = new Set(allCards.map((card) => card.getAttribute('href')));
const toolPages = htmlFiles.filter((file) =>
  /^tools\/[^/]+\/index\.html$/.test(file),
);
assert(cards.length <= 9, 'Homepage must curate at most nine tools');
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
        region === 'cn' ? '工具正在准备中' : 'Tools are on the way',
      ),
      'Wrong empty state copy',
    );
    assert.equal(
      dom.querySelectorAll(
        '[id^="domain-"], [id^="audience-"], [id^="context-"], input[type="search"]',
      ).length,
      0,
      'No empty discovery trees or search',
    );
  }
  for (const card of list) {
    const href = card.getAttribute('href');
    assert(
      /^\/tools\/[a-z0-9-]+\/$/.test(href),
      `Invalid real tool route: ${href}`,
    );
    assert(
      htmlFiles.includes(`${href.slice(1)}index.html`),
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
assert.equal(
  document.querySelectorAll('a[href="#tools"]').length,
  allCards.length ? 1 : 0,
  'Only published tools enable the hero CTA',
);
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
    toolLinks.has('/' + page.replace(/index\.html$/, '')),
    `Unlisted tool page: ${page}`,
  );
for (const link of fullCatalog.querySelectorAll('a[href^="/tools/"]')) {
  const href = link.getAttribute('href');
  assert(
    href === '/tools/' || toolLinks.has(href),
    `Invalid discovery link: ${href}`,
  );
}
const fontAssets = new Set();
const inlineFonts = new Set();
for (const page of htmlFiles) {
  const content = await readFile(resolve(root, page), 'utf8');
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
  const footers = dom.querySelectorAll('[data-site-footer]');
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
  assert.deepEqual([...groups].map(el => el.querySelector('p').textContent.trim()), region === 'cn' ? ['工具', '项目', '支持'] : ['Tools', 'Project', 'Support']);
  assert.deepEqual([...groups].map(el => [...el.querySelectorAll('a')].map(a => a.getAttribute('href'))), [
    ['/#tools', '/tools/'], ['/about/', github], [`${github}/issues`],
  ]);
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
  assert.deepEqual([...legal.querySelectorAll('nav a')].map(a => a.getAttribute('href')), ['/privacy/', '/terms/', `${github}/blob/master/LICENSE`]);
  assert(legal.textContent.replace(/\s+/g, ' ').includes(`© ${new Date().getFullYear()} Tool4Furry · LibreCosta`));
  const attribution = legal.querySelector('[data-footer-attribution]');
  assert.equal(attribution?.textContent, 'LibreCosta');
  assert.equal(attribution?.getAttribute('href'), 'https://librecosta.com');
  assert.equal(attribution?.getAttribute('target'), '_blank');
  assert.equal(attribution?.getAttribute('rel'), 'noopener noreferrer');
  assert(footer.querySelector(`a[href="${github}/blob/master/LICENSE"]`));
  for (const kind of Object.keys(informationPages))
    assert(footer.querySelector(`a[href="/${kind}/"]`), `Missing Footer information link: ${kind} in ${page}`);
  assert(!/TEST_ONLY_|测试ICP备|测试公网安备|待备案/.test(footer.textContent), 'Test/placeholder compliance leaked');
  for (const entry of footer.querySelectorAll('[data-site-compliance] a')) {
    assert.equal(entry.closest('[data-footer-compliance-slot]'), slot, 'Approved records stay in the bottom compliance slot');
    assert(entry.textContent.trim(), 'Empty compliance label');
    assert(new URL(entry.href).protocol === 'https:', 'Compliance queries must use HTTPS');
  }
  if (toolPages.includes(page)) {
    if (page === 'tools/image-converter/index.html')
      assert(!/开发保护值|全设备兼容承诺|development (?:resource )?guardrails/i.test(dom.body.textContent),
        'Converter public copy must describe current limits, not internal guardrails');
    assert.equal(dom.querySelectorAll('[data-site-header]').length, 0, 'Tool page must keep its independent navigation');
    const main = dom.querySelector('main[data-tool-id]');
    const href = '/' + page.replace(/index\.html$/, '');
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
      dom.querySelectorAll('meta[name="robots"], link[hreflang]').length,
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
  assert.equal(dom.documentElement.lang, region === 'cn' ? 'zh-CN' : 'en');
  if (page !== '404.html') {
    const canonical = site + page.replace(/index\.html$/, '');
    assert.equal(
      dom.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      canonical,
    );
    assert(
      dom.querySelector('meta[name="description"]')?.content.trim(),
      `Missing description: ${page}`,
    );
    assert.equal(
      dom.querySelector('meta[property="og:title"]')?.content,
      dom.title,
    );
    assert.equal(
      dom.querySelector('meta[property="og:description"]')?.content,
      dom.querySelector('meta[name="description"]')?.content,
    );
    assert.equal(
      dom.querySelector('meta[property="og:url"]')?.content,
      canonical,
    );
    assert.equal(
      dom.querySelector('meta[property="og:type"]')?.content,
      'website',
    );
  }
  if (page === 'tools/index.html')
    for (const tag of ['header', 'footer'])
      assert(
        dom.querySelector(`${tag} a[href="/tools/"]`),
        `Missing full catalog navigation: ${tag}`,
      );
  assert.equal(
    dom.querySelector('link[rel="icon"]')?.getAttribute('href'),
    mark,
    `Shared favicon missing: ${page}`,
  );
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
      dom.querySelector('header a[href="/tools/"]'),
      '404 toolbox navigation must reach the full catalog',
    );
  }
  const stylesheets = [...dom.querySelectorAll('link[rel="stylesheet"]')];
  const appearanceScript = assertAppearanceScript(dom);
  assertNavigationScript(dom);
  assertDocumentScroll(dom);
  const featuredTrigger = dom.querySelector('[data-tool-disclosure] > summary');
  assert.equal(featuredTrigger?.getAttribute('aria-label'), region === 'cn' ? '精选工具' : 'Featured Tools', `Featured navigation label in ${page}`);
  assert(dom.querySelector('[data-tool-panel] a[href="/tools/"]'), 'Featured navigation retains the real full catalog');
  for (const link of dom.querySelectorAll('[data-tool-panel] a')) {
    const href = link.getAttribute('href');
    assert(href?.startsWith('/tools/'), `Unexpected toolbox navigation in ${page}`);
    assert(htmlFiles.includes(`${href.slice(1)}index.html`), `Toolbox links to unavailable tool: ${href}`);
  }
  const language = dom.querySelector('[data-language-link]');
  assert(language, `Missing language entry in ${page}`);
  const languageURL = new URL(language.getAttribute('href'));
  assert.equal(languageURL.origin, region === 'cn' ? 'https://tool4furry.com' : 'https://tool4furry.cn');
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
    assert(article.querySelector('header > p')?.textContent.trim(), 'Short summary required');
    const sections = [...article.querySelectorAll(':scope > section')];
    assert(sections.length >= 2 && sections.length <= 4, 'Information pages need 2–4 sections');
    for (const section of sections)
      assert(section.querySelector('h2')?.textContent.trim() && section.querySelector('p')?.textContent.trim());
    assert(!/TODO|Lorem ipsum|待完善|即将补充/i.test(article.textContent), 'No placeholder information copy');
    assert.equal(languageURL.pathname, `/${informationKind}/`, 'Information language link preserves path');
    if (region === 'global') assert(!/[\u4e00-\u9fff]/u.test(copyWithoutLanguageLink(dom)), 'Chinese copy in Global information page');
    for (const link of article.querySelectorAll('a[href^="/"]')) {
      const target = link.getAttribute('href').slice(1) + 'index.html';
      assert(htmlFiles.includes(target), `Broken local information link: ${target}`);
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
          url.pathname.startsWith('/_astro/'),
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
    !/data-ui-lab|data-files-lab|simulateText|advanceTasks|canvasAction|DEV ONLY/.test(
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
  `Verified ${region}: ${htmlFiles.length} static pages, audited appearance/navigation/document-scroll scripts only on static pages, SEO/OG/favicon, ${cards.length} real catalog cards, extracted dark/light StyleX CSS, ${fontAssets.size} local WOFF2 assets + ${inlineFonts.size} embedded subsets, correct locale/canonical, no Lab routes or demo implementation.`,
);
