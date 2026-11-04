// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { compile } from 'sass-embedded';
import { describe, expect, it } from 'vitest';
import { locales } from '../src/i18n/locale';

describe('font delivery and local fallback metrics', () => {
  it('preloads the same Latin variable font imported by Fontsource, without eager Chinese subsets', () => {
    const layout = readFileSync('src/layouts/SiteLayout.astro', 'utf8');
    const css = readFileSync('node_modules/@fontsource-variable/dm-sans/wght.css', 'utf8');
    expect(layout).toContain("import '@fontsource-variable/dm-sans/wght.css'");
    expect(layout).toContain("import '@fontsource-variable/noto-sans-sc/wght.css'");
    const asset = layout.match(/dm-sans\/files\/([^'?]+)\?url'/)?.[1];
    expect(asset).toBe('dm-sans-latin-wght-normal.woff2');
    expect(css).toContain(`./files/${asset}`);
    expect(layout.match(/rel="preload" as="font"/g)).toHaveLength(1);
    expect(layout).toContain('href={dmSansLatin} crossorigin="anonymous"');
    expect(layout).not.toContain('document.fonts.ready');
  });

  it('keeps fallback fonts local and preserves the target vertical metrics after size adjustment', () => {
    const css = compile('src/styles/font-fallbacks.scss').css;
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, value]) => value);
    expect(faces).toHaveLength(12);
    for (const face of faces) {
      expect(face).toContain('src: local(');
      expect(face).not.toMatch(/url\(|font-display:/);
      expect(face).toContain('line-gap-override: 0%');
      expect(face).toContain('unicode-range:');
      const size = Number(face.match(/size-adjust:\s*([\d.]+)%/)?.[1]) / 100;
      const ascent = Number(face.match(/ascent-override:\s*([\d.]+)%/)?.[1]) * size;
      const descent = Number(face.match(/descent-override:\s*([\d.]+)%/)?.[1]) * size;
      const chinese = face.includes('Noto SC');
      expect(Math.abs(ascent - (chinese ? 116 : 99.2))).toBeLessThan(0.02);
      expect(Math.abs(descent - (chinese ? 28.8 : 31))).toBeLessThan(0.02);
    }
    const mixedBody = faces.find(face => face.includes('DM Mixed') && /font-weight: 400;/.test(face));
    const englishBody = faces.find(face => face.includes('DM Sans') && /font-weight: 400;/.test(face));
    expect(mixedBody).toContain('src: local("Calibri")');
    expect(mixedBody).toContain('font-feature-settings: "pnum"');
    expect(mixedBody).toContain('size-adjust: 115%');
    expect(englishBody).toContain('src: local("Segoe UI")');
    const brandFaces = faces.filter(face => /font-weight: 700;/.test(face) && face.includes('DM'));
    expect(brandFaces).toHaveLength(2);
    for (const face of brandFaces) {
      expect(face).toContain('src: local("Segoe UI Bold")');
      expect(face).toContain('size-adjust: 103.34%');
    }
    expect(faces.find(face => /font-weight: 650;/.test(face))).toContain('Segoe UI Semibold');
    const global = compile('src/styles/global.scss').css;
    const stack = global.match(/--t4f-font-sans:\s*([^;]+)/)?.[1].replace(/['"\s]/g, '');
    expect(stack).toMatch(/^DMSansVariable,var\(--t4f-font-latin-fallback\),NotoSansSCVariable,T4FNotoSCFallback,/);
    const selector = global.match(/(html[^{}]+)\{\s*--t4f-font-latin-fallback:\s*['"]T4F DM Mixed Fallback['"]/)?.[1].trim();
    expect(selector).toBeDefined();
    for (const [locale, { lang }] of Object.entries(locales)) {
      const root = document.implementation.createHTMLDocument().documentElement;
      root.setAttribute('lang', lang);
      expect(root.matches(selector!)).toBe(locale === 'zh');
    }
  });
});
