import { regions, type Region } from '../config/region';
import { tools, getPublishedTools } from '../tools/registry';
import type { ToolDefinition } from '../tools/types';

export interface LanguageLink {
  href: string;
  hreflang: string;
  current: '中' | 'EN';
  target: '中' | 'EN';
}

/** Route availability, not string substitution; no query/hash crosses regions. */
export function languageLink(
  pathname: string,
  source: Region,
  registry: readonly ToolDefinition[] = tools,
  devOrigin?: string,
): LanguageLink {
  const target: Region = source === 'cn' ? 'global' : 'cn';
  let path = '/tools/';
  const staticPages = ['/', '/tools/', '/about/', '/privacy/', '/terms/'];
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (pathname && staticPages.includes(normalized))
    path = normalized;
  else {
    const slug = /^\/tools\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1];
    if (slug && getPublishedTools(target, registry).some(tool => tool.slug === slug))
      path = `/tools/${slug}/`;
  }
  let origin: string = regions[target].site;
  if (devOrigin !== undefined) {
    const url = new URL(devOrigin);
    if (!['http:', 'https:'].includes(url.protocol) ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash)
      throw new RangeError('T4F_DEV_LANGUAGE_ORIGIN must be a local preview origin');
    origin = url.origin;
  }
  return {
    href: new URL(path, origin).href,
    hreflang: regions[target].lang,
    current: source === 'cn' ? '中' : 'EN',
    target: target === 'cn' ? '中' : 'EN',
  };
}
