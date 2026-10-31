import { describe, expect, it } from 'vitest';
import { addCatalogFixture } from '../src/site/catalog-fixture';
import { getCatalogEntries, getCatalogSections, getHomepageEntries } from '../src/site/catalog';
import { catalogPage, emptyCatalogState } from '../src/site/catalog-state';
import { roles } from '../src/site/roles';
import { tools } from '../src/tools/registry';

describe('catalog-only DEV samples', () => {
  it.each(['cn', 'global'] as const)('defaults to real tools under the %s publication gate in both locales', region => {
    for (const locale of ['zh', 'en'] as const) for (const dev of [false, true]) {
      const real = getCatalogEntries(region, tools, dev, locale), sections = getCatalogSections(region, tools, dev, locale);
      expect(real.map(entry => entry.id)).toEqual(['image-converter', 'image-resize-crop']);
      expect(addCatalogFixture(real, sections, locale)).toEqual({ entries: real, sections, fixtureCount: 0 });
      expect(addCatalogFixture(real, sections, locale, 'off')).toEqual({ entries: real, sections, fixtureCount: 0 });
    }
  });
  it.each(['zh', 'en'] as const)('adds 48 noninteractive %s samples across real parent categories', locale => {
    const real = getCatalogEntries('cn', tools, true, locale), sections = getCatalogSections('cn', tools, true, locale);
    const snapshot = structuredClone({ real, sections, tools });
    const result = addCatalogFixture(real, sections, locale, 'compact');
    expect(result.fixtureCount).toBe(48); expect(result.entries).toHaveLength(real.length + 48);
    expect(catalogPage(result.entries.map(entry => ({ ...entry, search: entry.title })), emptyCatalogState()).totalPages).toBe(5);
    const samples = result.entries.filter(entry => entry.fixture);
    expect(new Set(samples.map(entry => entry.id)).size).toBe(48);
    expect(samples.every(entry => !entry.href && entry.title.includes(locale === 'zh' ? '目录样本' : 'Catalog sample'))).toBe(true);
    for (const role of Object.keys(roles)) expect(samples.some(entry => entry.roles.includes(role as keyof typeof roles))).toBe(true);
    expect(result.sections).toHaveLength(5);
    expect(result.sections.flatMap(section => section.groups)).toHaveLength(6);
    expect(result.sections.flatMap(section => section.groups.flatMap(group => group.entries))).toHaveLength(real.length + 48);
    expect({ real, sections, tools }).toEqual(snapshot);
    expect(getHomepageEntries('cn', tools, undefined, true, locale)).toEqual(real);
    expect(getCatalogEntries('cn', tools, false, locale)).toEqual(real.filter(entry => entry.status === 'published'));
  });
  it('can disable samples or extend only the catalog QA data beyond seven pages', () => {
    const real = getCatalogEntries('global', tools, true, 'en'), sections = getCatalogSections('global', tools, true, 'en');
    expect(addCatalogFixture(real, sections, 'en', 'off')).toEqual({ entries: real, sections, fixtureCount: 0 });
    const extended = addCatalogFixture(real, sections, 'en', 'pagination');
    expect(extended.fixtureCount).toBe(180);
    const entries = extended.entries.map(entry => ({ ...entry, search: entry.title }));
    for (const [scope, total, totalPages] of [
      [{}, real.length + 180, 16], [{ category: 'images' }, real.length + 132, 12], [{ group: 'image-processing' }, real.length + 108, 10],
    ] as const) {
      const page = catalogPage(entries, { ...emptyCatalogState(), ...scope });
      expect(page.total).toBe(total); expect(page.totalPages).toBe(totalPages);
    }
    expect(extended.sections.flatMap(section => section.groups).map(group => group.entries.filter(entry => entry.fixture).length)).toEqual([108, 24, 12, 12, 12, 12]);
    expect(() => addCatalogFixture(real, sections, 'en', 'invalid')).toThrow('T4F_CATALOG_FIXTURE');
  });
});
