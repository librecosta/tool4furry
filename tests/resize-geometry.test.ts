import { describe, expect, it } from 'vitest';
import {
  aspects,
  constrainCrop,
  fitAspect,
  fromPercent,
  fullCrop,
  outputForCrop,
  parseDimension,
  scaleCrop,
  toPercent,
} from '../src/tools/image-resize-crop/geometry';
import { mobileImageLimits as limits } from '../src/tools/image/limits';

const source = { width: 1200, height: 800 };
describe('oriented source pixel crop contract', () => {
  it('starts full and clamps free crops using one nearest-pixel policy', () => {
    expect(fullCrop(source)).toEqual({ x: 0, y: 0, ...source });
    const withMetadata = { ...source, file: 'not geometry', info: {} };
    expect(Object.keys(fullCrop(withMetadata)).sort()).toEqual([
      'height',
      'width',
      'x',
      'y',
    ]);
    expect(
      constrainCrop({ x: -20.3, y: 795, width: 300.5, height: 100 }, source),
    ).toEqual({ x: 0, y: 700, width: 301, height: 100 });
    expect(
      constrainCrop({ x: 2000, y: 0, width: 2000, height: 2000 }, source),
    ).toEqual(fullCrop(source));
  });
  it.each(Object.values(aspects).filter((value) => value !== undefined))(
    'preserves center and bounds at ratio %s',
    (ratio) => {
      const crop = fitAspect(
        { x: 100, y: 200, width: 600, height: 400 },
        ratio!,
        source,
      );
      expect(Math.abs(crop.x + crop.width / 2 - 400)).toBeLessThanOrEqual(1);
      expect(Math.abs(crop.y + crop.height / 2 - 400)).toBeLessThanOrEqual(1);
      expect(crop.x + crop.width).toBeLessThanOrEqual(source.width);
      expect(crop.y + crop.height).toBeLessThanOrEqual(source.height);
      expect(Math.abs(crop.width - crop.height * ratio!)).toBeLessThanOrEqual(
        1,
      );
    },
  );
  it('projects through percentages independently of responsive media size', () => {
    const crop = { x: 121, y: 87, width: 601, height: 399 };
    const percent = toPercent(crop, source);
    for (const viewportWidth of [320, 740, 1200]) {
      expect((percent.width / 100) * viewportWidth).toBeCloseTo(
        (crop.width / source.width) * viewportWidth,
      );
      expect(fromPercent(percent, source)).toEqual(crop);
    }
    let result = crop;
    for (let i = 0; i < 100; i++)
      result = fromPercent(toPercent(result, source), source);
    expect(result).toEqual(crop);
  });
  it('does not progressively shrink when switching aspect ratios repeatedly', () => {
    let crop = fitAspect(fullCrop(source), 1, source);
    for (let i = 0; i < 50; i++) {
      crop = fitAspect(crop, 16 / 9, source);
      crop = fitAspect(crop, 1, source);
    }
    expect(crop).toEqual({ x: 200, y: 0, width: 800, height: 800 });
  });
  it('follows natural size or the explicit width without cumulative scaling', () => {
    const crop = { x: 0, y: 0, width: 600, height: 400 };
    expect(outputForCrop(crop, undefined, limits)).toEqual({
      width: 600,
      height: 400,
    });
    expect(outputForCrop(crop, 300, limits)).toEqual({
      width: 300,
      height: 200,
    });
    expect(scaleCrop(crop, '25', limits)).toEqual({ width: 150, height: 100 });
    expect(scaleCrop(crop, '25', limits)).toEqual({ width: 150, height: 100 });
  });
  it.each([
    '',
    '-',
    '0',
    '-2',
    '1.5',
    '1e3',
    'NaN',
    'Infinity',
    '1x',
    '9007199254740992',
  ])('rejects invalid submitted integer %j', (value) =>
    expect(() => parseDimension(value)).toThrow(),
  );
  it.each(['0', '-1', '1e2', '0.001', '99999999'])(
    'rejects invalid/subpixel/over-budget scaling %j',
    (value) =>
      expect(() => scaleCrop(fullCrop(source), value, limits)).toThrow(),
  );
  it.each([NaN, Infinity, 0, -1, 100000, 0.000001])(
    'rejects unrepresentable ratios %s',
    (ratio) =>
      expect(() => fitAspect(fullCrop(source), ratio, source)).toThrow(),
  );
  it('rejects nonfinite, empty and budget-breaking geometry without silently resizing', () => {
    expect(() =>
      constrainCrop({ x: NaN, y: 0, width: 1, height: 1 }, source),
    ).toThrow();
    expect(() =>
      constrainCrop({ x: 0, y: 0, width: 0, height: 1 }, source),
    ).toThrow();
    expect(() =>
      outputForCrop({ x: 0, y: 0, width: 1, height: 800 }, 100, limits),
    ).toThrow();
  });
});
