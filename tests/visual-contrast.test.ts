import { describe, expect, it } from 'vitest';
import { neutralDarkValues, neutralLightValues } from '../src/styles/tokens.stylex';

type Color = readonly [number, number, number, number];
function parse(value: string): Color {
  if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))
    return [1, 3, 5, 7].map((offset) => offset === 7
      ? (value.length === 9 ? parseInt(value.slice(offset), 16) / 255 : 1)
      : parseInt(value.slice(offset, offset + 2), 16)) as unknown as Color;
  const match = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const channels = match[1].split(',').map(Number);
  if (channels.length === 3) channels.push(1);
  if (channels.length !== 4 || channels.some((channel) => !Number.isFinite(channel)))
    throw new Error(`Invalid color: ${value}`);
  return channels as unknown as Color;
}
function over(foreground: Color, background: Color): Color {
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  return [0, 1, 2].map((index) => (
    foreground[index] * foreground[3] + background[index] * background[3] * (1 - foreground[3])
  ) / alpha).concat(alpha) as unknown as Color;
}
function luminance(color: Color) {
  const channels = color.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(foreground: Color, background: Color) {
  const levels = [luminance(over(foreground, background)), luminance(background)].sort((a, b) => b - a);
  return (levels[0] + 0.05) / (levels[1] + 0.05);
}

it('composites alpha in sRGB before calculating luminance, rather than treating rgba as opaque', () => {
  expect(over(parse('rgba(229,231,235,0.14)'), parse('#1D1F22')).slice(0, 3).map(Math.round)).toEqual([57, 59, 62]);
  expect(contrast(parse('rgba(255,255,255,0.5)'), parse('#000000'))).toBeCloseTo(5.28, 2);
  expect(() => parse('not-a-color')).toThrow();
});

describe.each([
  ['dark', neutralDarkValues],
  ['light', neutralLightValues],
] as const)('%s theme contrast', (_appearance, colors) => {
  const color = (key: keyof typeof colors) => parse(colors[key]);
  // Actual painter order: cards/settings on page or workspace; portals have an
  // opaque material; selected/hover/input states are composited on those hosts.
  const page = color('page'), workspace = color('workspace');
  const hosts = {
    page, workspace,
    surface: over(color('surface'), page),
    settings: over(color('surface'), workspace),
    muted: over(color('surfaceMuted'), page),
    floating: color('surfaceFloating'),
    navigation: over(color('navBackground'), page),
  };
  const backgrounds = Object.entries(hosts).flatMap(([name, background]) => [
    [name, background],
    [`${name}/input`, over(color('inputSurface'), background)],
  ] as const);
  backgrounds.push(['card hover', over(color('surfaceHover'), page)]);
  backgrounds.push(['dropzone selected', over(color('actionTint'), page)]);
  const modeRail = over(color('inputSurface'), hosts.settings);
  backgrounds.push(['mode rail', modeRail]);

  it('keeps text, links, selected labels and feedback above AA on their real layers', () => {
    for (const [name, background] of backgrounds)
      for (const foreground of ['textPrimary', 'textSecondary', 'accent'] as const)
        expect(contrast(color(foreground), background), `${foreground} on ${name}`).toBeGreaterThanOrEqual(4.5);
    for (const [name, background] of Object.entries(hosts))
      for (const status of ['positive', 'warning', 'info', 'danger'] as const)
        expect(contrast(color(status), background), `${status} on ${name}`).toBeGreaterThanOrEqual(4.5);
    // Selected menu/format/button labels use accent or primary, never muted copy.
    for (const [name, background] of Object.entries(hosts))
      for (const foreground of ['textPrimary', 'accent'] as const)
        expect(contrast(color(foreground), over(color('actionTint'), background)), `${foreground} on ${name}/selected`).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps filled action and destructive labels above AA after fill and text alpha', () => {
    for (const [name, background] of Object.entries(hosts)) {
      for (const fill of ['action', 'actionHover', 'actionPressed'] as const)
        expect(contrast(color('onAction'), over(color(fill), background)), `onAction on ${name}/${fill}`).toBeGreaterThanOrEqual(4.5);
      for (const fill of ['danger', 'dangerHover'] as const)
        expect(contrast(color('onDanger'), over(color(fill), background)), `onDanger on ${name}/${fill}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps input/select boundaries, focus, selected outlines and progress identifiable', () => {
    for (const [name, background] of backgrounds)
      for (const foreground of ['controlBorder', 'focus', 'accent'] as const)
        expect(contrast(color(foreground), background), `${foreground} on ${name}`).toBeGreaterThanOrEqual(3);
    // Nested button/format and popup hover use primary text, not muted copy.
    for (const host of [hosts.settings, hosts.floating, hosts.navigation, modeRail]) {
      const hover = over(color('surfaceHover'), host);
      expect(contrast(color('textPrimary'), hover)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color('focus'), hover)).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(color('controlBorder'), over(color('surfaceHover'), hosts.settings))).toBeGreaterThanOrEqual(3);
    expect(contrast(color('accent'), over(color('borderStrong'), hosts.settings))).toBeGreaterThanOrEqual(3);
    for (const background of [hosts.settings, hosts.floating])
      expect(contrast(color('accent'), over(color('actionTint'), background))).toBeGreaterThanOrEqual(3);
  });
  it('keeps supporting labels readable independently of feedback roles', () => {
    for (const [name, background] of Object.entries(hosts))
      for (const foreground of ['supportClay', 'supportAmber', 'supportLavender', 'supportSlate'] as const)
        expect(contrast(color(foreground), background), `${foreground} on ${name}`).toBeGreaterThanOrEqual(4.5);
  });
  it('checks featured-panel text/focus and all copy on the new Light materials', () => {
    const panel = color('featuredBackground');
    expect(contrast(color('textSecondary'), panel)).toBeGreaterThanOrEqual(4.5);
    for (const background of [panel, over(color('featuredHover'), panel), over(color('featuredSelected'), panel)]) {
      for (const foreground of ['textPrimary', 'featuredAccent'] as const)
        expect(contrast(color(foreground), background), foreground).toBeGreaterThanOrEqual(4.5);
      // #7 freezes Dark's existing alpha hover and secondary text. Enforce AA
      // for all text on the newly introduced Light materials without changing it.
      if (_appearance === 'light')
        expect(contrast(color('textSecondary'), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color('focus'), background)).toBeGreaterThanOrEqual(3);
    }
  });
});
