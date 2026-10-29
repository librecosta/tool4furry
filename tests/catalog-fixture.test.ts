import { describe, expect, it } from 'vitest';
import { addCatalogFixture } from '../src/site/catalog-fixture';
import { getCatalogEntries, getCatalogSections, getHomepageEntries } from '../src/site/catalog';
import { catalogPage, emptyCatalogState } from '../src/site/catalog-state';
import { roles } from '../src/site/roles';
import { tools } from '../src/tools/registry';

describe('catalog-only DEV samples', () => {
  it.each(['zh', 'en'] as const)('adds 48 noninteractive %s samples across real parent categories', locale => {
    const real = getCatalogEntries('cn', tools, true, locale), sections = getCatalogSections('cn', tools, true, locale);
    const snapshot = structuredClone({ real, sections, tools });
    const result = addCatalogFixture(real, sections, locale);
    expect(result.fixtureCount).toBe(48); expect(result.entries).toHaveLength(49);
    expect(catalogPage(result.entries.map(entry => ({ ...entry, search: entry.title })), emptyCatalogState()).totalPages).toBe(5);
    const samples = result.entries.filter(entry => entry.fixture);
    expect(new Set(samples.map(entry => entry.id)).size).toBe(48);
    expect(samples.every(entry => !entry.href && entry.title.includes(locale === 'zh' ? '目录样本' : 'Catalog sample'))).toBe(true);
    for (const role of Object.keys(roles)) expect(samples.some(entry => entry.roles.includes(role as keyof typeof roles))).toBe(true);
    expect(result.sections).toHaveLength(5);
    expect(result.sections.flatMap(section => section.groups)).toHaveLength(6);
    expect(result.sections.flatMap(section => section.groups.flatMap(group => group.entries))).toHaveLength(49);
    expect({ real, sections, tools }).toEqual(snapshot);
    expect(getHomepageEntries('cn', tools, undefined, true, locale)).toEqual(real);
    expect(getCatalogEntries('cn', tools, false, locale)).toEqual([]);
  });
  it('can disable samples or extend only the catalog QA data beyond seven pages', () => {
    const real = getCatalogEntries('global', tools, true, 'en'), sections = getCatalogSections('global', tools, true, 'en');
    expect(addCatalogFixture(real, sections, 'en', 'off')).toEqual({ entries: real, sections, fixtureCount: 0 });
    const extended = addCatalogFixture(real, sections, 'en', 'pagination');
    expect(extended.fixtureCount).toBe(108);
    expect(catalogPage(extended.entries.map(entry => ({ ...entry, search: entry.title })), emptyCatalogState()).totalPages).toBe(10);
    expect(() => addCatalogFixture(real, sections, 'en', 'invalid')).toThrow('T4F_CATALOG_FIXTURE');
  });
});
