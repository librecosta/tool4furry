import { describe, expect, it } from 'vitest';
import { getRoleShowcases, getFeaturedShowcase, roleShowcases, homepageCopy, homepageStories } from '../src/site/homepage-showcase';
import { getHomepageEntries } from '../src/site/catalog';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import { fixtureTools } from './fixtures/tools';
import type { ToolDefinition } from '../src/tools/types';

describe('four-slot featured presentation', () => {
  it.each(['cn', 'global'] as const)('preserves %s editorial order and locale without reducing the navigation limit', region => {
    const list = [
      { ...imageConverterDefinition, regions: [region] },
      ...fixtureTools(12),
      { ...fixtureTools(1)[0], id: 'other-region', regions: [region === 'cn' ? 'global' : 'cn'] },
    ] satisfies ToolDefinition[];
    for (const locale of ['zh', 'en'] as const) {
      const navigation = getHomepageEntries(region, list, ['missing', 'other-region', 'fixture-8', 'fixture-8'], false, locale);
      const cards = getFeaturedShowcase(navigation);
      expect(navigation).toHaveLength(9);
      expect(cards.map(card => card.id)).toEqual(['fixture-8', 'image-converter', 'fixture-1', 'fixture-2']);
      expect(cards[0].title).toBe(list.find(tool => tool.id === 'fixture-8')!.copy[locale].title);
      expect(cards[0]).toMatchObject({ href: navigation[0].href });
    }
  });

  it.each([0, 1, 3, 4, 9])('does not fill %i entries with examples', count => {
    const cards = getFeaturedShowcase(getHomepageEntries('cn', fixtureTools(count)));
    expect(cards).toHaveLength(Math.min(count, 4));
  });

  it.each(['cn', 'global'] as const)('shows only the real Published tool in %s DEV and production in either locale', region => {
    for (const locale of ['zh', 'en'] as const) {
      const entries = getHomepageEntries(region, undefined, undefined, true, locale);
      const cards = getFeaturedShowcase(entries);
      expect(cards.map(card => card.id)).toEqual(['image-converter']);
      expect(cards[0].description).toBe(imageConverterDefinition.copy[locale].summary);
      expect(entries[0].description).toBe(imageConverterDefinition.copy[locale].description);
      expect(cards[0].href).toBe(entries[0].href);
      expect(getFeaturedShowcase(getHomepageEntries(region, undefined, undefined, false, locale))).toEqual(cards);
    }
    expect(imageConverterDefinition.status).toBe('published');
  });
});

describe('homepage editorial role projection', () => {
  it.each(['cn', 'global'] as const)('keeps %s drafts and regions behind the existing Registry gate in both locales', region => {
    for (const locale of ['zh', 'en'] as const) {
      const production = getRoleShowcases(region, locale);
      expect(production).toHaveLength(6);
      expect(production.filter(role => role.entries.length).map(role => role.id)).toEqual(['painter', 'developer', 'animator', 'operations']);
      expect(production.flatMap(role => role.entries).every(entry => entry.id === 'image-converter')).toBe(true);
      const dev = getRoleShowcases(region, locale, true);
      expect(dev).toEqual(production);
      expect(getRoleShowcases(region, locale, false, [{ ...imageConverterDefinition, status: 'draft' }]).flatMap(role => role.entries)).toEqual([]);
      expect(dev.find(role => role.id === 'painter')?.entries[0].title).toBe(imageConverterDefinition.copy[locale].title);
      const expectedPrefix = (region === 'cn' ? locale === 'en' : locale === 'zh') ? `/${locale}` : '';
      expect(dev.find(role => role.id === 'painter')?.entries[0].href).toBe(`${expectedPrefix}/tools/image-converter/`);
      const otherRegion = region === 'cn' ? 'global' : 'cn';
      const list: ToolDefinition[] = [{ ...imageConverterDefinition, status: 'published', regions: [otherRegion] }];
      expect(getRoleShowcases(region, locale, true, list).flatMap(role => role.entries)).toEqual([]);
    }
    expect(imageConverterDefinition.status).toBe('published');
  });

  it('deduplicates editorial IDs, ignores unknown/unavailable IDs, and caps each role at twelve', () => {
    const list = fixtureTools(15);
    const ids = ['unknown', list[3].id, list[3].id, ...list.map(tool => tool.id)];
    const roles = [{ ...roleShowcases[0], toolIds: ids }];
    const entries = getRoleShowcases('cn', 'en', false, list, roles)[0].entries;
    expect(entries.map(entry => entry.id)).toEqual(['fixture-4', 'fixture-1', 'fixture-2', 'fixture-3', 'fixture-5', 'fixture-6', 'fixture-7', 'fixture-8', 'fixture-9', 'fixture-10', 'fixture-11', 'fixture-12']);
  });

  it.each([0, 1, 12])('renders only %i manually selected tools without filling slots or assigning matching categories', count => {
    const list = fixtureTools(13);
    const roles = [{ ...roleShowcases[0], toolIds: list.slice(0, count).map(tool => tool.id) }];
    expect(getRoleShowcases('cn', 'zh', true, list, roles)[0].entries.map(entry => entry.id)).toEqual(roles[0].toolIds);
  });

  it('defines six bilingual roles and two localized editorial stories without making tools', () => {
    expect(roleShowcases.map(role => role.id)).toEqual(['painter', 'composer', 'developer', 'animator', 'operations', 'studio']);
    expect(roleShowcases.slice(3).map(role => ({ label: role.label, description: role.description }))).toEqual([
      { label: { zh: '动画师', en: 'Animators' }, description: { zh: '每一帧都值得打磨', en: 'Every frame deserves care.' } },
      { label: { zh: '运营', en: 'Community teams' }, description: { zh: '为内容与社群增添色彩', en: 'Bring more color to content and communities.' } },
      { label: { zh: '工作室', en: 'Studios' }, description: { zh: '工作细节决定成败', en: 'Details make the difference.' } },
    ]);
    for (const role of roleShowcases) {
      expect(role.label.zh).toBeTruthy();
      expect(role.label.en).toBeTruthy();
      expect(role.description.en).toBeTruthy();
    }
    expect(Object.keys(homepageCopy.zh)).toEqual(Object.keys(homepageCopy.en));
    for (const locale of ['zh', 'en'] as const) {
      expect(homepageStories[locale].map(story => story.id)).toEqual(['feedback', 'collaboration']);
      expect(homepageStories[locale].map(story => story.link.href)).toEqual(['https://github.com/librecosta/tool4furry/issues', 'mailto:contact@librecosta.com']);
    }
  });
});
