// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { tools } from '../src/tools/registry';
import { toolBuildDefines } from '../src/tools/build-availability';
import { draftIds } from './fixtures/general-toolbox';

const read = (name: string) => readFileSync(name, 'utf8');
it('publishes Text Diff in both regions while keeping its Worker and viewer behind the lazy loader', () => {
  expect(tools).toHaveLength(29);
  expect(tools.filter(tool => tool.status === 'published')).toHaveLength(26);
  expect(tools.filter(tool => tool.status === 'draft').map(tool => tool.id)).toEqual(draftIds);
  expect(tools.find(tool => tool.id === 'text-diff')).toMatchObject({ status: 'published', regions: ['cn', 'global'] });
  for (const region of ['cn', 'global'] as const) {
    const defines = toolBuildDefines(tools, region);
    expect(defines['import.meta.env.T4F_TOOL_TEXT_DIFF_AVAILABLE']).toBe('true');
    expect(Object.values(defines).filter(value => value === 'false')).toHaveLength(3);
  }
  expect(read('src/tools/loaders.ts')).toMatch(/T4F_TOOL_TEXT_DIFF_AVAILABLE[\s\S]*?import\('\.\/text-diff\/TextDiff'\)/);
  expect(read('src/tools/text-diff/comparison.ts')).toContain("new URL('./diff.worker.ts', import.meta.url)");
  expect(read('astro.config.mjs')).toMatch(/include:\s*\[[^\]]*'diff'/); // Avoid a first-task DEV optimizer reload.
  expect(read('src/tools/text-diff/diff.worker.ts')).toContain("from './core'");
  expect(read('src/tools/text-diff/TextDiff.tsx')).toContain("from '../../ui/text-editor/TextEditor'");
  expect(read('src/tools/text-diff/TextDiff.tsx')).toContain('./diff.NOTICE.txt?url');
  for (const path of ['src/tools/registry.ts', 'src/tools/ToolRuntime.tsx', 'src/tools/general/ui.tsx', 'src/layouts/SiteLayout.astro']) {
    expect(read(path), path).not.toMatch(/diff\.worker|from ['"]diff['"]|text-diff\/(?:TextDiff|DiffViewer|core|report|comparison)/);
  }
});
it('retains the installed diff 9.0.0 complete BSD notice', () => {
  const require = createRequire(import.meta.url);
  const root = dirname(dirname(require.resolve('diff')));
  const license = read(join(root, 'LICENSE')).replace(/\r\n/g, '\n');
  expect(JSON.parse(read(join(root, 'package.json'))).version).toBe('9.0.0');
  expect(read('src/tools/text-diff/diff.NOTICE.txt').replace(/\r\n/g, '\n')).toContain(license.trim());
});
