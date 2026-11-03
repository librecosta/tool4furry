import * as stylex from '@stylexjs/stylex';
import { describe, expect, it } from 'vitest';
import { tokens, neutralDarkTheme, neutralLightTheme, neutralDarkValues, neutralLightValues } from '../src/styles/tokens.stylex';
import { controls } from '../src/styles/controls';
import {
  defaultTheme,
  resolveTheme,
  resolvePageTheme,
  type ThemeSelection,
} from '../src/styles/theme';

const semantic = stylex.create({
  primary: {
    backgroundColor: { default: tokens.action, ':hover': tokens.actionHover, ':active': tokens.actionPressed, ':disabled': tokens.action },
    borderColor: 'transparent',
    color: tokens.onAction,
  },
});

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
  it('uses one Clay action family, Lavender secondary emphasis and no legacy CTA aliases', () => {
    expect(neutralLightValues).toMatchObject({ action: '#9D533D', actionHover: '#884632', actionPressed: '#753A29', onAction: '#FFFFFF', accent: '#6D5883', supportLavender: '#6D5883' });
    expect(neutralDarkValues).toMatchObject({ action: '#D49C7D', actionHover: '#E2AC8C', actionPressed: '#C58869', onAction: '#1D1F22', accent: '#C0B0D6', supportLavender: '#C0B0D6' });
    for (const values of [neutralLightValues, neutralDarkValues]) {
      for (const key of ['communityAction', 'communityActionHover', 'onCommunityAction'])
        expect(values).not.toHaveProperty(key);
    }
    expect(stylex.props(controls.primary)).toEqual(stylex.props(semantic.primary));
  });
  it('preserves independent brand, focus, neutral selections and feedback roles', () => {
    expect(neutralLightValues).toMatchObject({ brand: '#C97849', focus: '#53616E', navFocus: '#CBD5E1', actionTint: '#DDE2E7', supportClay: '#9D533D', supportAmber: '#8B5F23', supportSlate: '#456B86', danger: '#A63243', dangerHover: '#8B2738', onDanger: '#FFFFFF', positive: '#28634C', warning: '#785313', info: '#365F7A' });
    expect(neutralDarkValues).toMatchObject({ brand: '#C97849', focus: '#CBD5E1', navFocus: '#CBD5E1', actionTint: 'rgba(203,213,225,0.08)', supportClay: '#D49C7D', supportAmber: '#D6B27A', supportSlate: '#ACC7D1', danger: '#FF9BA4', dangerHover: '#FFB2B9', onDanger: '#1D1F22', positive: '#83D6AE', warning: '#E7C47C', info: '#ACC7D1' });
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
  it('separates persistent Light panels from white controls without changing Dark material or border weight', () => {
    expect(neutralLightValues.surfacePanel).toBe('#EDEFF2');
    expect(neutralLightValues.surface).toBe('#FFFFFF');
    expect(neutralLightValues.inputSurface).toBe('#FFFFFF');
    expect(neutralLightValues.controlBorderWidth).toBe('2px');
    expect(neutralDarkValues.surfacePanel).toBe(neutralDarkValues.surface);
    expect(neutralDarkValues.controlBorderWidth).toBe('2px');
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
