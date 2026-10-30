import { describe, expect, it } from 'vitest';
import { catalogLanguageHref, catalogPage, catalogQuery, emptyCatalogState, MAX_QUERY_LENGTH, pageNumbers, parseCatalogState, validJump } from '../src/site/catalog-state';
import { roles } from '../src/site/roles';
import { roleShowcases } from '../src/site/homepage-showcase';
import { getCatalogEntries } from '../src/site/catalog';
import { tools } from '../src/tools/registry';
import { fixtureTool } from './fixtures/tools';

const scope = { categories: ['images', 'development'], groups: { 'image-processing': 'images', code: 'development' } };
const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `item-${i}`, categoryId: i % 2 ? 'development' : 'images', groupId: i % 2 ? 'code' : 'image-processing', roles: [i % 3 ? 'developer' : 'painter'], search: `Tool ${i} PNG 格式 format` }));
describe('catalog state, filtering and pagination', () => {
  it.each([0, 1, 12, 13, 37, 121])('paginates %i fixture entries after filtering', n => {
    const all = entries(n), state = { ...emptyCatalogState(), page: 999 };
    const page = catalogPage(all, state);
    expect(page.total).toBe(n); expect(page.totalPages).toBe(Math.max(1, Math.ceil(n / 12)));
    expect(page.page).toBe(page.totalPages); expect(page.items).toEqual(all.slice((page.page - 1) * 12));
    expect(page.items.length).toBeLessThanOrEqual(12);
    expect(page.start).toBe(n ? (page.page - 1) * 12 + 1 : 0);
  });
  it('combines category/group, role and normalized locale search before pagination', () => {
    const all = entries(121), state = parseCatalogState('?group=image-processing&role=painter&q=ＰＮＧ%20%20格式&page=2', scope);
    const page = catalogPage(all, state);
    expect(page.total).toBe(21); expect(page.items.map(item => item.id)).toEqual(['item-72', 'item-78', 'item-84', 'item-90', 'item-96', 'item-102', 'item-108', 'item-114', 'item-120']);
    expect(catalogPage(all, { ...state, q: 'not present' }).total).toBe(0);
  });
  it('drops unknown/unsafe state, bounds keywords, and resolves parent/group conflict', () => {
    const state = parseCatalogState('?category=images&group=code&role=studio&q=%3Cscript%3E&scene=evil&redirect=https://bad.test&page=0', scope);
    expect(state).toEqual({ category: '', group: 'code', role: 'studio', q: '<script>', page: 1 });
    expect(catalogQuery(state)).toBe('?group=code&role=studio&q=%3Cscript%3E');
    for (const page of ['0', '-1', 'NaN', '1.1', 'Infinity', '99999999999999999999']) expect(parseCatalogState(`?page=${page}`, scope).page).toBe(1);
    expect(parseCatalogState('?category=constructor&group=__proto__&role=constructor', scope)).toEqual(emptyCatalogState());
    expect(parseCatalogState('?q=' + 'a'.repeat(MAX_QUERY_LENGTH + 1), scope).q).toBe('');
    expect(catalogQuery(parseCatalogState('?q=%20Hello%20%20World%20&page=1', scope))).toBe('?q=Hello+World');
    expect(catalogQuery(parseCatalogState('?page=0002', scope))).toBe('?page=2');
  });
  it('keeps first, last and neighbors, with noninteractive ellipses only for distant pages', () => {
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageNumbers(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, 3, 4, '…', 12]);
    expect(pageNumbers(12, 12)).toEqual([1, '…', 9, 10, 11, 12]);
    for (let current = 1; current <= 100; current++) {
      const nums = pageNumbers(current, 100); expect(nums).toContain(1); expect(nums).toContain(100); expect(nums).toContain(current);
      expect(nums.length).toBeLessThanOrEqual(9);
    }
    for (const value of ['', '0', '-1', '2.5', '2x', '11']) expect(validJump(value, 10)).toBeNull();
    expect(validJump(' 10 ', 10)).toBe(10);
    expect(validJump('01', 10)).toBe(1);
  });
  it.each(['cn', 'global'] as const)('keeps %s locales and Registry gates independent', region => {
    for (const locale of ['zh', 'en'] as const) {
      const published = getCatalogEntries(region, tools, false, locale);
      expect(published.map(entry => entry.id)).toEqual(['image-converter']);
      expect(getCatalogEntries(region, tools, true, locale)).toEqual(published);
      expect(published[0].roles).toEqual(['painter', 'developer', 'animator', 'operations']);
      const fixture = fixtureTool('foreign', { regions: [region === 'cn' ? 'global' : 'cn'] });
      expect(getCatalogEntries(region, [fixture], true, locale)).toEqual([]);
      const target = locale === 'en' ? '/zh/tools/' : '/en/tools/';
      const state = parseCatalogState('?role=painter&q=PNG&junk=1&page=1', scope);
      expect(catalogLanguageHref(target, state)).toBe(target + '?role=painter&q=PNG');
    }
  });
  it('shares identity order, names and actual homepage associations without editing the homepage', () => {
    expect(roleShowcases.map(role => role.id)).toEqual(Object.keys(roles));
    for (const role of roleShowcases) {
      expect(role.label.zh).toBe(roles[role.id].zh);
      for (const id of role.toolIds) expect(tools.find(tool => tool.id === id)?.roles).toContain(role.id);
    }
    expect(roleShowcases.find(role => role.id === 'operations')?.label.en).toBe('Community teams');
  });
});
