import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  candidates,
  eligiblePixels,
  modes,
  normalizeHex,
  selectPalette,
  samplePoint,
  foreground,
} from '../src/tools/palette-extractor/palette';
import {
  contain,
  templateLayout,
  templates,
  titleLines,
} from '../src/tools/palette-extractor/render';
import {
  tools,
  getAvailableTools,
  getPublishedTools,
} from '../src/tools/registry';
import { getToolPageContent } from '../src/site/tool-content';

class Pixels {
  colorSpace = 'srgb';
  height: number;
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    height?: number,
  ) {
    this.height = height ?? data.length / width / 4;
  }
}
beforeEach(() => vi.stubGlobal('ImageData', Pixels));
function image(colors: number[][]) {
  return new Pixels(
    new Uint8ClampedArray(colors.flat()),
    colors.length,
    1,
  ) as ImageData;
}
const rgba = (hex: string, alpha = 255) => [
  ...[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  alpha,
];

describe('bounded representative colors', () => {
  it('keeps pure white and single colors without padding duplicates', () => {
    for (const color of ['FFFFFF', 'EEEDE0', 'D0D0D0', 'BC4587']) {
      const pool = candidates(
        image(Array.from({ length: 100 }, () => rgba(color))),
      );
      for (const mode of modes)
        expect(selectPalette(pool, mode, 10)).toEqual(['#' + color]);
    }
  });
  it('rejects hidden RGB in fully transparent pixels before invoking quantization', () => {
    expect(() =>
      candidates(image([rgba('FF0000', 0), rgba('0000FF', 0)])),
    ).toThrow('transparent');
    expect([
      ...eligiblePixels(image([rgba('FF0000', 0), rgba('FFFFFF', 255)])),
    ]).toEqual(rgba('FFFFFF'));
  });
  it('filters antialiasing but recovers visible translucent-only content', () => {
    expect([
      ...eligiblePixels(image([rgba('FF0000', 191), rgba('FFFFFF')])),
    ]).toEqual(rgba('FFFFFF'));
    expect(
      selectPalette(
        candidates(image([rgba('A0B0C0', 80), rgba('FF0000', 0)])),
        'balanced',
        6,
      ),
    ).toEqual(['#A0B0C0']);
    expect(
      selectPalette(candidates(image([rgba('FF0000', 1)])), 'balanced', 3),
    ).toEqual(['#FF0000']);
  });
  it('is deterministic and differentiates mode preferences without fabricating colors', () => {
    const input = image(
      [
        '1B1828',
        'FFFFF0',
        '999DA1',
        'FC3344',
        '365D7A',
        'C69BB2',
        '8B234C',
        'BEDCCD',
      ].flatMap((hex) => Array.from({ length: 400 }, () => rgba(hex))),
    );
    const pool = candidates(input);
    const selections = modes.map((mode) => selectPalette(pool, mode, 3));
    for (let i = 0; i < modes.length; i++) {
      expect(selections[i]).toEqual(
        selectPalette(candidates(input), modes[i], 3),
      );
      expect(new Set(selections[i]).size).toBe(selections[i].length);
      expect(
        selections[i].every((hex) => pool.some((c) => c.hex === hex)),
      ).toBe(true);
    }
    expect(
      new Set(selections.map((colors) => colors.join())).size,
    ).toBeGreaterThanOrEqual(4);
  });
  it('keeps small bright noise from displacing a mostly dark image', () => {
    const pool = candidates(
      image([
        ...Array.from({ length: 999 }, () => rgba('151515')),
        rgba('FF0000'),
      ]),
    );
    expect(selectPalette(pool, 'colorful', 6)).toEqual(['#151515']);
  });
  it('handles few-color pixel art and enforces analysis bounds', () => {
    expect(
      selectPalette(
        candidates(image([rgba('000000'), rgba('FFFFFF'), rgba('AA4455')])),
        'balanced',
        10,
      ),
    ).toHaveLength(3);
    expect(() =>
      eligiblePixels({
        width: 641,
        height: 640,
        data: new Uint8ClampedArray(),
      }),
    ).toThrow('analysis');
    expect(() => selectPalette([], 'balanced', 11)).toThrow('settings');
  });
});

describe('editing and contain-based sampling', () => {
  it('validates complete HEX submissions only', () => {
    expect(normalizeHex('#aBc')).toBe('#AABBCC');
    expect(normalizeHex('abc123')).toBe('#ABC123');
    for (const value of ['#', '#ab', '#abcdef00', '#gggggg', 'red'])
      expect(normalizeHex(value)).toBeUndefined();
  });
  it('ignores letterboxes, boundaries and transparent image pixels', () => {
    const data = image([rgba('FF0000'), rgba('AABBCC', 0)]);
    expect(
      samplePoint(data, 10, 10, { width: 200, height: 200 }),
    ).toBeUndefined();
    expect(samplePoint(data, 10, 75, { width: 200, height: 200 })?.hex).toBe(
      '#FF0000',
    );
    expect(
      samplePoint(data, 150, 75, { width: 200, height: 200 }),
    ).toBeUndefined();
    expect(
      samplePoint(data, 200, 75, { width: 200, height: 200 }),
    ).toBeUndefined();
  });
  it('uses the higher contrast black/white foreground', () => {
    expect(foreground('#FFFFFF')).toBe('#000000');
    expect(foreground('#000000')).toBe('#FFFFFF');
  });
});

describe('three share template geometries', () => {
  it.each(Object.keys(templates) as (keyof typeof templates)[])(
    '%s fits 1/6/10 colors and contain artwork',
    (template) => {
      for (const count of [1, 6, 10]) {
        const layout = templateLayout(template, count);
        expect([layout.width, layout.height]).toEqual(templates[template]);
        for (const r of layout.colors) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y + r.h).toBeLessThanOrEqual(layout.height);
          expect(r.x + r.w).toBeLessThanOrEqual(layout.width + 0.001);
          expect(r.h).toBeGreaterThan(44);
        }
        for (const size of [
          { width: 2000, height: 500 },
          { width: 500, height: 2000 },
          { width: 800, height: 800 },
        ]) {
          const r = contain(size, layout.image);
          expect(r.w / r.h).toBeCloseTo(size.width / size.height);
          expect(r.x).toBeGreaterThanOrEqual(layout.image.x);
          expect(r.y).toBeGreaterThanOrEqual(layout.image.y);
          expect(r.w).toBeLessThanOrEqual(layout.image.w + 0.001);
          expect(r.h).toBeLessThanOrEqual(layout.image.h + 0.001);
        }
      }
    },
  );
  it('measures and truncates Chinese, English and Emoji without splitting graphemes', () => {
    const ctx = {
      measureText: (text: string) => ({
        width:
          [
            ...new Intl.Segmenter(undefined, {
              granularity: 'grapheme',
            }).segment(text),
          ].length * 20,
      }),
    };
    for (const title of [
      '作品配色与灵感'.repeat(10),
      'Character study '.repeat(10),
      '🎨🐺👨‍👩‍👧‍👦'.repeat(20),
    ]) {
      const lines = titleLines(
        ctx as unknown as CanvasRenderingContext2D,
        title,
        200,
      );
      expect(lines.length).toBeLessThanOrEqual(2);
      expect(lines.every((line) => ctx.measureText(line).width <= 200)).toBe(
        true,
      );
      expect(lines.at(-1)).toContain('…');
    }
  });
});

it('registers a bilingual DEV-only draft without changing the two published tools', () => {
  const tool = tools.find((t) => t.id === 'palette-extractor')!;
  expect(tool.status).toBe('draft');
  for (const region of ['cn', 'global'] as const) {
    expect(getPublishedTools(region).map((t) => t.id)).toEqual([
      'image-converter',
      'image-resize-crop',
    ]);
    expect(getAvailableTools(region, true)).toContain(tool);
    for (const locale of ['zh', 'en'] as const) {
      const content = getToolPageContent(tool, region, undefined, true, locale);
      expect(content.steps?.length).toBe(3);
      expect(content.faq?.length).toBe(4);
    }
  }
});
