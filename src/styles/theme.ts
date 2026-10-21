import { seaMistDarkTheme, seaMistLightTheme } from './tokens.stylex';

export type ColorTheme = 'sea-mist';
export type Appearance = 'light' | 'dark';

export type ThemeSelection = Readonly<{
  colorTheme: ColorTheme;
  appearance: Appearance;
}>;
export const defaultTheme: ThemeSelection = {
  colorTheme: 'sea-mist',
  appearance: 'dark',
};

/** Static selection contract. Register only implemented, complete combinations. */
export function resolveTheme(selection: ThemeSelection = defaultTheme) {
  if (
    selection.colorTheme !== 'sea-mist' ||
    (selection.appearance !== 'dark' && selection.appearance !== 'light')
  )
    throw new RangeError('Unsupported theme selection');
  return {
    ...selection,
    style: selection.appearance === 'light' ? seaMistLightTheme : seaMistDarkTheme,
  };
}

/** Server-rendered DEV preview only; production always keeps the default. */
export function resolvePageTheme(dev: boolean, appearance?: string) {
  if (!dev || appearance === undefined) return resolveTheme();
  if (appearance !== 'light' && appearance !== 'dark')
    throw new RangeError('Invalid T4F_DEV_APPEARANCE: expected light or dark');
  return resolveTheme({ colorTheme: 'sea-mist', appearance });
}
