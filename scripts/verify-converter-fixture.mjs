// Production-shaped test assembly only. Does not promote the on-disk draft.
import assert from 'node:assert/strict';
import { build } from 'astro';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const region = process.argv[2] ?? 'cn';
assert(['cn', 'global'].includes(region));
process.env.SITE_REGION = region;
process.env.NODE_ENV = 'production';
const root = process.cwd();
const output = `../.validation/converter-v04b/ssg/${region}`;
const normalize = (path) => path.replaceAll('\\', '/');
const definition = normalize(
  resolve('src/tools/image-converter/definition.ts'),
);
const loaders = normalize(resolve('src/tools/loaders.ts'));
const registry = normalize(resolve('src/tools/registry.ts'));
const before = await Promise.all(
  [definition, loaders, registry].map((path) => readFile(path, 'utf8')),
);
// Simulate the future CN-only release through real metadata in an isolated copy.
// Run cn for the positive case, global for the same definition's exclusion case.
// No loader/compiler publication override, and never mutate the workspace.
const fixtureParent = resolve('../.validation/converter-v04b');
await mkdir(fixtureParent, { recursive: true });
const project = await mkdtemp(resolve(fixtureParent, 'project-'));
for (const path of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json'])
  await cp(resolve(path), resolve(project, path), { recursive: true });
await symlink(resolve('node_modules'), resolve(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
assert(/status:\s*'draft'/.test(before[0]));
assert(/regions:\s*\['cn', 'global'\]/.test(before[0]), 'Real regional availability must remain unchanged');
await writeFile(resolve(project, 'src/tools/image-converter/definition.ts'),
  before[0].replace(/status:\s*'draft'/, "status: 'published'")
    .replace(/regions:\s*\['cn', 'global'\]/, "regions: ['cn']"));
await build({
  root: pathToFileURL(project + '/'),
  outDir: resolve(root, output),
});
assert.deepEqual(
  await Promise.all(
    [definition, loaders, registry].map((path) => readFile(path, 'utf8')),
  ),
  before,
);
const outDir = resolve(root, output);
const files = (await readdir(outDir, { recursive: true })).map(normalize);
// Evaluate only the standalone Astro editorial data (its type-only import is erased).
const editorialSource = await readFile('src/site/image-converter-content.ts', 'utf8');
const editorialJS = ts.transpileModule(editorialSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { imageConverterContent } = await import('data:text/javascript;base64,' + Buffer.from(editorialJS).toString('base64'));
const plain = text => text.replaceAll('**', '').replace(/\s+/g, ' ').trim();
for (const locale of ['zh', 'en']) {
  const page = `${locale === 'zh' ? '' : 'en/'}tools/image-converter/index.html`;
  if (region === 'global') {
    assert(!files.some(file => file.includes('tools/image-converter/')), 'CN-only release cannot create Global routes');
    break;
  }
  assert(files.includes(page));
  const dom = new JSDOM(await readFile(resolve(outDir, page), 'utf8')).window.document;
  const expected = imageConverterContent[locale];
  assert.equal(dom.title, expected.title);
  assert.equal(dom.querySelector('meta[name="description"]')?.content, expected.description);
  assert.deepEqual([...dom.querySelectorAll('h1')].map(node => node.textContent), [expected.h1]);
  assert.equal(dom.querySelector('[data-tool-intro] p')?.textContent, expected.intro);
  const guide = dom.querySelector('[data-tool-guide]');
  assert(guide && !guide.closest('astro-island'), 'The full guide is static Astro HTML outside hydration');
  for (const [key, selector] of [['steps', '#tool-steps + ol > li'], ['limitations', '#tool-limitations + ul > li']]) {
    assert.equal(expected[key].length, 4);
    assert.deepEqual([...guide.querySelectorAll(selector)].map(node => plain(node.textContent)), expected[key].map(plain));
    assert.deepEqual([...guide.querySelectorAll(`${selector} strong`)].map(node => node.textContent),
      expected[key].flatMap(text => [...text.matchAll(/\*\*([^*]+)\*\*/g)].map(match => match[1])), 'Limited Markdown emphasis stays semantic HTML');
  }
  assert.equal(expected.faq.length, 6);
  const faq = [...guide.querySelectorAll('[aria-labelledby="tool-faq"] > details')];
  assert.equal(faq.length, 6);
  for (const [index, item] of faq.entries()) {
    assert.equal(item.firstElementChild.tagName, 'SUMMARY', 'Native FAQ summary is the first child');
    assert.equal(item.querySelector('summary span')?.textContent, expected.faq[index].question);
    assert.equal(item.querySelector('summary svg')?.getAttribute('aria-hidden'), 'true');
    assert.equal(item.querySelector('p')?.textContent, expected.faq[index].answer);
  }
  assert(dom.querySelector('astro-island[component-url*="ToolRuntime"]'), 'Published tool has the real fixed runtime');
  for (const discovery of ['index.html', 'tools/index.html']) {
    const doc = new JSDOM(await readFile(resolve(outDir, `${locale === 'zh' ? '' : 'en/'}${discovery}`), 'utf8')).window.document;
    assert(doc.querySelector(`a[href="/${locale === 'zh' ? '' : 'en/'}tools/image-converter/"]`), 'CN release is discoverable from home and catalog');
  }
}
assert.equal(files.some(file => /ImageConverter.*\.js$/.test(file)), region === 'cn', 'Regional metadata alone controls the implementation');
const longCopy = Object.values(imageConverterContent).flatMap(content => [
  ...content.steps, ...content.limitations, ...content.faq.flatMap(item => [item.question, item.answer]),
]);
for (const file of files.filter((file) => file.endsWith('.js'))) {
  const js = await readFile(resolve(outDir, file), 'utf8');
  assert(!longCopy.some(text => js.includes(plain(text))), `Long Astro guide leaked into JS: ${file}`);
}
if (region === 'global') {
  for (const file of files.filter(file => file.endsWith('.html'))) {
    const dom = new JSDOM(await readFile(resolve(outDir, file), 'utf8')).window.document;
    assert(!dom.querySelector('a[href*="/tools/image-converter/"]'), 'CN-only tool cannot be a Global discovery link');
  }
}
const check = spawnSync(
  process.execPath,
  ['scripts/verify-build.mjs', region, outDir],
  { stdio: 'inherit' },
);
assert.equal(check.status, 0, 'Converter static contract failed');
await writeFile(
  resolve(outDir, 'FIXTURE-ONLY.txt'),
  'Isolated test assembly. Draft release gates have NOT passed. Never deploy.\n',
);
console.log(
  `CN-only Converter SSG ${region === 'cn' ? 'publication' : 'exclusion'} passed: ${outDir}; on-disk draft/regions/loaders/registry unchanged.`,
);
process.exit(0);
