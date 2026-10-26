import { devOrigins, regions, type Region } from '../config/region';
import { locales, localizedPath, parseLocalePath, type Locale } from '../i18n/locale';
import { tools, getAvailableTools } from '../tools/registry';
import type { ToolDefinition } from '../tools/types';

export interface LanguageLink {
  href: string;
  hreflang: string;
  current: '中' | 'EN';
  target: '中' | 'EN';
}
export const staticPagePaths = ['/', '/tools/', '/about/', '/privacy/', '/terms/'] as const;
function availablePath(pathname: string, source: Region, target: Region, registry: readonly ToolDefinition[], dev: boolean) {
  const parsed = parseLocalePath(pathname, source);
  const normalized = parsed.path.endsWith('/') ? parsed.path : `${parsed.path}/`;
  if (parsed.valid && pathname && staticPagePaths.some(path => path === normalized)) return normalized;
  const slug = parsed.valid && /^\/tools\/([a-z0-9-]+)\/?$/.exec(parsed.path)?.[1];
  return slug && getAvailableTools(source, dev, registry).some(tool => tool.slug === slug) &&
    getAvailableTools(target, dev, registry).some(tool => tool.slug === slug) ? `/tools/${slug}/` : '/tools/';
}
/** Language stays on the current origin; availability stays with the region. */
export function languageLink(pathname: string, region: Region, registry: readonly ToolDefinition[] = tools, dev = false): LanguageLink {
  const { locale } = parseLocalePath(pathname, region);
  const target: Locale = locale === 'zh' ? 'en' : 'zh';
  return {
    href: localizedPath(availablePath(pathname, region, region, registry, dev), region, target),
    hreflang: locales[target].lang,
    current: locale === 'zh' ? '中' : 'EN', target: target === 'zh' ? '中' : 'EN',
  };
}
/** Explicit region navigation carries no query, source path or file state. */
export function regionLink(pathname: string, source: Region, registry: readonly ToolDefinition[] = tools, dev = false) {
  const target: Region = source === 'cn' ? 'global' : 'cn';
  const { locale } = parseLocalePath(pathname, source);
  const path = localizedPath(availablePath(pathname, source, target, registry, false), target, locale);
  return new URL(path, dev ? devOrigins[target] : regions[target].site).href;
}
