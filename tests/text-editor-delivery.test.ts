import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { definition as cleaner } from '../src/tools/text-cleaner/definition';
import { definition as diff } from '../src/tools/text-diff/definition';
import { definition as subtitles } from '../src/tools/subtitle-tools/definition';
import { definition as json } from '../src/tools/json-formatter/definition';
import { tools } from '../src/tools/registry';
import { toolAvailabilityConstant, toolBuildDefines } from '../src/tools/build-availability';
import { draftIds } from './fixtures/general-toolbox';

const read = (path: string) => readFileSync(path, 'utf8');
it('shares the editor across four Published tools while excluding all twelve Draft tools', () => {
  for (const tool of [cleaner, diff, subtitles, json]) {
    expect(tool.status).toBe('published');
    expect(tool.regions).toEqual(['cn', 'global']);
  }
  for (const region of cleaner.regions) {
    const availability = toolBuildDefines(tools, region);
    expect(availability['import.meta.env.T4F_TOOL_TEXT_CLEANER_AVAILABLE']).toBe('true');
    expect(availability['import.meta.env.T4F_TOOL_TEXT_DIFF_AVAILABLE']).toBe('true');
    expect(availability['import.meta.env.T4F_TOOL_SUBTITLE_TOOLS_AVAILABLE']).toBe('true');
    expect(availability['import.meta.env.T4F_TOOL_JSON_FORMATTER_AVAILABLE']).toBe('true');
    expect(draftIds).toHaveLength(12);
    expect(draftIds).toContain('markdown-editor');
    expect(draftIds).toContain('url-base64');
    for (const id of draftIds) {
      expect(tools.find(tool => tool.id === id)?.status).toBe('draft');
      expect(availability[toolAvailabilityConstant(id)]).toBe('false');
    }
  }
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_TEXT_CLEANER_AVAILABLE[\s\S]*?import\('\.\/text-cleaner\/TextCleaner'\)/);
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_SUBTITLE_TOOLS_AVAILABLE\s*\?\s*\(\) => import\('\.\/subtitle-tools\/SubtitleTools'\)/);
  expect(read('src/tools/text-cleaner/TextCleaner.tsx')).toContain(
    "from '../../ui/text-editor/TextEditor'",
  );
  expect(read('src/tools/text-diff/TextDiff.tsx')).toContain(
    "from '../../ui/text-editor/TextEditor'",
  );
  expect(read('src/tools/subtitle-tools/SubtitleEditor.tsx')).toContain(
    "from '../../ui/text-editor/TextEditor'",
  );
  expect(read('src/tools/subtitle-tools/definition.ts')).not.toMatch(/@codemirror|TextEditor|SubtitleTools|['"]\.\/core['"]/);
  expect(read('src/tools/json-formatter/JsonFormatter.tsx')).toContain("from '../../ui/text-editor/TextEditor'");
  expect(read('src/tools/json-formatter/definition.ts')).not.toMatch(/@codemirror|TextEditor|JsonFormatter|['"]\.\/core['"]/);
  expect(read('src/tools/json-formatter/editor.ts')).toContain("from '@codemirror/lang-json'");
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_JSON_FORMATTER_AVAILABLE\s*\?\s*\(\) => import\('\.\/json-formatter\/JsonFormatter'\)/);
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_URL_BASE64_AVAILABLE\s*\?\s*\(\) => import\('\.\/url-base64\/UrlBase64'\)/);
  expect(read('src/tools/url-base64/UrlBase64.tsx')).toContain("from '../../ui/text-editor/TextEditor'");
  expect(read('src/tools/url-base64/definition.ts')).not.toMatch(/@codemirror|TextEditor|UrlBase64|['"]\.\/(?:core|processing)['"]/);
  for (const path of [
    'src/tools/ToolRuntime.tsx',
    'src/tools/registry.ts',
    'src/tools/general/ui.tsx',
    'src/tools/general/TextWorkspace.tsx',
    'src/workbench/WorkbenchShell.tsx',
    'src/layouts/SiteLayout.astro',
  ]) {
    expect(read(path), path).not.toMatch(/@codemirror|ui\/text-editor/);
    expect(read(path), path).not.toMatch(/subtitle-tools\/(?:SubtitleTools|SubtitleEditor|core|delivery)/);
    expect(read(path), path).not.toMatch(/json-formatter\/(?:JsonFormatter|JsonTree|core|editor|processing)/);
    expect(read(path), path).not.toMatch(/url-base64\/(?:UrlBase64|core|processing|codec\.worker)/);
  }
  const editor = read('src/ui/text-editor/TextEditor.tsx');
  expect(editor).toContain('./codemirror.NOTICE.txt?url');
  expect(editor).not.toMatch(/@codemirror\/lang-|@uiw\/|monaco|ace-builds/);
  expect(editor).not.toContain('url-base64');
  expect(editor).toContain('slots.extra.reconfigure(extensions)');
});

it('ships the complete JSON language and grammar notices separately from the shared editor', () => {
  const toolNotice = read('src/tools/json-formatter/json-language.NOTICE.txt').replace(/\r\n/g, '\n');
  const sharedNotice = read('src/ui/text-editor/codemirror.NOTICE.txt');
  const resolvePackage = (name: string, resolver: ReturnType<typeof createRequire>) => {
    let root = dirname(resolver.resolve(name));
    while (!existsSync(join(root, 'package.json'))) root = dirname(root);
    return { root, manifest: JSON.parse(read(join(root, 'package.json'))) };
  };
  const language = resolvePackage('@codemirror/lang-json', createRequire(import.meta.url));
  const grammar = resolvePackage('@lezer/json', createRequire(join(language.root, 'package.json')));
  for (const { root, manifest: pkg } of [language, grammar]) {
    expect(pkg.license).toBe('MIT');
    expect(toolNotice).toContain(`${pkg.name}@${pkg.version}`);
    expect(toolNotice).toContain(read(join(root, 'LICENSE')).replace(/\r\n/g, '\n'));
    expect(sharedNotice).not.toContain(`${pkg.name}@`);
  }
  expect(read('src/tools/json-formatter/JsonFormatter.tsx')).toContain('./json-language.NOTICE.txt?url');
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
