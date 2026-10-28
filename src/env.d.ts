/// <reference types="astro/client" />
/// <reference types="@webgpu/types" />
declare module 'virtual:stylex:css-only';
interface Window {
  t4fAppearance?: {
    get(): import('./styles/theme').Appearance;
    toggle(button?: HTMLButtonElement): void;
  };
}
