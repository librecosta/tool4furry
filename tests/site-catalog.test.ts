import { describe, expect, it } from 'vitest';
import {
  getCatalogEntries,
  getHomepageEntries,
  getCatalogSections,
  getDiscoverySections,
} from '../src/site/catalog';
import type { ToolDefinition } from '../src/tools/types';
import { fixtureTools } from './fixtures/tools';
import { assertValidRegistry } from '../src/tools/validate-registry';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';

// Test-only metadata; never registered as a real tool or given a loader.
function fixture(
  id: string,
  overrides: Partial<ToolDefinition> = {},
): ToolDefinition {
  return {
    id,
    slug: id,
    category: 'images',
    group: 'image-processing',
    mode: 'canvas',
    status: 'published',
    regions: ['cn', 'global'],
    copy: {
      cn: { title: `${id} 中文`, description: '中文说明' },
      global: { title: `${id} English`, description: 'English description' },
    },
    ...overrides,
  };
}

describe('static tool discovery', () => {
  it('supports an empty registry in both regions', () => {
    expect(getCatalogEntries('cn', [])).toEqual([]);
    expect(getCatalogEntries('global', [])).toEqual([]);
  });

  it.each(['cn', 'global'] as const)(
    'discovers the real draft Converter in DEV %s even with no featured IDs, but not in production',
    (region) => {
      const entries = getCatalogEntries(region, undefined, true);
      expect(entries.map((entry) => [entry.id, entry.href, entry.title])).toEqual([
        ['image-converter', '/tools/image-converter/', imageConverterDefinition.copy[region].title],
      ]);
      expect(getHomepageEntries(region, undefined, [], true)).toEqual(entries);
      expect(getCatalogSections(region, undefined, true).flatMap((section) =>
        section.groups.flatMap((group) => group.entries),
      )).toEqual(entries);
      for (const section of getDiscoverySections(region, undefined, true))
        expect(section.entries).toEqual(entries);
      expect(getDiscoverySections(region, undefined, true)).toHaveLength(3);
      expect(getCatalogEntries(region)).toEqual([]);
      expect(getHomepageEntries(region)).toEqual([]);
      expect(getCatalogSections(region)).toEqual([]);
      expect(getDiscoverySections(region)).toEqual([]);
      expect(imageConverterDefinition.status).toBe('draft');
    },
  );

  it.each(['cn', 'global'] as const)(
    'keeps regional draft visibility consistent across DEV %s discovery',
    (region) => {
      const otherRegion = region === 'cn' ? 'global' : 'cn';
      const list: ToolDefinition[] = [
        ...fixtureTools(1),
        { ...fixtureTools(1)[0], id: 'local-draft', slug: 'local-draft', status: 'draft', regions: [region] },
        { ...fixtureTools(1)[0], id: 'other-draft', slug: 'other-draft', status: 'draft', regions: [otherRegion] },
      ];
      const entries = getCatalogEntries(region, list, true);
      expect(entries.map((entry) => entry.id)).toEqual(['fixture-1', 'local-draft']);
      expect(getHomepageEntries(region, list, ['other-draft'], true)).toEqual(entries);
      expect(getCatalogSections(region, list, true).flatMap((section) =>
        section.groups.flatMap((group) => group.entries),
      )).toEqual(entries);
      for (const section of getDiscoverySections(region, list, true))
        expect(section.entries).toEqual(entries);
      expect(getCatalogEntries(region, list).map((entry) => entry.id)).toEqual(['fixture-1']);
    },
  );

  it.each(['cn', 'global'] as const)(
    'includes only published tools for %s, with localized card data and real route shapes',
    (region) => {
      const registry = [
        fixture('both', { slug: 'actual-route' }),
        fixture('draft', { status: 'draft' }),
        fixture('cn-only', { regions: ['cn'] }),
        fixture('global-only', { regions: ['global'] }),
      ];
      const cards = getCatalogEntries(region, registry);
      expect(cards.map((card) => card.id)).toEqual(['both', `${region}-only`]);
      expect(cards[0]).toEqual({
        id: 'both',
        href: '/tools/actual-route/',
        title: region === 'cn' ? 'both 中文' : 'both English',
        description: region === 'cn' ? '中文说明' : 'English description',
        category: region === 'cn' ? '图像与素材' : 'Images & Assets',
        categoryId: 'images',
        groupId: 'image-processing',
        group: region === 'cn' ? '图片处理' : 'Image Processing',
        audiences: [],
        contexts: [],
      });
      expect(registry.map((tool) => tool.status)).toEqual([
        'published',
        'draft',
        'published',
        'published',
      ]);
    },
  );

  it('returns an empty catalog when only drafts or another region are available', () => {
    expect(
      getCatalogEntries('cn', [
        fixture('draft', { status: 'draft' }),
        fixture('global', { regions: ['global'] }),
      ]),
    ).toEqual([]);
  });

  it('rejects unknown categories before publication, including inherited property names', () => {
    for (const category of ['new-category', 'constructor', '__proto__']) {
      expect(() =>
        assertValidRegistry(
          [
            fixture('new', {
              category: category as ToolDefinition['category'],
            }),
          ],
          { new: () => null },
        ),
      ).toThrow('unknown category');
    }
  });

  it('uses topic categories independently of workbench modes', () => {
    const registry = [
      fixture('canvas-images', { category: 'images', mode: 'canvas' }),
      fixture('form-images', { category: 'images', mode: 'form' }),
    ];
    expect(
      getCatalogEntries('global', registry).map((card) => card.category),
    ).toEqual(['Images & Assets', 'Images & Assets']);
  });

  it.each([0, 3, 20, 100])(
    'projects %i tools without losing full catalog coverage or inflating menus',
    (count) => {
      const list = fixtureTools(count);
      const entries = getCatalogEntries('cn', list);
      const sections = getCatalogSections('cn', list);
      expect(getCatalogEntries('cn', list, true)).toEqual(entries);
      expect(getHomepageEntries('cn', list, undefined, true)).toEqual(getHomepageEntries('cn', list));
      expect(getCatalogSections('cn', list, true)).toEqual(sections);
      expect(getDiscoverySections('cn', list, true)).toEqual(getDiscoverySections('cn', list));
      expect(
        sections.flatMap((section) =>
          section.groups.flatMap((group) => group.entries),
        ),
      ).toEqual(entries);
      expect(getHomepageEntries('cn', list)).toHaveLength(Math.min(9, count));
      for (const discovery of getDiscoverySections('cn', list)) {
        expect(new Set(discovery.entries.map((entry) => entry.id)).size).toBe(
          count,
        );
        expect(discovery.entries.map((entry) => entry.href)).toEqual(
          entries.map((entry) => entry.href),
        );
      }
      if (!count) expect(getDiscoverySections('cn', list)).toEqual([]);
    },
  );
  it('filters editorial IDs, deduplicates and fills in stable registry order', () => {
    const list = [
      fixture('draft', { status: 'draft' }),
      fixture('global', { regions: ['global'] }),
      ...fixtureTools(20),
    ];
    expect(
      getHomepageEntries('cn', list, [
        'missing',
        'draft',
        'global',
        'fixture-12',
        'fixture-12',
      ]).map((entry) => entry.id),
    ).toEqual([
      'fixture-12',
      ...Array.from({ length: 8 }, (_, i) => `fixture-${i + 1}`),
    ]);
    expect(getCatalogSections('cn', list).map((section) => section.id)).toEqual(
      ['images'],
    );
    expect(
      getDiscoverySections('cn', list).map((section) => section.id),
    ).toEqual(['audience-creator', 'audience-developer', 'context-studio']);
  });
});
