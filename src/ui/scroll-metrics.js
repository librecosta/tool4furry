/** Document coordinates only; callers supply fresh geometry on every measurement. */
/** @param {number} scrollTop @param {number} scrollHeight @param {number} clientHeight */
export function getScrollMetrics(scrollTop, scrollHeight, clientHeight) {
  /** @param {number} value */
  const finite = (value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0;
  const distance = Math.max(0, finite(scrollHeight) - finite(clientHeight));
  const top = Math.min(finite(scrollTop), distance);
  return {
    distance,
    top,
    percent: Math.round(Math.min(1, top / Math.max(distance, 1)) * 100),
    canShow: distance > 320 && top > 72,
    stepTarget: Math.max(0, top - distance * 0.25),
  };
}
