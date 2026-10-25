import { neutralDarkTheme, neutralLightTheme } from './tokens.stylex';

export type ColorTheme = 'neutral';
export type Appearance = 'light' | 'dark';

export type ThemeSelection = Readonly<{
  colorTheme: ColorTheme;
  appearance: Appearance;
}>;
export const defaultTheme: ThemeSelection = {
  colorTheme: 'neutral',
  appearance: 'dark',
};

/** Static selection contract. Register only implemented, complete combinations. */
export function resolveTheme(selection: ThemeSelection = defaultTheme) {
  if (
    selection.colorTheme !== 'neutral' ||
    (selection.appearance !== 'dark' && selection.appearance !== 'light')
  )
    throw new RangeError('Unsupported theme selection');
  return {
    ...selection,
    style: selection.appearance === 'light' ? neutralLightTheme : neutralDarkTheme,
  };
}

/** Server-rendered DEV preview only; production always keeps the default. */
export function resolvePageTheme(dev: boolean, appearance?: string) {
  if (!dev || appearance === undefined) return resolveTheme();
  if (appearance !== 'light' && appearance !== 'dark')
    throw new RangeError('Invalid T4F_DEV_APPEARANCE: expected light or dark');
  return resolveTheme({ colorTheme: 'neutral', appearance });
}
