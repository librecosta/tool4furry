import { describe, expect, it } from 'vitest';
import { getNavigationEntries, getHomepageEntries, navigationToolIds } from '../src/site/catalog';
import { getToolboxGroups } from '../src/site/toolbox-navigation';
import { getRoleShowcases } from '../src/site/homepage-showcase';
import { roles, type RoleId } from '../src/site/roles';
import { tools } from '../src/tools/registry';
import { fixtureTools } from './fixtures/tools';

describe('native toolbox selections', () => {
  it.each(['cn', 'global'] as const)('projects independent editorial picks for %s in both languages and environments', region => {
    for (const locale of ['zh', 'en'] as const) for (const dev of [false, true]) {
      const selections = getToolboxGroups(region, locale, dev);
      expect(selections.map(group => group.id)).toEqual(['featured', 'painter', 'composer', 'developer', 'animator', 'operations', 'studio']);
      expect(selections[0].entries.map(entry => entry.id)).toEqual(dev ? navigationToolIds : navigationToolIds.slice(0, 5));
      const home = getRoleShowcases(region, locale, dev);
      for (const group of selections.slice(1)) {
        expect(group.label).toBe(roles[group.id as RoleId][locale]);
        expect(group.entries).toEqual(home.find(role => role.id === group.id)!.entries.slice(0, 9));
      }
      for (const group of selections) for (const entry of group.entries) {
        const tool = tools.find(tool => tool.id === entry.id)!;
        expect(tool.regions).toContain(region);
        expect(dev || tool.status === 'published').toBe(true);
        expect(entry.title).toBe(tool.copy[locale].title);
      }
      expect(getHomepageEntries(region, undefined, undefined, dev, locale).slice(0, 4).map(entry => entry.id))
        .toEqual(['image-converter', 'image-resize-crop', 'palette-extractor', 'image-compressor']);
    }
  });

  it('never fills unconfigured picks and ignores unknown, duplicate and unavailable IDs before applying the nine-tool cap', () => {
    const fixtures = fixtureTools(12);
    expect(getNavigationEntries('cn', fixtures, true)).toEqual([]);
    const registry = [...fixtures, { ...fixtures[0], id: 'other', regions: ['global' as const] }, { ...fixtures[0], id: 'draft', status: 'draft' as const }];
    const selection = ['unknown', 'other', 'draft', ...fixtures.map(tool => tool.id), 'fixture-1'];
    expect(getNavigationEntries('cn', registry, false, 'en', selection).map(entry => entry.id)).toEqual(fixtures.slice(0, 9).map(tool => tool.id));
    expect(getNavigationEntries('cn', registry, true, 'en', selection).map(entry => entry.id)).toEqual(['draft', ...fixtures.slice(0, 8).map(tool => tool.id)]);
    expect(getToolboxGroups('cn', 'zh', false).find(group => group.id === 'composer')!.entries).toEqual([]);
    expect(getToolboxGroups('global', 'en', false).find(group => group.id === 'studio')!.entries.map(entry => entry.id)).toEqual(['pdf-merge']);
  });
});
