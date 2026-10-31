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
  cover,
  constrainFraming,
  zoomFraming,
  shareDefaults,
  swatchGeometry,
  informationLayout,
  visibleColors,
  localDate,
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
import { locateColors, markerPixels } from '../src/tools/palette-extractor/markers';

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
  it('locates deterministic visible representative pixels without changing palette colors', () => {
    const data = image([rgba('FF0000', 0), rgba('FF0000', 120), rgba('F02020'), rgba('FFFFFF')]);
    const colors = [{ id: 'red', hex: '#EF2020' }, { id: 'white', hex: '#FFFFFF' }];
    const located = locateColors(data, colors);
    expect(located.map(c => c.hex)).toEqual(colors.map(c => c.hex));
    expect(located.map(c => c.point)).toEqual([{ x: 2, y: 0 }, { x: 3, y: 0 }]);
    expect(locateColors(data, colors)).toEqual(located);
    expect(locateColors(image([rgba('FF0000', 0)]), colors).every(c => !c.point)).toBe(true);
    expect(locateColors(image([rgba('112233', 80)]), colors)[0].point).toEqual({ x: 0, y: 0 });
    const large = { width: 1600, height: 1600, data: new Uint8ClampedArray(1600 * 1600 * 4).fill(255) } as ImageData;
    expect(markerPixels(large).length).toBeLessThanOrEqual(65536);
    const duplicates = locateColors(large, [{ id: 'a', hex: '#FFFFFF' }, { id: 'b', hex: '#FFFFFF' }]);
    expect(duplicates[0].point).not.toEqual(duplicates[1].point);
  });
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
    '%s fits 1/6/10 colors and covers the artwork region without gaps',
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
          const r = cover(size, layout.image, {zoom: 1, x: 0, y: 0});
          expect(r.w / r.h).toBeCloseTo(size.width / size.height);
          expect(r.x).toBeLessThanOrEqual(layout.image.x + .001);
          expect(r.y).toBeLessThanOrEqual(layout.image.y + .001);
          expect(r.x + r.w).toBeGreaterThanOrEqual(layout.image.x + layout.image.w - .001);
          expect(r.y + r.h).toBeGreaterThanOrEqual(layout.image.y + layout.image.h - .001);
        }
      }
    },
  );
  it('constrains extreme pan/zoom, preserves the center on zoom and keeps all swatch combinations bounded', () => {
    const source = {width: 1600, height: 900};
    for (const template of Object.keys(templates) as (keyof typeof templates)[]) {
      const box = templateLayout(template, 6).image;
      const frame = constrainFraming(source, box, {zoom: 9, x: 999, y: -999});
      expect(frame.zoom).toBe(4);
      const r = cover(source, box, frame);
      expect(r.x).toBeLessThanOrEqual(box.x + .001);
      expect(r.y).toBeLessThanOrEqual(box.y + .001);
      expect(r.x + r.w).toBeGreaterThanOrEqual(box.x + box.w - .001);
      expect(r.y + r.h).toBeGreaterThanOrEqual(box.y + box.h - .001);
      const next = zoomFraming(source, box, {zoom: 2, x: .1, y: .1}, 3);
      expect(next.x).toBeCloseTo(.15); expect(next.y).toBeCloseTo(.15);
      for (let count = 1; count <= 10; count++) for (const shape of ['square', 'rounded', 'circle'] as const) for (const labels of ['inside', 'outside', 'hidden'] as const) for (const arrangement of ['equal', 'spaced', 'cards', 'band'] as const) for (const spacing of ['compact', 'standard', 'relaxed'] as const) {
        const options = shareDefaults(); options.template = template; options.swatches = {...options.swatches, shape, labels, arrangement, spacing};
        const layout = templateLayout(template, count, options.swatches);
        for (const rect of layout.colors) {
          const {block, labelY} = swatchGeometry(rect, options);
          expect(block.w).toBeGreaterThan(0); expect(block.h).toBeGreaterThan(0);
          expect(block.x).toBeGreaterThanOrEqual(rect.x); expect(block.y).toBeGreaterThanOrEqual(rect.y);
          expect(block.x + block.w).toBeLessThanOrEqual(rect.x + rect.w + .001);
          expect(block.y + block.h).toBeLessThanOrEqual(rect.y + rect.h + .001);
          if (labels === 'outside') expect(labelY).toBeLessThan(rect.y + rect.h);
          if (shape === 'circle') expect(block.w).toBe(block.h);
        }
      }
    }
    const options = shareDefaults(); options.swatches.limit = '5';
    expect(visibleColors(['#FFFFFF'], options)).toHaveLength(1);
    expect(visibleColors(Array(10).fill('#FFFFFF'), options)).toHaveLength(5);
    expect(localDate(new Date(2026, 0, 2, 23))).toBe('2026-01-02');
  });
  it('keeps all nine-grid collisions inside the information area without overlapping text', () => {
    const ctx = {font: '', measureText: (text: string) => ({width: Array.from(text).length * 20})};
    for (const template of Object.keys(templates) as (keyof typeof templates)[]) {
      const options = shareDefaults(); options.template = template; options.title = '创作 🐺 Character palette '.repeat(5); options.showDate = true;
      const box = templateLayout(template, 10).info;
      for (let title = 0; title < 9; title++) for (let brand = 0; brand < 9; brand++) for (let date = 0; date < 9; date++) {
        options.positions = {title, brand, date} as typeof options.positions;
        const items = informationLayout(ctx as CanvasRenderingContext2D, options, box);
        for (const item of items) {
          expect(item.y).toBeGreaterThanOrEqual(box.y - .001);
          expect(item.y + item.h).toBeLessThanOrEqual(box.y + box.h + .001);
          for (const other of items.filter(other => other !== item)) expect(item.x + item.w <= other.x + .001 || other.x + other.w <= item.x + .001 || item.y + item.h <= other.y + .001 || other.y + other.h <= item.y + .001).toBe(true);
        }
      }
    }
  });
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
