import * as stylex from '@stylexjs/stylex';
import { describe, expect, it } from 'vitest';
import { tokens, neutralDarkTheme, neutralLightTheme, neutralDarkValues, neutralLightValues } from '../src/styles/tokens.stylex';
import {
  defaultTheme,
  resolveTheme,
  resolvePageTheme,
  type ThemeSelection,
} from '../src/styles/theme';

describe('static theme selection contract', () => {
  it('defaults to dark and resolves either appearance to one compiled native theme', () => {
    const theme = resolveTheme();
    expect(defaultTheme).toEqual({
      colorTheme: 'neutral',
      appearance: 'dark',
    });
    expect(theme.style).toBe(neutralDarkTheme);
    expect(stylex.props(theme.style).className).toBeTruthy();
    expect(stylex.attrs(theme.style).class).toBe(
      stylex.props(theme.style).className,
    );
    expect(tokens.page).toMatch(/^var\(--/);
    expect(tokens.colorScheme).toMatch(/^var\(--/);
    expect(resolveTheme({ ...defaultTheme }).style).toBe(theme.style);
    const light = resolveTheme({ colorTheme: 'neutral', appearance: 'light' });
    expect(light.style).toBe(neutralLightTheme);
    expect(stylex.props(light.style).className).toBeTruthy();
    expect(stylex.props(light.style).className).not.toBe(stylex.props(theme.style).className);
  });
  it('resolves complete groups with shared geometry and independent appearance colors', () => {
    expect(Object.keys(neutralLightValues).sort()).toEqual(Object.keys(neutralDarkValues).sort());
    for (const [key, value] of Object.entries(neutralDarkValues))
      if (/^(space|radius|layer|duration)/.test(key))
        expect(neutralLightValues[key as keyof typeof neutralLightValues]).toBe(value);
    expect(neutralLightValues.colorScheme).toBe('light');
    expect(neutralDarkValues.colorScheme).toBe('dark');
    for (const key of ['overlay', 'shadowSoft', 'shadowFloating', 'danger', 'positive', 'warning', 'info'] as const)
      expect(neutralLightValues[key]).not.toBe(neutralDarkValues[key]);
  });
  it('limits environment preview to DEV and rejects invalid DEV appearances', () => {
    expect(resolvePageTheme(true, 'light').style).toBe(neutralLightTheme);
    expect(resolvePageTheme(true, 'dark').style).toBe(neutralDarkTheme);
    expect(resolvePageTheme(true).style).toBe(neutralDarkTheme);
    expect(resolvePageTheme(false, 'light').style).toBe(neutralDarkTheme);
    expect(resolvePageTheme(false, 'invalid').style).toBe(neutralDarkTheme);
    expect(() => resolvePageTheme(true, 'invalid')).toThrow('T4F_DEV_APPEARANCE');
    expect(() => resolvePageTheme(true, '')).toThrow('T4F_DEV_APPEARANCE');
  });
  it('isolates the featured Light material while retaining every existing Dark panel color', () => {
    expect(neutralDarkValues.featuredBackground).toBe(neutralDarkValues.surfaceFloating);
    expect(neutralDarkValues.featuredHover).toBe(neutralDarkValues.surfaceHover);
    expect(neutralDarkValues.featuredSelected).toBe(neutralDarkValues.surfaceMuted);
    expect(neutralDarkValues.featuredAccent).toBe(neutralDarkValues.textPrimary);
    expect(neutralLightValues.featuredBackground).toBe('#F0F1F2');
    expect(neutralLightValues.featuredHover).toBe('#E5E7E9');
    expect(neutralLightValues.featuredSelected).toBe('#DDE0E3');
    expect(neutralLightValues.featuredAccent).toBe('#394149');
    expect(neutralLightValues.surfaceFloating).toBe('#FFFFFF');
    expect(neutralLightValues.navBackground).toBe('#30343A');
    expect(neutralLightValues.page).toBe('#F8F9FA');
  });
  it('rejects unimplemented combinations rather than inventing a theme fallback', () => {
    expect(() => resolveTheme({ colorTheme: 'sea-mist', appearance: 'dark' } as unknown as ThemeSelection)).toThrow(RangeError);
    expect(() =>
      resolveTheme({
        colorTheme: 'neutral',
        appearance: 'system',
      } as unknown as ThemeSelection),
    ).toThrow(RangeError);
    expect(() =>
      resolveTheme({
        colorTheme: 'other',
        appearance: 'dark',
      } as unknown as ThemeSelection),
    ).toThrow(RangeError);
  });
});
