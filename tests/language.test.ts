import { describe, expect, it } from 'vitest';
import { languageLink, regionLink, staticPagePaths } from '../src/site/language';
import { defaultLocale, localePaths, localizedPath, parseLocalePath } from '../src/i18n/locale';
import { getCatalogEntries } from '../src/site/catalog';
import { fixtureTool } from './fixtures/tools';

const registry = [fixtureTool('shared'), fixtureTool('cn-only', { regions: ['cn'] }), fixtureTool('draft', { status: 'draft' })];
describe.each(['cn', 'global'] as const)('independent locale in %s', region => {
  it('generates exactly the default and secondary static paths', () => {
    expect(localePaths(region)).toEqual([
      { params: { locale: region === 'cn' ? undefined : 'zh' }, props: { locale: 'zh' } },
      { params: { locale: region === 'global' ? undefined : 'en' }, props: { locale: 'en' } },
    ]);
  });
  it.each(['zh', 'en'] as const)('keeps %s navigation local and registry visibility regional', locale => {
    const other = locale === 'zh' ? 'en' : 'zh';
    for (const path of [...staticPagePaths, '/tools/shared/']) {
      const current = localizedPath(path, region, locale);
      const link = languageLink(current, region, registry);
      expect(link.href).toBe(localizedPath(path, region, other));
      expect(link.current).toBe(locale === 'zh' ? '中' : 'EN');
      expect(link.target).toBe(other === 'zh' ? '中' : 'EN');
      expect(parseLocalePath(current, region)).toEqual({ path, locale, valid: true });
    }
    expect(languageLink(localizedPath('/tools/draft/', region, locale), region, registry).href)
      .toBe(localizedPath('/tools/', region, other));
    expect(languageLink(localizedPath('/tools/draft/', region, locale), region, registry, true).href)
      .toBe(localizedPath('/tools/draft/', region, other));
    const entries = getCatalogEntries(region, registry, false, locale);
    expect(entries.map(entry => entry.id)).toEqual(region === 'cn' ? ['shared', 'cn-only'] : ['shared']);
    expect(entries[0].title).toBe(registry[0].copy[locale].title);
    expect(entries[0].href).toBe(localizedPath('/tools/shared/', region, locale));
  });
  it('falls back safely for unavailable and non-public paths', () => {
    const other = defaultLocale(region) === 'zh' ? 'en' : 'zh';
    for (const path of ['', '/lab/canvas', '/404', '/unknown/', '//evil.test/', '/tools/../', '/about/extra/', '/privacy/?debug=1', '/terms/#x'])
      expect(languageLink(path, region, registry, true).href).toBe(localizedPath('/tools/', region, other));
    expect(languageLink('/tools/cn-only/', 'global', registry, true).href).toBe('/zh/tools/');
  });
  it.each(['zh', 'en'] as const)('preserves %s only on explicit other-region links', locale => {
    const target = region === 'cn' ? 'global' : 'cn';
    const origin = target === 'cn' ? 'https://tool4furry.cn' : 'https://tool4furry.com';
    for (const path of [...staticPagePaths, '/tools/shared/'])
      expect(regionLink(localizedPath(path, region, locale), region, registry))
        .toBe(origin + localizedPath(path, target, locale));
    for (const path of ['/tools/draft/', '/tools/cn-only/', '/lab/ui', '/unknown/'])
      expect(regionLink(localizedPath(path, region, locale), region, registry, true))
        .toBe(`http://127.0.0.1:${target === 'cn' ? 4321 : 4322}` + localizedPath('/tools/', target, locale));
  });
});
