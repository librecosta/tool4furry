import { describe, expect, it } from 'vitest';
import {
  getToolPageContent,
  assertPublishedContent,
  getRelatedTools,
  type ToolContentMap,
} from '../src/site/tool-content';
import { fixtureTool } from './fixtures/tools';

const content = {
  title: 'Test — Tool4Furry',
  description: 'Honest test description',
  h1: 'Test heading',
  intro: 'Test intro',
};
const map: ToolContentMap = {
  one: { cn: content, global: { ...content, h1: 'English heading' } },
};
describe('Astro-only content boundary', () => {
  it('requires localized content only for published region routes', () => {
    const one = fixtureTool('one');
    expect(getToolPageContent(one, 'global', map).h1).toBe('English heading');
    expect(() => assertPublishedContent([one], map)).not.toThrow();
    expect(() =>
      getToolPageContent({ ...one, regions: ['cn'] }, 'global', map),
    ).toThrow('Unpublished');
    expect(() =>
      getToolPageContent({ ...one, status: 'draft' }, 'cn', map),
    ).toThrow('Unpublished');
    expect(getToolPageContent({ ...one, status: 'draft' }, 'cn', map, true)).toEqual(content);
    expect(() => getToolPageContent({ ...one, regions: ['cn'] }, 'global', map, true)).toThrow('Unpublished');
    expect(() =>
      assertPublishedContent([{ ...one, regions: ['cn'] }], {
        one: { cn: content },
      }),
    ).not.toThrow();
  });
  it.each(['title', 'description', 'h1', 'intro'])(
    'blocks missing %s before publication',
    (key) => {
      expect(() =>
        getToolPageContent(fixtureTool('one'), 'cn', {
          one: { cn: { ...content, [key]: '' } },
        }),
      ).toThrow('Missing tool content');
    },
  );
  it('rejects duplicate brand titles, blank guide items and missing translations', () => {
    for (const bad of [
      { title: 'Tool4Furry · Tool4Furry' },
      { steps: [''] },
      { faq: [{ question: 'Q', answer: '' }] },
    ])
      expect(() =>
        getToolPageContent(fixtureTool('one'), 'cn', {
          one: { cn: { ...content, ...bad } },
        }),
      ).toThrow();
    expect(() =>
      assertPublishedContent([fixtureTool('one')], { one: { cn: content } }),
    ).toThrow('global');
  });
  it('keeps related tools published, regional, bounded and distinct from the current tool', () => {
    const one = fixtureTool('one');
    const list = [
      one,
      fixtureTool('draft', { status: 'draft' }),
      fixtureTool('global', { regions: ['global'] }),
      fixtureTool('two'),
      fixtureTool('three'),
      fixtureTool('four'),
      fixtureTool('five'),
    ];
    expect(getRelatedTools(one, 'cn', list).map((tool) => tool.id)).toEqual([
      'two',
      'three',
      'four',
    ]);
  });
  it.each(['cn', 'global'] as const)(
    'includes only available same-group tools in DEV %s recommendations',
    (region) => {
      const one = fixtureTool('current', { status: 'draft' });
      const list = [
        one,
        fixtureTool('other-region', { status: 'draft', regions: [region === 'cn' ? 'global' : 'cn'] }),
        fixtureTool('local-draft', { status: 'draft', regions: [region] }),
        fixtureTool('published'),
        fixtureTool('third'),
        fixtureTool('fourth'),
      ];
      expect(getRelatedTools(one, region, list, true).map((tool) => tool.slug)).toEqual([
        'local-draft', 'published', 'third',
      ]);
      expect(getRelatedTools(one, region, list).map((tool) => tool.slug)).toEqual([
        'published', 'third', 'fourth',
      ]);
    },
  );
});
