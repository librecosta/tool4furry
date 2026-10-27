export type FrameMetrics = { frames: number; samples: number; mean: number | null; p95: number | null; fps: number | null; drawMean: number | null };
export function summarize(intervals: readonly number[], draws: readonly number[], frames: number): FrameMetrics {
  const mean = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
  const sorted = [...intervals].sort((a, b) => a - b);
  return { frames, samples: intervals.length, mean, p95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null, fps: mean ? 1000 / mean : null, drawMean: draws.length ? draws.reduce((a, b) => a + b, 0) / draws.length : null };
}

// Local Lab clock: one cancellable RAF, raw frame intervals and bounded samples.
// drawMean measures JS submission/drawing duration, never GPU duration.
export function createSceneLoop(draw: (dt: number, elapsed: number) => void, report: (metrics: FrameMetrics) => void, scheduler = {
  request: (fn: FrameRequestCallback) => requestAnimationFrame(fn),
  cancel: (id: number) => cancelAnimationFrame(id),
  now: () => performance.now(),
}) {
  let raf: number | null = null, running = false, disposed = false;
  let last: number | null = null, elapsed = 0, frames = 0, reported = 0;
  const intervals: number[] = [], draws: number[] = [];
  const metrics = () => summarize(intervals, draws, frames);
  const tick = (timestamp: number) => {
    raf = null;
    if (!running || disposed) return;
    const delta = last === null ? 0 : Math.max(0, timestamp - last);
    if (last !== null) { intervals.push(delta); if (intervals.length > 180) intervals.shift(); }
    last = timestamp;
    const dt = Math.min(delta / 1000, 0.05);
    elapsed += dt;
    const before = scheduler.now();
    draw(dt, elapsed);
    draws.push(scheduler.now() - before);
    if (draws.length > 180) draws.shift();
    frames++;
    if (timestamp - reported >= 1000) { reported = timestamp; report(metrics()); }
    if (running && !disposed) raf = scheduler.request(tick);
  };
  return {
    metrics,
    still: () => { if (!disposed) draw(0, elapsed); },
    setRunning(next: boolean) {
      if (disposed || next === running) return;
      running = next; last = null;
      if (next) { intervals.length = 0; draws.length = 0; raf = scheduler.request(tick); }
      else if (raf !== null) { scheduler.cancel(raf); raf = null; }
    },
    dispose() { running = false; disposed = true; if (raf !== null) scheduler.cancel(raf); raf = null; intervals.length = 0; draws.length = 0; },
  };
}
