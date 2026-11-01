import { desktopImageLimits } from '../src/tools/image/limits';
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
  shareLayout,
  ratios,
  visibleColors,
  hexFont,
  drawShare,
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

describe('compact image and color-strip geometry', () => {
  const shapes = [{width: 1600, height: 900}, {width: 900, height: 1600}, {width: 800, height: 800}];
  it('partitions every direction/ratio/count without gaps and keeps readable HEX inside every cell', () => {
    const ctx = {font: '', measureText(text: string) { return {width: text.length * Number(this.font.match(/([0-9]+)px/)?.[1]) * .65}; }} as CanvasRenderingContext2D;
    for (const direction of ['top', 'bottom', 'left', 'right'] as const) for (const ratio of ['original', ...Object.keys(ratios)] as const) for (const source of shapes) for (let count = 1; count <= 10; count++) {
      const options = {...shareDefaults(), direction, ratio: ratio as ReturnType<typeof shareDefaults>['ratio']};
      const layout = shareLayout(source, count, options);
      if (options.ratio !== 'original') expect([layout.width, layout.height]).toEqual(ratios[options.ratio]);
      else expect(layout.image.w / layout.image.h).toBeCloseTo(source.width / source.height, 2);
      expect(layout.image.w * layout.image.h + layout.strip.w * layout.strip.h).toBe(layout.width * layout.height);
      expect(layout.colors).toHaveLength(count);
      expect(layout.image.x === 0 || layout.strip.x === 0).toBe(true);
      for (const cell of layout.colors) {
        expect(cell.x).toBeGreaterThanOrEqual(0); expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x + cell.w).toBeLessThanOrEqual(layout.width + .001);
        expect(cell.y + cell.h).toBeLessThanOrEqual(layout.height + .001);
        ctx.font = `${hexFont(ctx, '#AABBCC', cell)}px sans-serif`;
        expect(Number(ctx.font.match(/([0-9]+)px/)?.[1])).toBeGreaterThanOrEqual(18);
        expect(ctx.measureText('#AABBCC').width).toBeLessThanOrEqual(cell.w - 16);
      }
      expect(layout.colors.reduce((sum, cell) => sum + cell.w * cell.h, 0)).toBeCloseTo(layout.strip.w * layout.strip.h);
      const framed = cover(source, layout.image, {zoom: 3, x: 999, y: -999});
      expect(framed.x).toBeLessThanOrEqual(layout.image.x + .001);
      expect(framed.y).toBeLessThanOrEqual(layout.image.y + .001);
      expect(framed.x + framed.w).toBeGreaterThanOrEqual(layout.image.x + layout.image.w - .001);
      expect(framed.y + framed.h).toBeGreaterThanOrEqual(layout.image.y + layout.image.h - .001);
    }
  });
  it('has exact touching boundaries, full original image, bounded dimensions and no obsolete content', () => {
    const source = {width: 1600, height: 900};
    const top = shareLayout(source, 6, shareDefaults());
    expect(top.image).toEqual({x: 0, y: 0, w: 1600, h: 900});
    expect(top.strip.y).toBe(top.image.h);
    expect(shareLayout(source, 6, {...shareDefaults(), direction: 'bottom'}).image.y).toBe(top.strip.h);
    const left = shareLayout(source, 6, {...shareDefaults(), direction: 'left'});
    expect(left.strip.x).toBe(left.image.w);
    expect(Object.keys(shareDefaults()).sort()).toEqual(['count', 'direction', 'frame', 'ratio']);
    expect(visibleColors(Array(10).fill('#FFFFFF'), {...shareDefaults(), count: 1})).toHaveLength(1);
    expect(visibleColors(['#FFFFFF'], shareDefaults())).toHaveLength(1);
    expect(() => shareLayout({width: 10000, height: 1}, 10, shareDefaults())).toThrow('share-layout');
    expect(() => shareLayout(source, 6, shareDefaults(), {...desktopImageLimits, pixels: 100})).toThrow('share-layout');
    expect(() => shareLayout(source, 0, shareDefaults())).toThrow('share-layout');
    expect(() => hexFont({font: '', measureText: () => ({width: 200})} as unknown as CanvasRenderingContext2D, '#123456', {x: 0, y: 0, w: 40, h: 30})).toThrow('share-layout');
    const ctx = {save: vi.fn(), restore: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(), measureText: () => ({width: 80})} as unknown as CanvasRenderingContext2D;
    drawShare(ctx, source as HTMLCanvasElement, ['#112233'], shareDefaults());
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, 1600, 900);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1600, top.height);
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ctx.fillText).mock.calls[0][0]).toBe('#112233');
    const next = zoomFraming(source, top.image, {zoom: 2, x: .1, y: .1}, 3);
    expect(next.x).toBeCloseTo(.15); expect(next.y).toBeCloseTo(.15);
    expect(constrainFraming(source, top.image, {zoom: 9, x: 999, y: 999}).zoom).toBe(4);
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
