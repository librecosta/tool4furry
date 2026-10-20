import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Read the source palette: importing defineVars would return compiled CSS var names.
const source = readFileSync('src/styles/tokens.stylex.ts', 'utf8');
const colors = Object.fromEntries(
  [...source.matchAll(/(\w+):\s*'(#[\da-f]{6})'/gi)].map((match) => [
    match[1],
    match[2],
  ]),
);
function luminance(name: string) {
  const color = colors[name];
  if (!color) throw new Error(`Missing opaque color token: ${name}`);
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(foreground: string, background: string) {
  const levels = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

it('keeps normal-size text and action/feedback labels above AA contrast', () => {
  for (const background of [
    'page', 'workspace', 'surface', 'surfaceMuted', 'actionTint',
  ])
    for (const foreground of ['textPrimary', 'textSecondary'])
      expect(
        contrast(foreground, background),
        `${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
  for (const fill of [
    'action',
    'actionHover',
    'actionPressed',
    'danger',
    'dangerHover',
  ])
    expect(
      contrast('onAction', fill),
      `onAction on ${fill}`,
    ).toBeGreaterThanOrEqual(4.5);
  for (const status of ['positive', 'warning', 'info', 'danger'])
    for (const background of ['page', 'surface', 'surfaceMuted'])
      expect(
        contrast(status, background),
        `${status} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5);
  expect(contrast('action', 'actionTint')).toBeGreaterThanOrEqual(4.5);
});
it('keeps field boundaries and focus rings identifiable on their surfaces', () => {
  for (const background of ['surface', 'surfaceMuted'])
    expect(contrast('controlBorder', background)).toBeGreaterThanOrEqual(3);
  for (const background of [
    'page', 'workspace', 'surface', 'surfaceMuted', 'actionTint',
  ])
    expect(
      contrast('focus', background),
      `focus on ${background}`,
    ).toBeGreaterThanOrEqual(3);
});
