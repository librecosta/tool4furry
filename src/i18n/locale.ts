import { regions, type Region } from '../config/region';

export type Locale = 'zh' | 'en';
export const locales = { zh: { lang: 'zh-CN' }, en: { lang: 'en' } } as const;
export const defaultLocale = (region: Region): Locale => regions[region].defaultLocale;

/** One optional prefix, with no duplicate path for the region's default locale. */
export function localePaths(region: Region) {
  return (Object.keys(locales) as Locale[]).map(locale => ({
    params: { locale: locale === defaultLocale(region) ? undefined : locale },
    props: { locale },
  }));
}
export function localizedPath(path: string, region: Region, locale: Locale) {
  return path.startsWith('/') && !path.startsWith('//') && locale !== defaultLocale(region)
    ? `/${locale}${path}` : path;
}
export function parseLocalePath(path: string, region: Region) {
  const prefix = /^\/(zh|en)(?=\/|$)/.exec(path);
  const locale = (prefix?.[1] as Locale | undefined) ?? defaultLocale(region);
  return {
    locale,
    path: prefix ? path.slice(prefix[0].length) || '/' : path,
    valid: !prefix || locale !== defaultLocale(region),
  };
}
