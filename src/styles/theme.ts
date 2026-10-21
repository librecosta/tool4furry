import { seaMistDarkTheme } from './tokens.stylex';

export type ThemeSelection = Readonly<{
  colorTheme: 'sea-mist';
  appearance: 'dark';
}>;
export const defaultTheme: ThemeSelection = {
  colorTheme: 'sea-mist',
  appearance: 'dark',
};

/** Static selection contract. Register only implemented, complete combinations. */
export function resolveTheme(selection: ThemeSelection = defaultTheme) {
  if (selection.colorTheme !== 'sea-mist' || selection.appearance !== 'dark')
    throw new RangeError('Unsupported theme selection');
  return { ...selection, style: seaMistDarkTheme };
}
