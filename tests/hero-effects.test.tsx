import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { fibonacciShell, orbLayout, qualities, waveY } from '../src/lab/hero-effects/geometry';
import { createSceneLoop, summarize } from '../src/lab/hero-effects/scene-runtime';
import { useScene, type Renderer, type SceneStats } from '../src/lab/hero-effects/useScene';
import { createOrbRenderer } from '../src/lab/hero-effects/orb-renderer';

describe('procedural geometry and measured timing', () => {
  it('builds a deterministic unit shell within the quality budgets', () => {
    const points = fibonacciShell(6000);
    expect(points).toEqual(fibonacciShell(6000));
    expect(points.byteLength).toBe(6000 * 16);
    for (let i = 0; i < points.length; i += 4) expect(Math.hypot(points[i], points[i + 1], points[i + 2])).toBeCloseTo(1, 5);
    expect(Object.values(qualities).map(q => q.lines)).toEqual([40, 64, 90]);
    expect(Object.values(qualities).every(q => q.dpr <= 2)).toBe(true);
    expect(orbLayout(390, 680, true).y).toBeGreaterThan(400);
    expect(orbLayout(1440, 560, true).x).toBeGreaterThan(900);
  });
  it('keeps the ribbon continuous, finite and slowly changing in time', () => {
    for (const layer of [0, 0.5, 1]) for (let i = 0; i < 240; i++) {
      const u = i / 240, y = waveY(u, layer, 0);
      expect(Number.isFinite(y)).toBe(true);
      expect(Math.abs(waveY(u + 1 / 240, layer, 0) - y)).toBeLessThan(0.02);
      expect(Math.abs(waveY(u, layer, 0.016) - y)).toBeLessThan(0.001);
    }
  });
  it('reports actual interval statistics without a fabricated initial FPS', () => {
    expect(summarize([], [], 0).fps).toBeNull();
    const result = summarize([10, 10, 10, 50], [1, 2], 5);
    expect(result).toMatchObject({ mean: 20, p95: 50, fps: 50, drawMean: 1.5, samples: 4 });
  });
  it('owns one RAF, excludes paused time and rejects late callbacks after disposal', () => {
    let id = 0, time = 0;
    const queued = new Map<number, FrameRequestCallback>();
    const draw = vi.fn(() => { time++; });
    const loop = createSceneLoop(draw, vi.fn(), { request: callback => { queued.set(++id, callback); return id; }, cancel: key => { queued.delete(key); }, now: () => time });
    const step = (timestamp: number) => { const entries = [...queued]; queued.clear(); entries.forEach(([, fn]) => fn(timestamp)); };
    loop.setRunning(true); loop.setRunning(true);
    expect(queued.size).toBe(1);
    step(10); step(26);
    expect(loop.metrics()).toMatchObject({ frames: 2, mean: 16, drawMean: 1 });
    loop.setRunning(false); expect(queued.size).toBe(0);
    loop.setRunning(true); step(60000);
    expect(loop.metrics().samples).toBe(0);
    const late = [...queued.values()][0];
    loop.dispose(); late(60016);
    expect(draw).toHaveBeenCalledTimes(3); expect(queued.size).toBe(0);
  });
});

describe('Lab scene lifetime', () => {
  let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
  let change: () => void, intersect: IntersectionObserverCallback;
  let queued: Map<number, FrameRequestCallback>, nextId: number;
  const disconnect = vi.fn();
  beforeEach(() => {
    queued = new Map(); nextId = 0;
    media = { matches: false, addEventListener: vi.fn((_name, fn) => { change = fn; }), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { queued.set(++nextId, fn); return nextId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => queued.delete(id));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
    vi.stubGlobal('IntersectionObserver', class { constructor(fn: IntersectionObserverCallback) { intersect = fn; } observe() {} disconnect = disconnect; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  function setup(paused = false, fail = false) {
    const made: Renderer[] = [], stats = vi.fn<(stats: SceneStats) => void>();
    const create = vi.fn(() => {
      if (fail) throw Error('No WebGL');
      const renderer = { backend: 'Test', count: 40, vertexBytes: 0, draw: vi.fn(), resize: vi.fn(), active: vi.fn(), dispose: vi.fn() };
      made.push(renderer); return renderer;
    });
    function Harness({ pause }: { pause: boolean }) {
      const canvas = useRef<HTMLCanvasElement>(null);
      useScene(canvas, create, { quality: 'medium', overlay: false, paused: pause, onStats: stats });
      return <canvas ref={canvas} />;
    }
    const result = render(<Harness pause={paused} />);
    return { ...result, create, made, stats, canvas: result.container.querySelector('canvas')!, rerenderPause: (pause: boolean) => result.rerender(<Harness pause={pause} />) };
  }
  it('pauses without recreating resources and cleans observers/RAF on unmount', () => {
    const r = setup();
    expect(queued.size).toBe(1);
    r.rerenderPause(true); expect(queued.size).toBe(0);
    expect(r.create).toHaveBeenCalledTimes(1);
    r.rerenderPause(false); expect(queued.size).toBe(1);
    r.unmount(); expect(queued.size).toBe(0);
    expect(r.made[0].dispose).toHaveBeenCalledTimes(1);
    expect(media.removeEventListener).toHaveBeenCalled(); expect(disconnect).toHaveBeenCalled();
  });
  it('stops for Reduced Motion, visibility and offscreen changes, then resumes only once', () => {
    const r = setup();
    act(() => { media.matches = true; change(); }); expect(queued.size).toBe(0);
    expect(r.stats.mock.lastCall?.[0].status).toBe('reduced');
    r.rerenderPause(true); r.rerenderPause(false); expect(queued.size).toBe(0);
    act(() => { media.matches = false; change(); }); expect(queued.size).toBe(1);
    act(() => { intersect([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver); });
    expect(queued.size).toBe(0); expect(r.stats.mock.lastCall?.[0].status).toBe('offscreen');
    act(() => { intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange'))); expect(queued.size).toBe(0);
    hidden.mockReturnValue(false); act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(queued.size).toBe(1);
  });
  it('fails safely without starting RAF and restores a lost GL context with fresh resources', () => {
    const failed = setup(false, true); expect(queued.size).toBe(0);
    expect(failed.stats.mock.lastCall?.[0].status).toBe('unavailable'); failed.unmount();
    const r = setup();
    const event = new Event('webglcontextlost', { cancelable: true });
    act(() => r.canvas.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true); expect(queued.size).toBe(0);
    expect(r.made[0].dispose).toHaveBeenCalledTimes(1);
    act(() => r.canvas.dispatchEvent(new Event('webglcontextrestored')));
    expect(r.create).toHaveBeenCalledTimes(2); expect(queued.size).toBe(1);
    r.unmount(); expect(r.made[1].dispose).toHaveBeenCalledTimes(1);
  });
});

function fakeGL(compile = true) {
  return {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6, RENDERER: 7, COLOR_BUFFER_BIT: 8, BLEND: 9, SRC_ALPHA: 10, ONE: 11, POINTS: 12, FLOAT: 13,
    createShader: vi.fn(() => ({})), shaderSource: vi.fn(), compileShader: vi.fn(), getShaderParameter: vi.fn(() => compile), deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})), attachShader: vi.fn(), detachShader: vi.fn(), linkProgram: vi.fn(), getProgramParameter: vi.fn(() => true), deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})), bindBuffer: vi.fn(), bufferData: vi.fn(), deleteBuffer: vi.fn(), getAttribLocation: vi.fn(() => 0), getUniformLocation: vi.fn(() => ({})), getParameter: vi.fn(() => 'test'),
    viewport: vi.fn(), clearColor: vi.fn(), clear: vi.fn(), useProgram: vi.fn(), enableVertexAttribArray: vi.fn(), vertexAttribPointer: vi.fn(), enable: vi.fn(), blendFunc: vi.fn(), uniform1f: vi.fn(), uniform2f: vi.fn(), drawArrays: vi.fn(),
  };
}
it('uploads one GL buffer, disposes shaders/program/buffer once and cleans partial initialization', () => {
  const canvas = document.createElement('canvas'), gl = fakeGL();
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGL2RenderingContext);
  const renderer = createOrbRenderer(canvas, 'low', false);
  renderer.resize(960, 500, 1); renderer.active(false); renderer.draw(0, 0); renderer.draw(0, 1);
  expect(gl.bufferData).toHaveBeenCalledTimes(1); expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  renderer.dispose(); renderer.dispose();
  expect(gl.deleteBuffer).toHaveBeenCalledTimes(1); expect(gl.deleteProgram).toHaveBeenCalledTimes(1); expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  const broken = fakeGL(false);
  vi.spyOn(canvas, 'getContext').mockReturnValue(broken as unknown as WebGL2RenderingContext);
  expect(() => createOrbRenderer(canvas, 'medium', false)).toThrow();
  expect(broken.deleteShader).toHaveBeenCalledTimes(1); expect(broken.deleteProgram).toHaveBeenCalledTimes(1);
});
