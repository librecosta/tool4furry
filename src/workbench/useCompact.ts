import { useSyncExternalStore } from 'react';
// Interaction semantics only: SCSS media queries own all responsive geometry.
// The SSR/hydration snapshot is closed and nonmodal; no parameter content is
// moved or remounted when this store first updates or crosses the breakpoint.
const query = '(max-width: 900px)';
function subscribe(notify: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
export function useCompact() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
