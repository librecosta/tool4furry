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
    expect(languageLink('/tools/cn-only/', 'global', registry).href).toBe('https://tool4furry.cn/tools/cn-only/');
    expect(languageLink('/tools/draft/', 'global', registry).href).toBe('https://tool4furry.cn/tools/');
  });
  it('allows an explicit local counterpart for DEV, using the same safe path mapping', () => {
    expect(languageLink('/preview/image-converter/', 'cn', [], 'http://127.0.0.1:54322').href).toBe('http://127.0.0.1:54322/tools/');
    for (const origin of ['https://evil.test', 'javascript:alert(1)', 'http://localhost/path', 'http://user@localhost', 'http://localhost/?lang=en'])
      expect(() => languageLink('/', 'cn', [], origin)).toThrow();
  });
});
