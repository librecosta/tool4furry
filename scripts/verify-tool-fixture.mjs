// Opt-in platform audit. Config and compilation read the SAME isolated Registry.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const region = process.argv[2] ?? 'cn';
assert(['cn', 'global'].includes(region), 'Specify cn or global');
const root = process.cwd();
const validation = resolve(root, '../.validation');
await mkdir(validation, { recursive: true });
const run = await mkdtemp(join(validation, 'multi-tool-'));
const source = join(run, 'source');
await mkdir(source);
for (const directory of ['src', 'public', 'tests', 'scripts'])
  await cp(join(root, directory), join(source, directory), { recursive: true });
for (const file of ['astro.config.mjs', 'tsconfig.json', 'package.json'])
  await cp(join(root, file), join(source, file));
await symlink(join(root, 'node_modules'), join(source, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
const outDir = resolve(source, '../.validation/platform-v04a', region);
const registryPath = 'src/tools/registry.ts';
const contentPath = 'src/site/tool-content.ts';
const loadersPath = 'src/tools/loaders.ts';
const originals = Object.fromEntries(await Promise.all([registryPath, contentPath, loadersPath,
  'astro.config.mjs', 'src/tools/image-converter/definition.ts'].map(async path => [path, await readFile(join(root, path), 'utf8')])));
const normalize = path => path.replaceAll('\\', '/');
const fixtureIds = [...Array.from({ length: 20 }, (_, i) => `fixture-${i + 1}`),
  'image-resizer-fixture', 'character-editor-fixture', 'cn-only-fixture'];
const resources = { 'image-resizer-fixture': 'resizer', 'character-editor-fixture': 'editor', 'cn-only-fixture': 'cn' };
const publicationPath = join(source, 'tests/fixtures/publication.ts');
const originalPublication = await readFile(publicationPath, 'utf8');
const contentFixturePath = join(source, 'tests/fixtures/content.ts');
const originalContent = await readFile(contentFixturePath, 'utf8');
const evidence = [];

async function configure(phase) {
  const expression = phase === 'empty'
    ? "publicationFixtures.map(tool => tool.id === 'cn-only-fixture' ? tool : { ...tool, status: 'draft' as const })"
    : 'publicationFixtures';
  const registry = originals[registryPath].replace(
    /export const tools: readonly ToolDefinition\[\] = [\s\S]*?;\r?\n/,
    `export const tools: readonly ToolDefinition[] = ${expression};\n`,
  );
  assert.notEqual(registry, originals[registryPath], 'Registry seam changed');
  await writeFile(join(source, registryPath), "import { publicationFixtures } from '../../tests/fixtures/publication';\n" + registry);
  const content = originals[contentPath].replace(
    /export const toolPageContents: ToolContentMap = [\s\S]*?;\r?\n/,
    "export const toolPageContents: ToolContentMap = { ...fixtureContents, 'image-converter': imageConverterContent };\n",
  );
  assert.notEqual(content, originals[contentPath], 'Static content seam changed');
  await writeFile(join(source, contentPath), "import { fixtureContents } from '../../tests/fixtures/content';\n" + content);
  // No transform-time Registry replacement. Only copied metadata changes.
  await writeFile(publicationPath, phase === 'promoted'
    ? originalPublication.replace("fixtureTool('image-resizer-fixture', { status: 'draft' })", "fixtureTool('image-resizer-fixture')")
    : originalPublication);
  await writeFile(contentFixturePath, phase === 'missing-content'
    ? originalContent.replace("['zh', 'en']", "['zh']") : originalContent);
  const entries = fixtureIds.filter(id => phase !== 'missing-loader' || id !== 'cn-only-fixture').map(id => {
    const target = resources[id] ? `build-resources/${resources[id]}` : 'FixtureTool';
    return `  '${id}': import.meta.env.DEV || import.meta.env.T4F_TOOL_${id.replaceAll('-', '_').toUpperCase()}_AVAILABLE\n    ? () => import('../../tests/fixtures/${target}') : undefined,`;
  });
  // Explicit literal import branches, exactly like the production Loader.
  const loaders = originals[loadersPath].replace(/\n};\s*$/, `\n${entries.join('\n')}\n};\n`);
  assert.notEqual(loaders, originals[loadersPath], 'Loader seam changed');
  await writeFile(join(source, loadersPath), loaders);
}

async function build(phase, failure) {
  await configure(phase);
  const result = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', outDir], {
    cwd: source, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, SITE_REGION: region, NODE_ENV: 'production' },
  });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  await writeFile(join(run, `${phase}.log`), log);
  if (failure) {
    assert.notEqual(result.status, 0, `Expected ${phase} build to fail`);
    assert(log.includes(failure), `${phase} failed for an unrelated reason; see ${run}`);
    evidence.push({ phase, rejected: failure });
    console.log(`Verified ${phase}: ${failure}`);
    return;
  }
  assert.equal(result.status, 0, `Fixture ${phase} build failed; see ${run}/${phase}.log`);
  const files = (await readdir(outDir, { recursive: true })).map(normalize);
  const text = Object.fromEntries(await Promise.all(files.filter(file => /\.(js|css|html|xml|txt)$/.test(file))
    .map(async file => [file, await readFile(join(outDir, file), 'utf8')])));
  const allText = Object.values(text).join('\n');
  const available = phase === 'empty' ? [] : ['image-converter', ...fixtureIds.filter(id =>
    id.startsWith('fixture-') || id === 'cn-only-fixture' && region === 'cn' ||
    id === 'character-editor-fixture' && region === 'global' || id === 'image-resizer-fixture' && phase === 'promoted')];
  for (const prefix of ['', region === 'cn' ? 'en/' : 'zh/']) {
    assert.deepEqual(files.filter(file => new RegExp(`^${prefix}tools/[^/]+/index\\.html$`).test(file)).sort(),
      available.map(id => `${prefix}tools/${id}/index.html`).sort(), 'Both locales follow the Registry gate');
    for (const id of ['image-converter', ...fixtureIds]) {
      const expected = available.includes(id);
      for (const page of [`${prefix}index.html`, `${prefix}tools/index.html`]) {
        if (page.endsWith('tools/index.html')) assert.equal(text[page].includes(`data-tool-card="${id}"`), expected);
        if (!expected) assert(!text[page].includes(`href="/${prefix}tools/${id}/"`), 'No excluded discovery link');
      }
      assert.equal(text['sitemap-0.xml'].includes(`/${prefix}tools/${id}/`), expected);
      assert.equal(text['llms.txt'].includes(`/${prefix}tools/${id}/`), expected);
    }
  }
  const privateResults = {};
  for (const [id, asset] of Object.entries(resources)) {
    const expected = available.includes(id);
    const wasm = files.filter(file => new RegExp(`/${asset}-[\\w-]+\\.wasm$`).test(file));
    const worker = files.filter(file => new RegExp(`/${asset}\\.worker-[\\w-]+\\.js$`).test(file));
    assert.equal(wasm.length, expected ? 1 : 0, `${id} WASM eligibility`);
    assert.equal(worker.length, expected ? 1 : 0, `${id} Worker eligibility`);
    assert.equal(allText.includes(`${asset}-private`), expected, `${id} private JS/CSS chain eligibility`);
    if (expected) {
      assert(Object.entries(text).some(([file, code]) => file.endsWith('.css') && code.includes(`--e2b-${asset}-private`)));
      const binary = await readFile(join(outDir, wasm[0]));
      assert.deepEqual(binary, await readFile(join(source, `tests/fixtures/build-resources/${asset}.wasm`)));
      const { instance } = await WebAssembly.instantiate(binary);
      assert.equal(instance.exports.answer(), 42);
      assert(text[worker[0]].includes(wasm[0].split('/').at(-1)), 'Worker imports the emitted WASM');
    }
    privateResults[id] = { included: expected, wasm, worker };
  }
  const shared = Object.entries(text).filter(([file, code]) => file.endsWith('.js') && code.includes('e2b-shared-published-v1'));
  assert.equal(shared.length, phase === 'empty' ? 0 : 1, 'One real shared module, no excluded private dependencies');
  const check = spawnSync(process.execPath, ['scripts/verify-build.mjs', region, outDir, '--fixture'], { cwd: source, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  await writeFile(join(run, `${phase}-guard.log`), (check.stdout ?? '') + (check.stderr ?? ''));
  assert.equal(check.status, 0, `Static guards failed; see ${run}/${phase}-guard.log`);
  const snapshot = join(run, phase);
  await cp(outDir, snapshot, { recursive: true });
  await writeFile(join(snapshot, 'FIXTURE-ONLY.txt'), 'Test output only. Never deploy.\n');
  evidence.push({ phase, tools: available, resources: privateResults, sharedChunks: shared.map(([file]) => file), output: snapshot });
  console.log(`Verified ${region}/${phase}: ${available.length} tools; routes, discovery, private JS/CSS/Worker/WASM and static guards.`);
}

try {
  await build('baseline');
  if (region === 'cn') {
    await build('missing-loader', 'cn-only-fixture: missing loader');
    await build('missing-content', 'Missing tool content: fixture-1/cn/en');
  } else {
    await build('promoted');
    // Same output directory: Published -> Draft must remove stale assets.
    await build('empty');
  }
} finally {
  for (const [path, before] of Object.entries(originals))
    assert.equal(await readFile(join(root, path), 'utf8'), before, `Real workspace changed: ${path}`);
}
await writeFile(join(run, 'evidence.json'), JSON.stringify({ region, evidence }, null, 2) + '\n');
console.log(`Multi-tool build audit passed. Evidence and isolated sources: ${run}`);
