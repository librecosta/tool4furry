import { v7 } from 'uuid';

export function timeOrderedUuid() {
  // An absent options argument shares uuid's state between both modes. It
  // advances the logical timestamp if the per-millisecond sequence wraps.
  return v7(undefined, new Uint8Array(16));
}
