import { it, expect } from 'vitest';
import { tools, getAvailableTools } from '../src/tools/registry';
import { toolPageContents, getToolPageContent } from '../src/site/tool-content';
import { toolLoaders } from '../src/tools/loaders';
import { groups } from '../src/site/taxonomy';
import { draftIds } from './fixtures/general-toolbox';
it('registers 15 real bilingual regional Drafts while preserving seven Published tools', () => {
  expect(tools).toHaveLength(22);
  expect(tools.filter((t) => t.status === 'draft').map((t) => t.id)).toEqual(
    draftIds,
  );
  for (const region of ['cn', 'global'] as const) {
    expect(getAvailableTools(region, false)).toHaveLength(7);
    expect(getAvailableTools(region, true)).toHaveLength(22);
    for (const id of draftIds) {
      const tool = tools.find((t) => t.id === id)!;
      expect(tool.regions).toEqual(['cn', 'global']);
      expect(toolLoaders[id]).toBeTypeOf('function');
      expect(groups[tool.group].category).toBe(tool.category);
      for (const locale of ['zh', 'en'] as const) {
        const c = getToolPageContent(
          tool,
          region,
          toolPageContents,
          true,
          locale,
        );
        expect(c.steps?.length).toBeGreaterThanOrEqual(3);
        expect(c.limitations?.length).toBeGreaterThan(0);
        if (locale === 'en')
          expect(JSON.stringify(c)).not.toMatch(/[\u4e00-\u9fff]/);
        expect(() =>
          getToolPageContent(tool, region, toolPageContents, false, locale),
        ).toThrow();
      }
    }
  }
});
