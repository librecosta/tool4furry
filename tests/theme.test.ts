import * as stylex from '@stylexjs/stylex';
import { describe, expect, it } from 'vitest';
import { tokens, seaMistDarkTheme, seaMistLightTheme, seaMistDarkValues, seaMistLightValues } from '../src/styles/tokens.stylex';
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
      colorTheme: 'sea-mist',
      appearance: 'dark',
    });
    expect(theme.style).toBe(seaMistDarkTheme);
    expect(stylex.props(theme.style).className).toBeTruthy();
    expect(stylex.attrs(theme.style).class).toBe(
      stylex.props(theme.style).className,
    );
    expect(tokens.page).toMatch(/^var\(--/);
    expect(tokens.colorScheme).toMatch(/^var\(--/);
    expect(resolveTheme({ ...defaultTheme }).style).toBe(theme.style);
    const light = resolveTheme({ colorTheme: 'sea-mist', appearance: 'light' });
    expect(light.style).toBe(seaMistLightTheme);
    expect(stylex.props(light.style).className).toBeTruthy();
    expect(stylex.props(light.style).className).not.toBe(stylex.props(theme.style).className);
  });
  it('resolves complete groups with shared geometry and independent appearance colors', () => {
    expect(Object.keys(seaMistLightValues).sort()).toEqual(Object.keys(seaMistDarkValues).sort());
    for (const [key, value] of Object.entries(seaMistDarkValues))
      if (/^(space|radius|layer|duration)/.test(key))
        expect(seaMistLightValues[key as keyof typeof seaMistLightValues]).toBe(value);
    expect(seaMistLightValues.colorScheme).toBe('light');
    expect(seaMistDarkValues.colorScheme).toBe('dark');
    for (const key of ['overlay', 'shadowSoft', 'shadowFloating', 'danger', 'positive', 'warning', 'info'] as const)
      expect(seaMistLightValues[key]).not.toBe(seaMistDarkValues[key]);
  });
  it('limits environment preview to DEV and rejects invalid DEV appearances', () => {
    expect(resolvePageTheme(true, 'light').style).toBe(seaMistLightTheme);
    expect(resolvePageTheme(true, 'dark').style).toBe(seaMistDarkTheme);
    expect(resolvePageTheme(true).style).toBe(seaMistDarkTheme);
    expect(resolvePageTheme(false, 'light').style).toBe(seaMistDarkTheme);
    expect(resolvePageTheme(false, 'invalid').style).toBe(seaMistDarkTheme);
    expect(() => resolvePageTheme(true, 'invalid')).toThrow('T4F_DEV_APPEARANCE');
    expect(() => resolvePageTheme(true, '')).toThrow('T4F_DEV_APPEARANCE');
  });
  it('rejects unimplemented combinations rather than inventing a theme fallback', () => {
    expect(() =>
      resolveTheme({
        colorTheme: 'sea-mist',
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
