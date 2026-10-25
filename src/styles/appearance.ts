import type { Appearance } from './theme';

export const appearanceEvent = 't4f:appearance';
export function subscribeAppearance(listener: () => void) {
  window.addEventListener(appearanceEvent, listener);
  return () => window.removeEventListener(appearanceEvent, listener);
}
export function currentAppearance(): Appearance | undefined {
  return window.t4fAppearance?.get();
}
export function toggleAppearance() {
  window.t4fAppearance?.toggle();
}
