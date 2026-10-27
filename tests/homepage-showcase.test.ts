import { describe, expect, it } from 'vitest';
import { getRoleShowcases, roleShowcases, homepageCopy } from '../src/site/homepage-showcase';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import { fixtureTools } from './fixtures/tools';
import type { ToolDefinition } from '../src/tools/types';

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
    expect(roleShowcases.map(role => role.id)).toEqual(['painter', 'composer', 'developer', 'animator', 'operations', 'finance']);
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
