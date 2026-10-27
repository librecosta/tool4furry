export type FrameMetrics = { frames: number; draws: number; samples: number; mean: number | null; p95: number | null; fps: number | null; drawFps: number | null; drawMean: number | null; drawP95: number | null };
function average(values: readonly number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function percentile(values: readonly number[]) { return values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1] : null; }
export function summarize(intervals: readonly number[], durations: readonly number[], drawIntervals: readonly number[], frames: number, draws: number): FrameMetrics {
  const mean = average(intervals), drawInterval = average(drawIntervals);
  return { frames, draws, samples: intervals.length, mean, p95: percentile(intervals), fps: mean ? 1000 / mean : null, drawFps: drawInterval ? 1000 / drawInterval : null, drawMean: average(durations), drawP95: percentile(durations) };
}
const scheduler = {
  request: (fn: FrameRequestCallback) => requestAnimationFrame(fn),
  cancel: (id: number) => cancelAnimationFrame(id),
  now: () => performance.now(),
};
// One RAF owner. Real elapsed time drives the surface, redraws are capped.
// Paused time is excluded; RAF callbacks and actual drawing are measured apart.
export function createSceneLoop(draw: (dt: number, elapsed: number) => void, report: (metrics: FrameMetrics) => void, options: { maxFps: () => number; scheduler?: typeof scheduler }) {
  const clock = options.scheduler ?? scheduler;
  let raf: number | null = null, running = false, disposed = false;
  let last: number | null = null, lastDraw: number | null = null, due = 0, elapsed = 0, frames = 0, draws = 0, reported = 0;
  const intervals: number[] = [], durations: number[] = [], drawIntervals: number[] = [];
  const append = (values: number[], value: number) => { values.push(value); if (values.length > 180) values.shift(); };
  const metrics = () => summarize(intervals, durations, drawIntervals, frames, draws);
  const tick = (timestamp: number) => {
    raf = null;
    if (!running || disposed) return;
    const delta = last === null ? 0 : Math.max(0, timestamp - last);
    if (last !== null) append(intervals, delta);
    last = timestamp; elapsed += delta / 1000; frames++;
    const period = 1000 / options.maxFps();
    if (lastDraw === null || timestamp + 0.2 >= due) {
      const initial = lastDraw === null;
      const dt = lastDraw === null ? 0 : Math.min((timestamp - lastDraw) / 1000, 0.1);
      if (lastDraw !== null) append(drawIntervals, timestamp - lastDraw);
      lastDraw = timestamp;
      const before = clock.now(); draw(dt, elapsed); append(durations, clock.now() - before); draws++;
      due = initial ? timestamp + period : due + period;
      if (due < timestamp - 0.2) due = timestamp + period;
    }
    if (timestamp - reported >= 1000) { reported = timestamp; report(metrics()); }
    if (running && !disposed) raf = clock.request(tick);
  };
  return {
    metrics,
    still: () => { if (!disposed) draw(0, elapsed); },
    setRunning(next: boolean) {
      if (disposed || next === running) return;
      running = next; last = lastDraw = null; due = 0;
      if (next) { intervals.length = durations.length = drawIntervals.length = 0; raf = clock.request(tick); }
      else if (raf !== null) { clock.cancel(raf); raf = null; }
    },
    dispose() { running = false; disposed = true; if (raf !== null) clock.cancel(raf); raf = null; intervals.length = durations.length = drawIntervals.length = 0; },
  };
}
