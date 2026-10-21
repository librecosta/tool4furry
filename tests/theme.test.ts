import * as stylex from '@stylexjs/stylex';
import { describe, expect, it } from 'vitest';
import { tokens, seaMistDarkTheme } from '../src/styles/tokens.stylex';
import {
  defaultTheme,
  resolveTheme,
  type ThemeSelection,
} from '../src/styles/theme';

describe('static theme selection contract', () => {
  it('resolves only the implemented color/appearance pair to one compiled native theme', () => {
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
  });
  it('rejects unimplemented combinations rather than inventing a theme fallback', () => {
    expect(() =>
      resolveTheme({
        colorTheme: 'sea-mist',
        appearance: 'light',
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
