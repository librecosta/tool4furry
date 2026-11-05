import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { definition } from '../src/tools/text-cleaner/definition';
import { tools } from '../src/tools/registry';
import { toolBuildDefines } from '../src/tools/build-availability';

const read = (path: string) => readFileSync(path, 'utf8');
it('delivers the editor through Published Text Cleaner while other text tools remain Draft', () => {
  expect(definition.status).toBe('published');
  expect(definition.regions).toEqual(['cn', 'global']);
  for (const region of definition.regions) {
    const availability = toolBuildDefines(tools, region);
    expect(availability['import.meta.env.T4F_TOOL_TEXT_CLEANER_AVAILABLE']).toBe('true');
    for (const id of ['json-formatter', 'subtitle-tools', 'markdown-editor']) {
      expect(tools.find(tool => tool.id === id)?.status).toBe('draft');
      expect(availability[`import.meta.env.T4F_TOOL_${id.replaceAll('-', '_').toUpperCase()}_AVAILABLE`]).toBe('false');
    }
  }
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_TEXT_CLEANER_AVAILABLE[\s\S]*?import\('\.\/text-cleaner\/TextCleaner'\)/);
  expect(read('src/tools/text-cleaner/TextCleaner.tsx')).toContain(
    "from '../../ui/text-editor/TextEditor'",
  );
  for (const path of [
    'src/tools/ToolRuntime.tsx',
    'src/tools/registry.ts',
    'src/tools/general/ui.tsx',
    'src/tools/general/TextWorkspace.tsx',
    'src/workbench/WorkbenchShell.tsx',
    'src/layouts/SiteLayout.astro',
  ]) {
    expect(read(path), path).not.toMatch(/@codemirror|ui\/text-editor/);
  }
  const editor = read('src/ui/text-editor/TextEditor.tsx');
  expect(editor).toContain('./codemirror.NOTICE.txt?url');
  expect(editor).not.toMatch(/@codemirror\/lang-|@uiw\/|monaco|ace-builds/);
  expect(editor).toContain('slots.extra.reconfigure(extensions)');
});

it('ships the complete MIT license of every installed editor runtime dependency', () => {
  const notice = read('src/ui/text-editor/codemirror.NOTICE.txt').replace(
    /\r\n/g,
    '\n',
  );
  const visited = new Set<string>();
  function visit(name: string, resolver = createRequire(import.meta.url)) {
    let root = dirname(resolver.resolve(name));
    while (!existsSync(join(root, 'package.json'))) root = dirname(root);
    const pkg = JSON.parse(read(join(root, 'package.json')));
    if (visited.has(pkg.name)) return;
    visited.add(pkg.name);
    expect(pkg.license, pkg.name).toBe('MIT');
    expect(notice).toContain(`${pkg.name}@${pkg.version}`);
    expect(notice, pkg.name).toContain(
      read(join(root, 'LICENSE')).replace(/\r\n/g, '\n'),
    );
    const nested = createRequire(join(root, 'package.json'));
    for (const dependency of Object.keys(pkg.dependencies ?? {}))
      visit(dependency, nested);
  }
  for (const name of [
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/commands',
  ])
    visit(name);
  expect(visited.size).toBeGreaterThanOrEqual(3);
});
