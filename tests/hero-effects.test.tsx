import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { meshBudget, projectSurface, qualities, spacingFade, surface } from '../src/lab/hero-effects/geometry';
import { createSceneLoop, summarize } from '../src/lab/hero-effects/scene-runtime';
import { useScene, type Renderer, type SceneStats } from '../src/lab/hero-effects/useScene';
import { createWavesRenderer } from '../src/lab/hero-effects/waves-renderer';

describe('continuous surface and screen-space density', () => {
  it('has finite, continuous geometry and non-uniform ridge/valley lighting', () => {
    for (const time of [0, 17, 500]) for (let v = 0; v <= 1; v += 0.1) for (let u = 0; u <= 1; u += 0.01) {
      const a = projectSurface(u, v, time, 1440, 547, false);
      const b = projectSurface(u + 0.001, v, time, 1440, 547, false);
      expect(Object.values(a).every(Number.isFinite)).toBe(true);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(3);
      expect(Math.abs(surface(u, v, time + 0.016).height - surface(u, v, time).height)).toBeLessThan(0.001);
    }
    const ridge = projectSurface(0.74, 0.54, 0, 1440, 547, false);
    expect(ridge.shade).toBeGreaterThan(projectSurface(0.43, 0.54, 0, 1440, 547, false).shade * 2);
    expect(ridge.shade).toBeGreaterThan(projectSurface(0.74, 0.02, 0, 1440, 547, false).shade * 2);
    expect(projectSurface(0.2, 0.5, 0, 1440, 547, true).shade).toBeLessThan(0.05);
  });
  it('bounds sample/line budgets at DPR 1/2 and suppresses compressed perpendicular spacing', () => {
    for (const quality of ['low', 'medium', 'high'] as const) for (const width of [390, 960, 1440]) for (const dpr of [1, 2, 2.5]) {
      const b = meshBudget(width, 547, dpr, quality);
      expect(b.rows).toBeLessThanOrEqual(qualities[quality].lines);
      expect(b.columns).toBeLessThanOrEqual(qualities[quality].samples);
      expect((b.rows + 1) * (b.columns + 1)).toBeLessThanOrEqual(65 * 321);
      expect(b.cross).toBeLessThan(b.rows);
    }
    expect(spacingFade(100, 0, 0, 1, 1)).toBe(0);
    expect(spacingFade(100, 0, 0, 1, 2)).toBeGreaterThan(0);
    expect(spacingFade(100, 0, 0, 4, 1)).toBe(1);
    expect(spacingFade(100, 0, 50, 0, 2)).toBe(0);
    expect(spacingFade(100, 100, 1, 1, 2)).toBe(0);
  });
});

function clockHarness(limit: number) {
  let id = 0, time = 0;
  const queued = new Map<number, FrameRequestCallback>();
  const draw = vi.fn(() => { time += 2; });
  const loop = createSceneLoop(draw, vi.fn(), { maxFps: () => limit, scheduler: {
    request: fn => { queued.set(++id, fn); return id; }, cancel: key => { queued.delete(key); }, now: () => time,
  } });
  const step = (timestamp: number) => { const entries = [...queued]; queued.clear(); entries.forEach(([, fn]) => fn(timestamp)); };
  return { loop, draw, queued, step };
}
describe('honest timing and bounded redraws', () => {
  it('distinguishes callback FPS, redraw FPS and synchronous draw percentiles', () => {
    expect(summarize([], [], [], 0, 0).fps).toBeNull();
    expect(summarize([10, 10, 10, 50], [1, 5], [40, 40], 5, 3)).toMatchObject({ mean: 20, p95: 50, fps: 50, drawFps: 25, drawMean: 3, drawP95: 5 });
  });
  it.each([30, 60])('limits 240 Hz callbacks to %i redraws with real elapsed animation time', limit => {
    const r = clockHarness(limit); r.loop.setRunning(true);
    for (let i = 0; i <= 480; i++) r.step(i * 1000 / 240);
    expect(r.loop.metrics().frames).toBe(481);
    expect(r.draw.mock.calls.length).toBeLessThanOrEqual(limit * 2 + 1);
    expect(r.draw.mock.calls.length).toBeGreaterThanOrEqual(limit * 2 - 1);
    expect(r.loop.metrics().drawFps).toBeCloseTo(limit, 0);
    expect((r.draw.mock.lastCall as unknown as number[])[1]).toBeCloseTo(2, 2);
    r.loop.dispose(); expect(r.queued.size).toBe(0);
  });
  it('owns one RAF, excludes paused time and rejects late callbacks after disposal', () => {
    const r = clockHarness(60);
    r.loop.setRunning(true); r.loop.setRunning(true); expect(r.queued.size).toBe(1);
    r.step(0); r.step(17); r.loop.setRunning(false); expect(r.queued.size).toBe(0);
    r.loop.setRunning(true); r.step(60000);
    expect(r.loop.metrics().samples).toBe(0);
    const late = [...r.queued.values()][0]; r.loop.dispose(); late(60017);
    expect(r.draw).toHaveBeenCalledTimes(3); expect(r.queued.size).toBe(0);
  });
});

describe('Canvas scene lifecycle', () => {
  let media: MediaQueryList, change: () => void, densityChange: () => void, intersect: IntersectionObserverCallback;
  let queued: Map<number, FrameRequestCallback>, nextId: number;
  const disconnect = vi.fn(), densityRemove = vi.fn();
  beforeEach(() => {
    queued = new Map(); nextId = 0;
    media = { matches: false, addEventListener: vi.fn((_name, fn) => { change = fn; }), removeEventListener: vi.fn() } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia', (q: string) => q.includes('prefers-reduced') ? media : { addEventListener: vi.fn((_name, fn) => { densityChange = fn; }), removeEventListener: densityRemove });
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { queued.set(++nextId, fn); return nextId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
    vi.stubGlobal('IntersectionObserver', class { constructor(fn: IntersectionObserverCallback) { intersect = fn; } observe() {} disconnect = disconnect; });
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  function setup(paused = false, fail = false) {
    const made: Renderer[] = [], stats = vi.fn<(stats: SceneStats) => void>();
    const create = vi.fn(() => {
      if (fail) throw Error('No Canvas');
      const renderer = { layout: () => ({ mainLines: 40, crossLines: 12, samples: 100, meshBytes: 0 }), draw: vi.fn(), resize: vi.fn(), active: vi.fn(), dispose: vi.fn() };
      made.push(renderer); return renderer;
    });
    function Harness({ pause }: { pause: boolean }) {
      const canvas = useRef<HTMLCanvasElement>(null);
      useScene(canvas, create, { quality: 'medium', overlay: false, paused: pause, onStats: stats });
      return <canvas ref={canvas} />;
    }
    const result = render(<Harness pause={paused} />);
    return { ...result, create, made, stats, rerenderPause: (pause: boolean) => result.rerender(<Harness pause={pause} />) };
  }
  it('pauses without rebuilding and releases observers, density listener, RAF and pixels', () => {
    const r = setup(), canvas = r.container.querySelector('canvas')!;
    expect(queued.size).toBe(1);
    r.rerenderPause(true); expect(queued.size).toBe(0);
    expect(r.create).toHaveBeenCalledTimes(1);
    r.rerenderPause(false); expect(queued.size).toBe(1);
    r.unmount(); expect(queued.size).toBe(0); expect(canvas.width).toBe(1);
    expect(r.made[0].dispose).toHaveBeenCalledTimes(1);
    expect(media.removeEventListener).toHaveBeenCalled(); expect(disconnect).toHaveBeenCalled(); expect(densityRemove).toHaveBeenCalled();
  });
  it('stops for Reduced Motion/visibility/offscreen and excludes hidden redraws', () => {
    const r = setup();
    act(() => { Object.assign(media, { matches: true }); change(); }); expect(queued.size).toBe(0);
    expect(r.stats.mock.lastCall?.[0].status).toBe('reduced');
    r.rerenderPause(true); r.rerenderPause(false); expect(queued.size).toBe(0);
    act(() => { Object.assign(media, { matches: false }); change(); }); expect(queued.size).toBe(1);
    const before = (r.made[0].draw as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(queued.size).toBe(0); expect(r.stats.mock.lastCall?.[0].status).toBe('offscreen');
    expect(r.made[0].draw).toHaveBeenCalledTimes(before);
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange'))); expect(queued.size).toBe(0);
    hidden.mockReturnValue(false); act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(queued.size).toBe(1); r.unmount();
  });
  it('does not start a loop when Canvas initialization fails', () => {
    const r = setup(false, true); expect(queued.size).toBe(0);
    expect(r.stats.mock.lastCall?.[0].status).toBe('unavailable'); r.unmount();
  });
  it('renders a complete static initial Reduced Motion frame and updates density without a CSS resize', () => {
    Object.assign(media, { matches: true });
    const r = setup();
    expect(queued.size).toBe(0); expect(r.made[0].draw).toHaveBeenCalledTimes(1);
    vi.stubGlobal('devicePixelRatio', 2);
    act(() => densityChange());
    expect(r.made[0].resize).toHaveBeenLastCalledWith(1, 1, 2);
    expect(r.stats.mock.lastCall?.[0]).toMatchObject({ screenDpr: 2, dpr: 2, status: 'reduced' });
    expect(queued.size).toBe(0); r.unmount();
  });
  it('stops a failed draw and releases the renderer before Reset', () => {
    const r = setup();
    (r.made[0].draw as ReturnType<typeof vi.fn>).mockImplementation(() => { throw Error('Canvas failure'); });
    const entries = [...queued]; queued.clear();
    act(() => entries.forEach(([, fn]) => fn(0)));
    expect(queued.size).toBe(0); expect(r.made[0].dispose).toHaveBeenCalledTimes(1);
    expect(r.stats.mock.lastCall?.[0].status).toBe('unavailable'); r.unmount();
  });
});

it('both mesh directions share projected vertices and disposal releases Canvas data/listeners', () => {
  const segments: number[][] = [];
  class Path {
    point = [0, 0];
    moveTo(x: number, y: number) { this.point = [x, y]; }
    lineTo(x: number, y: number) { segments.push([...this.point, x, y]); this.point = [x, y]; }
  }
  vi.stubGlobal('Path2D', Path);
  const ctx = { setTransform: vi.fn(), fillRect: vi.fn(), stroke: vi.fn() };
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  const remove = vi.spyOn(canvas, 'removeEventListener');
  const renderer = createWavesRenderer(canvas, 'medium', false);
  renderer.resize(1440, 547, 1); renderer.draw(0, 0);
  const { mainLines, crossLines, samples } = renderer.layout();
  expect(crossLines).toBeLessThan(mainLines);
  expect(renderer.layout().meshBytes).toBe(mainLines * samples * 12);
  const key = (x: number, y: number) => `${x},${y}`;
  const main = new Set<string>(), cross = new Set<string>();
  for (const [x, y, x2, y2] of segments) {
    const family = Math.abs(x2 - x) > Math.abs(y2 - y) ? main : cross;
    family.add(key(x, y)); family.add(key(x2, y2));
  }
  expect([...cross].filter(p => main.has(p)).length).toBeGreaterThan(50);
  const count = ctx.stroke.mock.calls.length;
  renderer.dispose(); renderer.dispose(); renderer.draw(0, 1);
  expect(ctx.stroke).toHaveBeenCalledTimes(count);
  expect(renderer.layout().meshBytes).toBe(0);
  expect(remove.mock.calls.map(call => call[0]).sort()).toEqual(['pointercancel', 'pointerleave', 'pointermove']);
});
