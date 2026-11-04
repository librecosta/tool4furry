import { readFileSync } from 'node:fs';
import { compile } from 'sass-embedded';
import { describe, expect, it } from 'vitest';

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
    expect(faces).toHaveLength(6);
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
    const global = compile('src/styles/global.scss').css;
    const stack = global.match(/--t4f-font-sans:\s*([^;]+)/)?.[1].replace(/['"\s]/g, '');
    expect(stack).toMatch(/^DMSansVariable,T4FDMSansFallback,NotoSansSCVariable,T4FNotoSCFallback,/);
  });
});
