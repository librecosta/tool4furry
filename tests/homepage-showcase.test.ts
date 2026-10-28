import { describe, expect, it } from 'vitest';
import { getRoleShowcases, getFeaturedShowcase, roleShowcases, homepageCopy } from '../src/site/homepage-showcase';
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
      const cards = getFeaturedShowcase(navigation, locale);
      expect(navigation).toHaveLength(9);
      expect(cards.map(card => card.id)).toEqual(['fixture-8', 'fixture-1', 'fixture-2', 'fixture-3']);
      expect(cards.every(card => !card.demo)).toBe(true);
      expect(cards[0].title).toBe(list.find(tool => tool.id === 'fixture-8')!.copy[locale].title);
      expect(cards[0]).toMatchObject({ href: navigation[0].href });
    }
  });

  it.each([0, 1, 3, 4, 9])('does not fill %i production entries with examples', count => {
    const cards = getFeaturedShowcase(getHomepageEntries('cn', fixtureTools(count)), 'zh');
    expect(cards).toHaveLength(Math.min(count, 4));
    expect(cards.every(card => !card.demo)).toBe(true);
  });

  it.each(['zh', 'en'] as const)('keeps %s design examples non-interactive and uses the tool-owned short summary', locale => {
    const entries = getHomepageEntries('cn', undefined, undefined, true, locale);
    const cards = getFeaturedShowcase(entries, locale, true);
    expect(cards.map(card => card.id)).toEqual(['image-converter', 'image-crop', 'image-compress', 'color-picker']);
    expect(cards[0].description).toBe(imageConverterDefinition.copy[locale].summary);
    expect(entries[0].description).toBe(imageConverterDefinition.copy[locale].description);
    for (const card of cards.filter(card => card.demo)) expect(card).not.toHaveProperty('href');
    expect(getFeaturedShowcase(getHomepageEntries('cn'), locale)).toEqual([]);
    expect(imageConverterDefinition.status).toBe('draft');
  });
});

describe('homepage editorial role projection', () => {
  it.each(['cn', 'global'] as const)('keeps %s drafts and regions behind the existing Registry gate in both locales', region => {
    for (const locale of ['zh', 'en'] as const) {
      const production = getRoleShowcases(region, locale);
      expect(production).toHaveLength(6);
      expect(production.flatMap(role => role.entries)).toEqual([]);
      const dev = getRoleShowcases(region, locale, true);
      expect(dev.find(role => role.id === 'painter')?.entries[0].title).toBe(imageConverterDefinition.copy[locale].title);
      const expectedPrefix = (region === 'cn' ? locale === 'en' : locale === 'zh') ? `/${locale}` : '';
      expect(dev.find(role => role.id === 'painter')?.entries[0].href).toBe(`${expectedPrefix}/tools/image-converter/`);
      const otherRegion = region === 'cn' ? 'global' : 'cn';
      const list: ToolDefinition[] = [{ ...imageConverterDefinition, status: 'published', regions: [otherRegion] }];
      expect(getRoleShowcases(region, locale, true, list).flatMap(role => role.entries)).toEqual([]);
    }
    expect(imageConverterDefinition.status).toBe('draft');
  });

  it('deduplicates editorial IDs, ignores unknown/unavailable IDs, and caps each role at six', () => {
    const list = fixtureTools(9);
    const ids = ['unknown', list[3].id, list[3].id, ...list.map(tool => tool.id)];
    const roles = [{ ...roleShowcases[0], toolIds: ids }];
    const entries = getRoleShowcases('cn', 'en', false, list, roles)[0].entries;
    expect(entries.map(entry => entry.id)).toEqual([list[3].id, list[0].id, list[1].id, list[2].id, list[4].id, list[5].id]);
  });

  it('defines six bilingual roles and matching bilingual workflow structure without making tools', () => {
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
    expect(homepageCopy.zh.workflowSteps).toHaveLength(3);
    expect(homepageCopy.en.workflowSteps).toHaveLength(3);
  });
});
