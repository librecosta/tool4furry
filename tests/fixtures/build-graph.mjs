// Opt-in artifact evidence only. Imported by the COPIED Astro config, never the
// real config or client. Uses Vite's existing Rollup-compatible output hooks.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, posix, resolve } from 'node:path';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

export function buildGraphProbe(directory, kind) {
  let root;
  return {
    name: `fixture-graph-${kind}`, apply: 'build', enforce: 'post',
    applyToEnvironment: environment => environment.name === 'client',
    configResolved(config) { root = config.root.replaceAll('\\', '/') + '/'; },
    generateBundle: { order: 'post', async handler(_, bundle) {
      if (kind === 'client' && this.environment.config.isWorker) return;
      const id = value => value?.replaceAll('\\', '/').replace(root, '') ?? null;
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(chunk => ({
        file: chunk.fileName, entry: chunk.isEntry, dynamicEntry: chunk.isDynamicEntry,
        facade: id(chunk.facadeModuleId), imports: chunk.imports, dynamicImports: chunk.dynamicImports,
        css: [...(chunk.viteMetadata?.importedCss ?? [])], assets: [...(chunk.viteMetadata?.importedAssets ?? [])],
        modules: Object.keys(chunk.modules).map(moduleId => {
          const info = this.getModuleInfo(moduleId);
          return { id: id(moduleId), imports: (info?.importedIds ?? []).map(id), dynamicImports: (info?.dynamicallyImportedIds ?? []).map(id) };
        }),
      }));
      const assets = Object.values(bundle).filter(item => item.type === 'asset').map(asset => ({
        file: asset.fileName, sources: (asset.originalFileNames ?? []).map(id),
      }));
      await mkdir(directory, { recursive: true });
      const name = kind === 'client' ? 'client' : `worker-${chunks.find(chunk => chunk.entry)?.file.replace(/[^\w-]/g, '_')}`;
      await writeFile(resolve(directory, name + '.json'), JSON.stringify({ kind, chunks, assets }, null, 2));
    } },
  };
}

function loaderBindings(source) {
  const file = ts.createSourceFile('loaders.ts', source, ts.ScriptTarget.Latest, true);
  const bindings = {};
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'toolLoaders') {
      assert(ts.isObjectLiteralExpression(node.initializer), 'G2 explicit Loader required');
      for (const entry of node.initializer.properties) {
        const value = entry.initializer;
        if (ts.isConditionalExpression(value)) {
          const specifier = value.whenTrue.body.arguments[0].text;
          const path = posix.normalize(posix.join('src/tools', specifier));
          bindings[entry.name.text] = posix.extname(path) ? path : path + '.tsx';
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return bindings;
}

export function verifyBuildGraph({ client, workers, loaderSource, expectedEntries, available, resources, text }) {
  const chunks = new Map(client.chunks.map(chunk => [chunk.file, chunk]));
  const base = id => id?.split('?')[0];
  const contains = (chunk, id) => chunk.modules.some(module => base(module.id) === id);
  const owner = id => client.chunks.find(chunk => contains(chunk, id));
  const closure = (start, dynamic = false) => {
    const seen = new Set(), pending = [start];
    while (pending.length) {
      const file = pending.pop();
      if (seen.has(file)) continue;
      const chunk = chunks.get(file);
      assert(chunk, `G2 missing emitted chunk: ${file}`);
      seen.add(file);
      pending.push(...chunk.imports, ...(dynamic ? chunk.dynamicImports : []));
    }
    return [...seen].map(file => chunks.get(file));
  };
  const runtime = owner('src/tools/ToolRuntime.tsx');
  assert(runtime, 'G2 fixed ToolRuntime module missing');
  const eager = closure(runtime.file);
  const loader = client.chunks.flatMap(chunk => chunk.modules).find(module => base(module.id) === 'src/tools/loaders.ts');
  assert(loader, 'G2 explicit Loader module missing');
  const bindings = loaderBindings(loaderSource), ownership = {};
  for (const [id, entry] of Object.entries(expectedEntries)) {
    if (!available.includes(id)) {
      assert(!owner(entry), `G2 excluded implementation: ${id}`);
      continue;
    }
    assert(!eager.some(chunk => contains(chunk, entry)), `G2 runtime eagerly imports tool: ${id}`);
    const actual = bindings[id], implementation = owner(actual);
    assert(implementation && loader.dynamicImports.some(target => base(target) === actual), `G2 missing Loader dynamic edge: ${id}`);
    assert.equal(actual, entry, `G2 loader binding: ${id}`);
    assert.equal(base(implementation.facade), entry, `G2 implementation facade: ${id}`);
    assert(implementation.dynamicEntry && eager.some(chunk => chunk.dynamicImports.includes(implementation.file)), `G2 missing emitted dynamic import: ${id}`);
    ownership[id] = { entry, chunk: implementation.file, css: closure(implementation.file).flatMap(chunk => chunk.css) };
  }
  // Follow ALL dependencies of the actual static-page module scripts, including
  // lazy enhancements. HTML-only absence of an island is insufficient evidence.
  const staticRoots = new Set();
  for (const [file, html] of Object.entries(text)) {
    if (!file.endsWith('.html')) continue;
    const dom = new JSDOM(html).window.document;
    if (dom.querySelector('main[data-tool-id]')) continue;
    assert.equal(dom.querySelectorAll('astro-island').length, 0, `G4 static island: ${file}`);
    for (const script of dom.querySelectorAll('script[src]')) staticRoots.add(script.getAttribute('src').replace(/^\//, ''));
  }
  for (const start of staticRoots) {
    const reached = closure(start, true);
    assert(!reached.some(chunk => contains(chunk, 'src/tools/ToolRuntime.tsx') ||
      Object.values(expectedEntries).some(entry => contains(chunk, entry))), `G4 static page loads tool runtime/implementation: ${start}`);
  }
  for (const [id, asset] of Object.entries(resources)) {
    const directory = 'tests/fixtures/build-resources/';
    const graph = workers.find(graph => graph.chunks.some(chunk => chunk.modules.some(module => base(module.id) === `${directory}${asset}.worker.ts`)));
    if (!available.includes(id)) {
      assert(!graph, `G2 excluded Worker: ${id}`);
      const privateSources = new Set(['tsx', 'css', 'worker.ts', 'wasm'].map(extension => `${directory}${asset}.${extension}`));
      const includedSources = [client, ...workers].flatMap(graph => [
        ...graph.chunks.flatMap(chunk => chunk.modules.map(module => base(module.id))),
        ...graph.assets.flatMap(item => item.sources.map(base)),
      ]);
      assert(!includedSources.some(source => privateSources.has(source)), `G2 excluded private dependency: ${id}`);
      continue;
    }
    assert(graph, `G2 Worker graph missing: ${id}`);
    const worker = graph.chunks.find(chunk => chunk.entry);
    const wasm = graph.assets.find(item => item.sources.some(source => base(source) === `${directory}${asset}.wasm`));
    assert(wasm && text[worker.file]?.includes(basename(wasm.file)), `G2 Worker/WASM edge: ${id}`);
    const own = closure(ownership[id].chunk);
    // new Worker(new URL()) is a separate Vite build, not a JS chunk import.
    // Join the captured Worker graph to its real generated URL, not a package name.
    assert(own.some(chunk => text[chunk.file]?.includes(basename(worker.file))), `G2 tool/Worker URL edge: ${id}`);
    assert(ownership[id].css.some(file => text[file]?.includes(`--e2b-${asset}-private`)), `G2 private CSS ownership: ${id}`);
    ownership[id].worker = worker.file;
    ownership[id].wasm = wasm.file;
  }
  const shared = client.chunks.filter(chunk => contains(chunk, 'tests/fixtures/build-resources/shared.tsx'));
  assert.equal(shared.length, Object.keys(resources).some(id => available.includes(id)) ? 1 : 0, 'G2 shared module ownership');
  return { ownership, staticRoots: [...staticRoots], runtime: runtime.file, shared: shared.map(chunk => chunk.file) };
}
