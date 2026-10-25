// Production-shaped test assembly only. Does not promote the on-disk draft.
import assert from 'node:assert/strict';
import { build } from 'astro';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

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
const before = await Promise.all(
  [definition, loaders].map((path) => readFile(path, 'utf8')),
);
// The real config must see publication too: change only status in an isolated
// source copy, not the loader or any compiler flag. Never mutate the workspace.
const fixtureParent = resolve('../.validation/converter-v04b');
await mkdir(fixtureParent, { recursive: true });
const project = await mkdtemp(resolve(fixtureParent, 'project-'));
for (const path of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json'])
  await cp(resolve(path), resolve(project, path), { recursive: true });
await symlink(resolve('node_modules'), resolve(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
assert(/status:\s*'draft'/.test(before[0]));
await writeFile(resolve(project, 'src/tools/image-converter/definition.ts'),
  before[0].replace(/status:\s*'draft'/, "status: 'published'"));
await build({
  root: pathToFileURL(project + '/'),
  outDir: resolve(root, output),
});
assert.deepEqual(
  await Promise.all(
    [definition, loaders].map((path) => readFile(path, 'utf8')),
  ),
  before,
);
const outDir = resolve(root, output);
const files = (await readdir(outDir, { recursive: true })).map(normalize);
assert(files.includes('tools/image-converter/index.html'));
const html = await readFile(resolve(outDir, 'tools/image-converter/index.html'), 'utf8');
const runtime = /component-url="([^"]*ToolRuntime[^"]*)"/.exec(html)?.[1];
assert(runtime, 'Published tool needs the real fixed runtime island');
assert(files.some(file => /ImageConverter.*\.js$/.test(file)), 'Changing status alone must emit the real implementation');
for (const file of files.filter((file) => file.endsWith('.js'))) {
  const js = await readFile(resolve(outDir, file), 'utf8');
  assert(
    !js.includes('PNG 转 JPEG 后透明背景去哪了？') &&
      !js.includes('What happens to transparency when converting PNG to JPEG?'),
    'Long Astro FAQ leaked into JS',
  );
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
  `Converter SSG assembly passed: ${outDir}; on-disk draft unchanged.`,
);
process.exit(0);
