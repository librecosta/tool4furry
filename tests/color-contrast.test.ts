import { expect, it } from 'vitest';
import { colorValues, contrast, parseColor, suggestContrast, type RGB } from '../src/tools/color-contrast/core';

it.each<[string, RGB]>([
  ['#aBc', [170, 187, 204]],
  [' #3583d2 ', [53, 131, 210]],
  ['rgb(53, 131, 210)', [53, 131, 210]],
  ['RGB(53 131 210)', [53, 131, 210]],
  ['rgb(0%, 50%, 100%)', [0, 128, 255]],
  ['rgb(0% 128 100%)', [0, 128, 255]],
  ['hsl(210.2, 63.6%, 51.6%)', [53, 131, 210]],
  ['hsl(210deg 64% 52%)', [54, 133, 211]],
  ['hsl(-120 100% 50%)', [0, 0, 255]],
  ['hsl(480deg 100% 50%)', [0, 255, 0]],
  ['hsl(1.5turn 100% 50%)', [0, 255, 255]],
  ['hsl(200grad 100% 50%)', [0, 255, 255]],
  ['hsl(3.141592653589793rad 100% 50%)', [0, 255, 255]],
])('parses %s as the expected opaque sRGB bytes', (input, expected) => {
  expect(parseColor(input)).toEqual(expected);
  for (const output of Object.values(colorValues(expected))) {
    expect(parseColor(output)).toEqual(expected);
  }
});

it.each([
  '', 'red', '#abcd', '#11223344', 'rgb(1 2 3 / 1)', 'rgba(1,2,3,1)', 'hsl(1 2% 3% / 1)',
  'rgb(1%, 2, 3%)', 'rgb(1, 2 3, 4)', 'rgb(-1 0 0)', 'rgb(0 0 256)', 'rgb(0 101% 0)',
  'rgb(calc(1) 2 3)', 'rgb(1.2.3 4 5)', 'rgb(1e999 0 0)',
  'hsl(80% 50% 50%)', 'hsl(80 50 50%)', 'hsl(80 -1% 50%)', 'hsl(80 50% 101%)',
  'color(display-p3 1 0 0)',
])('rejects unsupported or invalid color %j', input => {
  expect(() => parseColor(input)).toThrow();
});

it('keeps exact WCAG ratios and is symmetric', () => {
  const black = parseColor('#000'), white = parseColor('#fff');
  expect(contrast(black, white)).toBe(21);
  expect(contrast(white, white)).toBe(1);
  expect(contrast(white, black)).toBe(contrast(black, white));
  expect(contrast(parseColor('#3583D2'), parseColor('#383131'))).toBeCloseTo(3.23, 2);
});

it('verifies one-sided suggestions against the quantized RGB and handles unreachable targets', () => {
  const blue = parseColor('#3583D2'), brown = parseColor('#383131');
  for (const [adjusted, fixed] of [[blue, brown], [brown, blue]]) {
    const suggestion = suggestContrast(adjusted, fixed, 4.5);
    expect(suggestion).toBeDefined();
    const recomputed = contrast(parseColor(suggestion!.hex), fixed);
    expect(recomputed).toBeGreaterThanOrEqual(4.5);
    expect(suggestion!.ratio).toBe(recomputed);
  }
  expect(suggestContrast(parseColor('#888'), parseColor('#777'), 7)).toBeUndefined();
  expect(suggestContrast(parseColor('#fff'), parseColor('#000'), 7)).toBeUndefined();
});

it('checks both feasible directions and chooses the nearest qualifying lightness', () => {
  const original = parseColor('#888');
  const fixed = parseColor('#777');
  const lighter = suggestContrast(original, fixed, 3)!;
  const darker = suggestContrast(parseColor('#666'), fixed, 3)!;
  expect(lighter.hex).toBe('#D4D4D4');
  expect(darker.hex).toBe('#2E2E2E');
  expect(contrast(parseColor('#D3D3D3'), fixed)).toBeLessThan(3);
  expect(contrast(parseColor('#2F2F2F'), fixed)).toBeLessThan(3);
});
