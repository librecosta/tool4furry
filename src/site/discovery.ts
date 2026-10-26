import { regions, type Region } from '../config/region';
import { locales, localizedPath, type Locale } from '../i18n/locale';
import { messages } from '../i18n/messages';
import { getPublishedTools, tools } from '../tools/registry';
import type { ToolDefinition } from '../tools/types';
import { staticPagePaths } from './language';

// Astro/build only. The route list and Registry remain the sources of truth.
export function publicPages(region: Region, registry: readonly ToolDefinition[] = tools) {
  const published = getPublishedTools(region, registry);
  return (Object.keys(locales) as Locale[]).flatMap(locale => {
    const t = messages[locale];
    const labels = [t.home, t.tools, t.about, t.privacy, t.terms];
    const entries = [
      ...staticPagePaths.map((path, index) => ({ path, label: labels[index] })),
      ...published.map(tool => ({ path: `/tools/${tool.slug}/`, label: tool.copy[locale].title })),
    ];
    return entries.map(entry => ({
      locale,
      label: entry.label,
      url: new URL(localizedPath(entry.path, region, locale), regions[region].site).href,
      alternates: (Object.keys(locales) as Locale[]).map(other => ({
        lang: locales[other].lang,
        url: new URL(localizedPath(entry.path, region, other), regions[region].site).href,
      })),
    }));
  });
}
const xml = (value: string) => value.replace(/[<>&"']/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[character]!);
const declaration = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function robotsText(region: Region) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${regions[region].site}/sitemap-index.xml\n`;
}
export function sitemapIndex(region: Region) {
  return declaration + `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${xml(regions[region].site)}/sitemap-0.xml</loc></sitemap></sitemapindex>\n`;
}
export function sitemapXML(region: Region, registry: readonly ToolDefinition[] = tools) {
  const entries = publicPages(region, registry).map(page =>
    `<url><loc>${xml(page.url)}</loc>${page.alternates.map(alternate =>
      `<xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${xml(alternate.url)}"/>`,
    ).join('')}</url>`,
  ).join('\n');
  return declaration + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}
export function securityText(region: Region, now = new Date()) {
  const expires = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
  return `Contact: mailto:contact@librecosta.com\nExpires: ${expires}\nPreferred-Languages: zh, en\nCanonical: ${regions[region].site}/.well-known/security.txt\n`;
}
export function llmsText(region: Region, registry: readonly ToolDefinition[] = tools) {
  const pages = publicPages(region, registry);
  const sections = (Object.keys(locales) as Locale[]).map(locale =>
    `## ${locale === 'zh' ? '简体中文' : 'English'}\n\n` + pages.filter(page => page.locale === locale)
      .map(page => `- [${page.label.replace(/[\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ')}](${page.url})`).join('\n'),
  );
  return '# Tool4Furry\n\n> Browser-based tools for furry creators. The catalog lists currently published tools.\n\n' + sections.join('\n\n') + '\n';
}
