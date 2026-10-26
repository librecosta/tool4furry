import { describe, expect, it } from 'vitest';
import { parseRegion, regions } from '../src/config/region';
import { getAvailableTools, getPublishedTools, tools } from '../src/tools/registry';
import { toolLoaders } from '../src/tools/loaders';
import type { ToolDefinition } from '../src/tools/types';
import { getLabPaths } from '../src/lab/routes';
import { simulateText, advanceTasks } from '../src/lab/demo-logic';

const fixture = (
  id: string,
  status: ToolDefinition['status'],
  regions: ToolDefinition['regions'],
): ToolDefinition => ({
  id,
  slug: id,
  category: 'images',
  group: 'image-processing',
  mode: 'custom',
  status,
  regions,
  copy: {
    zh: { title: '测试', description: '测试' },
    en: { title: 'Test', description: 'Test' },
  },
});
describe('published route boundary', () => {
  it('filters drafts and tools unavailable in the build region', () => {
    const registry = [
      fixture('draft', 'draft', ['cn', 'global']),
      fixture('china', 'published', ['cn']),
      fixture('world', 'published', ['global']),
      fixture('both', 'published', ['cn', 'global']),
    ];
    expect(getPublishedTools('cn', registry).map((tool) => tool.id)).toEqual([
      'china',
      'both',
    ]);
    expect(
      getPublishedTools('global', registry).map((tool) => tool.id),
    ).toEqual(['world', 'both']);
  });
  it('requires a loader for every published tool', () => {
    for (const tool of tools.filter((tool) => tool.status === 'published'))
      expect(toolLoaders[tool.id]).toBeTypeOf('function');
  });
  it('allows regional drafts only in development, on the same tool routes', () => {
    const registry = [fixture('draft', 'draft', ['cn']), fixture('published', 'published', ['cn', 'global'])];
    expect(getAvailableTools('cn', true, registry).map(tool => tool.slug)).toEqual(['draft', 'published']);
    expect(getAvailableTools('global', true, registry).map(tool => tool.slug)).toEqual(['published']);
    expect(getAvailableTools('cn', false, registry)).toEqual(getPublishedTools('cn', registry));
  });
  it('registers all five lab URLs in dev only', () => {
    expect(getLabPaths(true).map((path) => path.params.mode)).toEqual([
      'canvas',
      'form',
      'batch',
      'ui',
      'files',
    ]);
    expect(getLabPaths(false)).toEqual([]);
  });
});
describe('region configuration', () => {
  it('defaults to Chinese without environment configuration', () => {
    expect(parseRegion(undefined)).toBe('cn');
    expect(regions.cn).toEqual({
      defaultLocale: 'zh',
      site: 'https://tool4furry.cn',
    });
    expect(regions.global).toEqual({
      defaultLocale: 'en',
      site: 'https://tool4furry.com',
    });
  });
  it('rejects a typo instead of silently publishing the wrong region', () => {
    expect(() => parseRegion('globla')).toThrow('Unsupported SITE_REGION');
  });
});
describe('demo logic', () => {
  it('validates blank input and transforms text without evaluating markup', () => {
    expect(simulateText('  ', '', false)).toBeNull();
    expect(simulateText('  Furry  ', '✦ ', true)).toBe('✦ FURRY');
    expect(simulateText('<script>x</script>', '', false)).toBe(
      '<script>x</script>',
    );
  });
  it('advances a simulation without mutating tasks or changing output format', () => {
    const tasks = [{ id: 1, status: 'waiting' as const, format: 'PNG' }];
    const running = advanceTasks(tasks);
    expect(running[0].status).toBe('running');
    expect(advanceTasks(running)[0]).toEqual({
      id: 1,
      status: 'done',
      format: 'PNG',
    });
    expect(advanceTasks(advanceTasks(running))[0].status).toBe('done');
    expect(tasks[0].status).toBe('waiting');
    expect(advanceTasks([])).toEqual([]);
  });
});
