import { devOrigins, regions, type Region } from '../config/region';
import { tools, getAvailableTools } from '../tools/registry';
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
  dev = false,
): LanguageLink {
  const target: Region = source === 'cn' ? 'global' : 'cn';
  let path = '/tools/';
  const staticPages = ['/', '/tools/', '/about/', '/privacy/', '/terms/'];
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (pathname && staticPages.includes(normalized))
    path = normalized;
  else {
    const slug = /^\/tools\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1];
    if (slug && getAvailableTools(source, dev, registry).some(tool => tool.slug === slug) &&
        getAvailableTools(target, dev, registry).some(tool => tool.slug === slug))
      path = `/tools/${slug}/`;
  }
  const origin = dev ? devOrigins[target] : regions[target].site;
  return {
    href: new URL(path, origin).href,
    hreflang: regions[target].lang,
    current: source === 'cn' ? '中' : 'EN',
    target: target === 'cn' ? '中' : 'EN',
  };
}
