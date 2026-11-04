/// <reference types="astro/client" />
/// <reference types="@webgpu/types" />
interface Window {
  t4fAppearance?: {
    get(): import('./styles/theme').Appearance;
    toggle(button?: HTMLButtonElement): void;
  };
}
