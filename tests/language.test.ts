import { describe, expect, it } from 'vitest';
import { languageLink } from '../src/site/language';
import { fixtureTool } from './fixtures/tools';

describe('regional language links', () => {
  it.each(['cn', 'global'] as const)('maps home/catalog and rejects unsafe or unavailable routes from %s', source => {
    const origin = source === 'cn' ? 'https://tool4furry.com' : 'https://tool4furry.cn';
    expect(languageLink('/', source).href).toBe(origin + '/');
    expect(languageLink('/tools', source).href).toBe(origin + '/tools/');
    expect(languageLink('/tools/', source).href).toBe(origin + '/tools/');
    for (const path of ['', '/preview/image-converter/', '/lab/canvas', '/404', '/unknown/',
      '/about/extra/', '/privacy/?debug=1', '/terms/#section', '//evil.test/', '/tools/../', '/tools/image-converter/'])
      expect(languageLink(path, source).href).toBe(origin + '/tools/');
    expect(languageLink('/', source).target).toBe(source === 'cn' ? 'EN' : '中');
  });
  it.each(['cn', 'global'] as const)('preserves implemented information pages from %s', source => {
    const origin = source === 'cn' ? 'https://tool4furry.com' : 'https://tool4furry.cn';
    for (const kind of ['about', 'privacy', 'terms']) {
      expect(languageLink(`/${kind}/`, source).href).toBe(`${origin}/${kind}/`);
      expect(languageLink(`/${kind}`, source).href).toBe(`${origin}/${kind}/`);
    }
  });
  it('preserves only tools actually published in the target region', () => {
    const registry = [fixtureTool('shared'), fixtureTool('cn-only', { regions: ['cn'] }), fixtureTool('draft', { status: 'draft' })];
    expect(languageLink('/tools/shared/', 'cn', registry).href).toBe('https://tool4furry.com/tools/shared/');
    expect(languageLink('/tools/cn-only/', 'cn', registry).href).toBe('https://tool4furry.com/tools/');
    expect(languageLink('/tools/cn-only/', 'global', registry).href).toBe('https://tool4furry.cn/tools/');
    expect(languageLink('/tools/draft/', 'global', registry).href).toBe('https://tool4furry.cn/tools/');
  });
  it.each(['cn', 'global'] as const)('automatically stays local and preserves drafts in DEV from %s', source => {
    const origin = source === 'cn' ? 'http://127.0.0.1:54322' : 'http://127.0.0.1:54321';
    for (const path of ['/', '/tools/', '/about/', '/privacy/', '/terms/', '/tools/image-converter/'])
      expect(languageLink(path, source, undefined, true).href).toBe(origin + path);
    for (const path of ['/lab/canvas', '/unknown/', '/preview/image-converter/'])
      expect(languageLink(path, source, undefined, true).href).toBe(origin + '/tools/');
    expect(languageLink('/tools/cn-only/', source, [fixtureTool('cn-only', { status: 'draft', regions: ['cn'] })], true).href)
      .toBe(origin + '/tools/');
  });
});
