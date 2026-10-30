import { describe, expect, it } from 'vitest';
import { assertToolLoaderContract, toolAvailabilityConstant, toolBuildDefines } from '../src/tools/build-availability';
import { readFileSync } from 'node:fs';
import { getAvailableTools } from '../src/tools/registry';
import { fixtureTool } from './fixtures/tools';
import type { ToolDefinition } from '../src/tools/types';

describe('Registry compile-time availability projection', () => {
  const registry = [
    fixtureTool('image-converter'),
    fixtureTool('image-resizer', { status: 'draft' }),
    fixtureTool('character-editor', { regions: ['global'] }),
    fixtureTool('cn-only', { regions: ['cn'] }),
  ];
  it.each(['cn', 'global'] as const)('projects every registered id in %s without runtime flags', region => {
    const defines = toolBuildDefines(registry, region);
    expect(defines).toEqual({
      'import.meta.env.T4F_TOOL_IMAGE_CONVERTER_AVAILABLE': 'true',
      'import.meta.env.T4F_TOOL_IMAGE_RESIZER_AVAILABLE': 'false',
      'import.meta.env.T4F_TOOL_CHARACTER_EDITOR_AVAILABLE': String(region === 'global'),
      'import.meta.env.T4F_TOOL_CN_ONLY_AVAILABLE': String(region === 'cn'),
    });
    expect(Object.entries(defines).filter(([, value]) => value === 'true').map(([key]) => key))
      .toEqual(getAvailableTools(region, false, registry).map(tool => toolAvailabilityConstant(tool.id)));
    expect(getAvailableTools(region, true, registry).map(tool => tool.id)).toContain('image-resizer');
    expect(defines['import.meta.env.T4F_TOOL_UNKNOWN_AVAILABLE']).toBeUndefined();
  });
  it('supports empty regional sets and draft transitions', () => {
    expect(toolBuildDefines([], 'cn')).toEqual({});
    expect(toolBuildDefines([fixtureTool('one', { status: 'draft' })], 'cn'))
      .toEqual({ 'import.meta.env.T4F_TOOL_ONE_AVAILABLE': 'false' });
  });
  it.each(['Bad-ID', 'a_b', '../one', '', 'a--b', 'a.b'])('rejects illegal id %j before normalization', id => {
    expect(() => toolAvailabilityConstant(id)).toThrow('Invalid tool id');
  });
  it('fails collisions and malformed publication metadata rather than enabling them', () => {
    expect(() => toolBuildDefines([registry[0], registry[0]], 'cn')).toThrow('Conflicting tool availability constant');
    for (const override of [{ status: 'unknown' }, { regions: [] }, { regions: ['unknown'] }, { regions: ['cn', 'cn'] }])
      expect(() => toolBuildDefines([fixtureTool('one', override as Partial<ToolDefinition>)], 'cn'))
        .toThrow('Invalid publication metadata');
  });
  it('validates the real explicit Loader and allows omitted/unavailable Draft entries', () => {
    const source = readFileSync('src/tools/loaders.ts', 'utf8');
    expect(() => assertToolLoaderContract(registry, source)).not.toThrow();
    expect(() => assertToolLoaderContract(registry, 'export const toolLoaders = {};')).not.toThrow();
    expect(() => assertToolLoaderContract(registry, "export const toolLoaders = { 'image-resizer': undefined };" )).not.toThrow();
  });
  it.each([
    "import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_CONVERTER_AVAILABLE ? () => import('./resizer') : undefined",
    "import.meta.env.DEV || import.meta.env.T4F_TOOL_UNKNOWN_AVAILABLE ? () => import('./resizer') : undefined",
    "flags['image-resizer'] ? () => import('./resizer') : undefined",
    "import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_RESIZER_AVAILABLE ? () => import(path) : undefined",
    "() => import('./resizer')",
  ])('rejects an inconsistent Draft Loader before dependency discovery: %s', value => {
    expect(() => assertToolLoaderContract(registry, `export const toolLoaders = { 'image-resizer': ${value} };`))
      .toThrow('Invalid static loader gate/import: image-resizer');
  });
});
