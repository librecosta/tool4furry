import { describe, expect, it } from 'vitest';
import { seaMistDarkValues, seaMistLightValues } from '../src/styles/tokens.stylex';

// These are the same complete value tables passed to native createTheme.
function luminance(colors: Record<string, string>, name: string) {
  const color = colors[name];
  if (!color) throw new Error(`Missing opaque color token: ${name}`);
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(colors: Record<string, string>, foreground: string, background: string) {
  const levels = [luminance(colors, foreground), luminance(colors, background)].sort(
    (a, b) => b - a,
  );
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

describe.each([
  ['dark', seaMistDarkValues],
  ['light', seaMistLightValues],
] as const)('%s theme contrast', (_appearance, colors) => {
  it('keeps normal-size text and action/feedback labels above AA contrast', () => {
    for (const background of [
      'page', 'workspace', 'surface', 'surfaceMuted', 'actionTint',
    ])
      for (const foreground of ['textPrimary', 'textSecondary'])
        expect(
          contrast(colors, foreground, background),
          `${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
    for (const fill of [
      'action',
      'actionHover',
      'actionPressed',
    ])
      expect(
        contrast(colors, 'onAction', fill),
        `onAction on ${fill}`,
      ).toBeGreaterThanOrEqual(4.5);
    for (const fill of ['danger', 'dangerHover'])
      expect(contrast(colors, 'onDanger', fill), `onDanger on ${fill}`).toBeGreaterThanOrEqual(4.5);
    for (const status of ['positive', 'warning', 'info', 'danger'])
      for (const background of ['page', 'surface', 'surfaceMuted'])
        expect(
          contrast(colors, status, background),
          `${status} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors, 'action', 'actionTint')).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps field boundaries and focus rings identifiable on their surfaces', () => {
    for (const background of ['page', 'workspace', 'surface', 'surfaceMuted', 'actionTint'])
      expect(contrast(colors, 'controlBorder', background), `controlBorder on ${background}`).toBeGreaterThanOrEqual(3);
    for (const background of [
      'page', 'workspace', 'surface', 'surfaceMuted', 'actionTint',
    ])
      expect(
        contrast(colors, 'focus', background),
        `focus on ${background}`,
      ).toBeGreaterThanOrEqual(3);
  });
  it('supports small supporting-color labels on the main surfaces, independent of feedback roles', () => {
    for (const foreground of ['supportClay', 'supportAmber', 'supportLavender', 'supportSlate'])
      for (const background of ['page', 'workspace', 'surface', 'surfaceMuted'])
        expect(contrast(colors, foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
  });
});
