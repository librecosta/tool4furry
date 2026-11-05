/** jsdom has no text layout. State/lifecycle tests use empty Range geometry;
 * real selection, scrolling and viewport behavior are checked in Chromium. */
export function editorDOM() {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  });
}
