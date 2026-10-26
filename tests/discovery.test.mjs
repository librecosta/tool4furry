import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { regions } from '../src/config/region';
import { publicPages, robotsText, sitemapIndex, sitemapXML, securityText, llmsText } from '../src/site/discovery';
import { fixtureTool } from './fixtures/tools';

const registry = [
  fixtureTool('shared'), fixtureTool('cn-only', { regions: ['cn'] }),
  fixtureTool('global-only', { regions: ['global'] }), fixtureTool('draft', { status: 'draft' }),
];
const parseXML = (text) => new JSDOM(text, { contentType: 'application/xml' }).window.document;

describe.each(['cn', 'global'])('%s discovery', region => {
  it('indexes both actual locales and only regional published tools', () => {
    const pages = publicPages(region, registry);
    const origin = regions[region].site;
    const secondary = region === 'cn' ? 'en' : 'zh';
    const local = region === 'cn' ? 'cn-only' : 'global-only';
    const expected = ['', `${secondary}/`].flatMap(prefix =>
      ['', 'tools/', 'about/', 'privacy/', 'terms/', 'tools/shared/', `tools/${local}/`]
        .map(path => `${origin}/${prefix}${path}`));
    expect(new Set(pages.map(page => page.url))).toEqual(new Set(expected));
    expect(pages).toHaveLength(14);
    for (const page of pages) {
      expect(page.label.trim()).not.toBe('');
      expect(page.alternates.map(link => link.lang)).toEqual(['zh-CN', 'en']);
      for (const alternate of page.alternates)
        expect(pages.find(other => other.url === alternate.url)?.alternates).toEqual(page.alternates);
    }
    const changed = registry.map(tool => tool.id === 'shared' ? { ...tool, status: 'draft' } : tool);
    expect(publicPages(region, changed).map(page => page.url)).not.toContain(`${origin}/tools/shared/`);
    expect(publicPages(region).some(page => page.url.includes('image-converter'))).toBe(false);
  });
  it('generates parseable Sitemap XML and reciprocal local alternates without invented dates', () => {
    const index = parseXML(sitemapIndex(region));
    expect(index.documentElement.localName).toBe('sitemapindex');
    expect(index.querySelector('loc')?.textContent).toBe(`${regions[region].site}/sitemap-0.xml`);
    const map = parseXML(sitemapXML(region, registry));
    expect(map.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect([...map.querySelectorAll('url > loc')].map(node => node.textContent))
      .toEqual(publicPages(region, registry).map(page => page.url));
    expect(map.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')).toHaveLength(28);
    expect(map.querySelector('lastmod')).toBeNull();
    expect(robotsText(region)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${regions[region].site}/sitemap-index.xml\n`);
  });
  it('uses a single RFC 9116 contact template and a build-relative UTC expiry', () => {
    const text = securityText(region, new Date('2026-01-01T00:00:00Z'));
    expect(text).toBe(`Contact: mailto:contact@librecosta.com\nExpires: 2026-06-30T00:00:00.000Z\nPreferred-Languages: zh, en\nCanonical: ${regions[region].site}/.well-known/security.txt\n`);
    expect(securityText(region, new Date('2026-01-02T00:00:00Z'))).toContain('2026-07-01T00:00:00.000Z');
    expect(text).not.toMatch(/Policy:|Encryption:|Acknowledgments:|Hiring:/);
  });
  it('provides only real local content links in the optional Markdown index', () => {
    const text = llmsText(region, registry);
    expect(text).toContain('## 简体中文');
    expect(text).toContain('## English');
    const urls = [...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
    expect(urls).toEqual(publicPages(region, registry).map(page => page.url));
    expect(text).not.toMatch(/\/lab\/|\/preview\/|\/404|\/docs\/|\/blog\/|\/tools\/draft\/|undefined/);
  });
});
