/// <reference types="astro/client" />
declare module 'virtual:stylex:css-only';
interface Window {
  t4fAppearance?: {
    get(): import('./styles/theme').Appearance;
    toggle(): void;
  };
}
