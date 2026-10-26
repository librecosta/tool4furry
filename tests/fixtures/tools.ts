import type { ToolDefinition } from '../../src/tools/types';

// Never imported by application code or committed to the production registry.
export function fixtureTool(
  id: string,
  overrides: Partial<ToolDefinition> = {},
): ToolDefinition {
  return {
    id,
    slug: id,
    category: 'images',
    group: 'image-processing',
    audiences: ['creator', 'developer'],
    contexts: ['studio'],
    mode: 'form',
    status: 'published',
    regions: ['cn', 'global'],
    copy: {
      zh: { title: `${id} 中文`, description: '仅用于测试的说明' },
      en: { title: `${id} English`, description: 'Test-only description' },
    },
    ...overrides,
  };
}
export function fixtureTools(count: number) {
  return Array.from({ length: count }, (_, index) =>
    fixtureTool(`fixture-${index + 1}`),
  );
}
export function fixtureLoaders(tools: readonly ToolDefinition[]) {
  return Object.fromEntries(
    tools.map((tool) => [
      tool.id,
      () => Promise.resolve({ default: () => null }),
    ]),
  );
}
