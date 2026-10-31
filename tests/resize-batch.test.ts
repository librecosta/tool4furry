import { describe, expect, it } from 'vitest';
import { batchSize, initialBatch } from '../src/tools/image-resize-crop/batch';
import { desktopImageLimits as limits } from '../src/tools/image/limits';

describe('batch dimensions from each oriented original', () => {
  it.each([
    ['width', '300', { width: 300, height: 200 }],
    ['height', '300', { width: 450, height: 300 }],
    ['longest', '300', { width: 300, height: 200 }],
    ['percent', '25', { width: 300, height: 200 }],
  ] as const)(
    '%s preserves aspect with nearest-pixel rounding',
    (rule, value, expected) => {
      expect(
        batchSize(
          { width: 1200, height: 800 },
          { ...initialBatch(), rule, value },
          limits,
        ),
      ).toEqual(expected);
    },
  );
  it('uses portrait dimensions independently and only caps upscale when requested', () => {
    const settings = { ...initialBatch(), value: '1000' };
    expect(batchSize({ width: 80, height: 120 }, settings, limits)).toEqual({
      width: 80,
      height: 120,
    });
    expect(
      batchSize(
        { width: 80, height: 120 },
        { ...settings, noUpscale: false },
        limits,
      ),
    ).toEqual({ width: 667, height: 1000 });
  });
  it('keeps tiny and extreme aspect outputs at least one pixel', () => {
    expect(
      batchSize(
        { width: 10000, height: 1 },
        { ...initialBatch(), value: '1' },
        limits,
      ),
    ).toEqual({ width: 1, height: 1 });
    expect(
      batchSize(
        { width: 1, height: 1 },
        { ...initialBatch(), rule: 'percent', value: '0.01' },
        limits,
      ),
    ).toEqual({ width: 1, height: 1 });
  });
  it.each(['0', '-1', '1.5', 'abc', '10001', '99999999999999999999'])(
    'rejects invalid pixel request %s rather than capping to budget',
    (value) => {
      expect(() =>
        batchSize(
          { width: 1200, height: 800 },
          { ...initialBatch(), value },
          limits,
        ),
      ).toThrow();
    },
  );
  it.each(['0', '-1', 'NaN', '1.001', '1000001'])(
    'rejects invalid percentage %s',
    (value) => {
      expect(() =>
        batchSize(
          { width: 1200, height: 800 },
          { ...initialBatch(), rule: 'percent', value },
          limits,
        ),
      ).toThrow();
    },
  );
  it('rejects over-budget area without substituting a smaller output', () => {
    expect(() =>
      batchSize(
        { width: 100, height: 100 },
        { ...initialBatch(), value: '9000', noUpscale: false },
        limits,
      ),
    ).toThrow();
  });
});
