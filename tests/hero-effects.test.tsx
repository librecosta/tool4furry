import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { gradientNoise, layers, meshBudget, projectSurface, qualities, spacingFade, surface } from '../src/lab/hero-effects/geometry';
import { createSceneLoop, summarize } from '../src/lab/hero-effects/scene-runtime';
import { useScene, type Renderer, type SceneStats } from '../src/lab/hero-effects/useScene';
import { createWavesRenderer } from '../src/lab/hero-effects/waves-renderer';

describe('HSN-1 horizontal spectral surface', () => {
  it('reproduces seeded gradient noise and has continuous analytic derivatives at cell edges', () => {
    expect(gradientNoise(0.37, -1.24)).toEqual(gradientNoise(0.37, -1.24));
    expect(gradientNoise(0.37, -1.24, 7).value).not.toEqual(gradientNoise(0.37, -1.24).value);
    const h = 0.00001;
    for (const x of [-2, -0.001, 0, 0.37, 1, 2.8]) for (const y of [-1, 0, 0.23, 1]) {
      const n = gradientNoise(x, y), left = gradientNoise(x - h, y), right = gradientNoise(x + h, y);
      expect(Object.values(n).every(Number.isFinite)).toBe(true);
      expect(n.du).toBeCloseTo((right.value - left.value) / (2 * h), 5);
      expect(n.dv).toBeCloseTo((gradientNoise(x, y + h).value - gradientNoise(x, y - h).value) / (2 * h), 5);
      expect(n.duu).toBeCloseTo((right.du - left.du) / (2 * h), 3);
      expect(Math.abs(right.value - left.value)).toBeLessThan(0.001);
    }
  });
  it('uses the frozen low-frequency spectral amplitudes and dispersion with slow continuous time', () => {
    const u = 0.57, v = 0.42, time = 17;
    let expected = 0;
    for (const [f, a, beta, phi] of [[0.65, 0.035, 0.85, 3.15], [1.35, 0.012, -1.2, 0.9], [2.4, 0.004, 1.4, 2.4]]) {
      const k = 2 * Math.PI * f;
      expected += a * Math.cos(k * u + beta * v - 0.045 * Math.sqrt(k * Math.tanh(0.5 * k)) * time + phi);
    }
    expected += 0.008 / 1.47 * (gradientNoise(1.2 * u - 0.005 * time, 0.35 * v).value
      + 0.35 * gradientNoise(2.4 * u - 0.008 * time, 0.7 * v).value + 0.12 * gradientNoise(4.8 * u - 0.01 * time, 1.4 * v).value);
    expect(surface(u, v, time).height).toBeCloseTo(expected, 12);
    const h = 0.0001, s = surface(u, v, time);
    expect(s.du).toBeCloseTo((surface(u + h, v, time).height - surface(u - h, v, time).height) / (2 * h), 5);
    expect(s.dv).toBeCloseTo((surface(u, v + h, time).height - surface(u, v - h, time).height) / (2 * h), 5);
    expect(s.duu).toBeCloseTo((surface(u + h, v, time).du - surface(u - h, v, time).du) / (2 * h), 5);
  });
  it('has exact horizontal projection, unfolded rows, low slopes and bounded phone relief', () => {
    for (const width of [390, 960, 1440]) for (const layer of ['far', 'main'] as const) for (const time of [0, 17, 500]) {
      const height = width === 390 ? 680 : 547;
      for (let v = 0; v < 1; v += 0.1) for (let u = 0; u <= 1; u += 0.02) {
        const a = projectSurface(u, v, time, width, height, false, undefined, layer);
        const b = projectSurface(u + 0.001, v, time, width, height, false, undefined, layer);
        const next = projectSurface(u, v + 0.01, time, width, height, false, undefined, layer);
        expect(Object.values(a).every(Number.isFinite)).toBe(true);
        expect(a.x).toBe(width * u);
        expect(next.y).toBeGreaterThan(a.y);
        expect(Math.abs((b.y - a.y) / (b.x - a.x))).toBeLessThan(0.25);
        expect(Math.abs(a.y - height * (layers[layer].base + layers[layer].span * v))).toBeLessThanOrEqual(Math.min(height, width * 0.5) * 0.06);
        expect(Math.abs(surface(u, v, time + 1 / 24).height - surface(u, v, time).height)).toBeLessThan(0.0005);
      }
    }
  });
  it('lights localized curvature ridges and keeps valleys, far hatching and text safety darker', () => {
    const shades: number[] = [], crests: number[] = [];
    for (let u = 0.4; u <= 1; u += 0.01) {
      shades.push(projectSurface(u, 0.8, 0, 1440, 547, false).shade);
      crests.push(surface(u, 0.8, 0).crest);
    }
    expect(Math.max(...shades)).toBeGreaterThan(Math.min(...shades) * 3);
    expect(crests.filter(v => v > 0.5).length).toBeLessThan(crests.length / 3);
    for (let u = 0; u <= 1; u += 0.02) for (const t of [0, 20, 500]) {
      const farEdge = projectSurface(u, 1, t, 1440, 547, false, undefined, 'far');
      const mainEdge = projectSurface(u, 0, t, 1440, 547, false);
      expect(mainEdge.y - farEdge.y).toBeGreaterThan(3);
    }
    const original = projectSurface(0.7, 0.5, 0, 1440, 547, false);
    const moved = projectSurface(0.7, 0.5, 0, 1440, 547, false, { x: 0.7, y: original.y / 547, strength: 1 });
    expect(moved.x).toBe(original.x);
    expect(original.y - moved.y).toBeCloseTo(547 * 0.004);
    expect(projectSurface(0.1, 0.5, 0, 1440, 547, false, { x: 0.7, y: original.y / 547, strength: 1 }).y)
      .toBeCloseTo(projectSurface(0.1, 0.5, 0, 1440, 547, false).y, 5);
    const main = projectSurface(0.7, 0.8, 0, 1440, 547, false);
    expect(projectSurface(0.7, 0.8, 0, 1440, 547, false, undefined, 'far').shade).toBeLessThan(main.shade * 0.3);
    expect(projectSurface(0.2, 0.5, 0, 1440, 547, true).shade).toBeLessThan(0.02);
  });
  it('bounds both layers and quality budgets and suppresses compressed device-pixel spacing', () => {
    for (const quality of ['low', 'medium', 'high'] as const) for (const width of [390, 960, 1440]) for (const dpr of [1, 1.25, 2]) {
      const b = meshBudget(width, 547, dpr, quality);
      expect(b.rows + 1).toBeLessThanOrEqual(qualities[quality].lines);
      expect(b.farRows).toBeLessThan(b.rows / 2);
      expect(b.columns).toBeLessThanOrEqual(qualities[quality].samples);
      expect((b.rows + b.farRows + 2) * (b.columns + 1)).toBeLessThanOrEqual(62 * 321);
      expect(b.cross).toBeLessThanOrEqual(18);
    }
    expect(spacingFade(100, 0, 0, 1.5, 1)).toBe(0);
    expect(spacingFade(100, 0, 0, 1, 2)).toBeGreaterThan(0);
    expect(spacingFade(100, 0, 0, 4, 1)).toBe(1);
    expect(spacingFade(100, 0, 0, 2.8, 1, 1)).toBeLessThan(spacingFade(100, 0, 0, 2.8, 1, 0));
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
  it.each([12, 24])('limits 240 Hz callbacks to %i redraws with real elapsed animation time', limit => {
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
    const r = clockHarness(24);
    r.loop.setRunning(true); r.loop.setRunning(true); expect(r.queued.size).toBe(1);
    r.step(0); r.step(42); r.loop.setRunning(false); expect(r.queued.size).toBe(0);
    r.loop.setRunning(true); r.step(60000);
    expect(r.loop.metrics().samples).toBe(0);
    const late = [...r.queued.values()][0]; r.loop.dispose(); late(60042);
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
      const renderer = { layout: () => ({ mainLines: 40, farLines: 12, crossLines: 12, samples: 100, meshBytes: 0 }), draw: vi.fn(), resize: vi.fn(), active: vi.fn(), dispose: vi.fn() };
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
    expect(r.stats.mock.lastCall?.[0].maxFps).toBe(24);
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
  const { mainLines, farLines, crossLines, samples } = renderer.layout();
  expect(crossLines).toBeLessThan(mainLines);
  expect(renderer.layout().meshBytes).toBe((mainLines + farLines) * samples * 12);
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
