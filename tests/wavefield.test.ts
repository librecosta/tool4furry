import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, gpuMeshBudget, gpuViewport, sceneField, projectPoint, terrainSample, writeUniforms, UNIFORM_FLOATS } from '../src/visuals/wavefield/gpu-terrain';
import { createScene, scoreScene, documentSeed } from '../src/visuals/wavefield/scenes';
import { FrameClock } from '../src/visuals/wavefield/clock';
import { RendererSession, boundedInitialization } from '../src/visuals/wavefield/renderer-session';

describe('homepage Wavefield projection and constrained scenes', () => {
  it('shares the exact poster scale/anchor, cropping instead of squashing phones', () => {
    for (const width of [320, 390, 960, 1024, 1440, 1920]) {
      const s = Math.max(.78, width / 1440), field = sceneField(width, 650);
      const a = projectPoint(.62, .55, .8, sceneField(1440, 576));
      const b = projectPoint(.62, .55, .8, field);
      expect(b.x).toBeCloseTo(width / 2 + s * (a.x - 720));
      expect(b.y).toBeCloseTo(650 - 288 * s + s * (a.y - 288));
      expect(field.halfWidth / field.halfHeight).toBe(2.5);
    }
    expect(gpuMeshBudget(320, 'reference').instanceCount).toBe(43008);
    for (const dpr of [1, 1.5, 2]) expect(gpuViewport(390, 650, dpr, 8192).pixelWidth).toBe(Math.round(390 * Math.min(dpr, 1.5)));
    expect(gpuViewport(20000, 10000, 2, 8192).pixelWidth).toBeLessThanOrEqual(8192);
  });
  // 200 full scene selections (audit + deterministic replay), not a per-page
  // performance assertion. Bound the audit separately for shared CI runners.
  it('keeps finite, varied desktop/mobile compositions across 100 reproducible seeds', () => {
    const scenes = Array.from({ length: 100 }, (_, n) => createScene(n * 2654435761 >>> 0));
    expect(scoreScene(DEFAULT_SETTINGS).valid).toBe(true);
    for (const scene of scenes) {
      expect(scene.metrics.valid, JSON.stringify(scene)).toBe(true);
      expect(scene.candidate).toBeLessThanOrEqual(8);
      expect(createScene(scene.seed)).toEqual(scene);
      const uniforms = new Float32Array(UNIFORM_FLOATS);
      writeUniforms(uniforms, 390, 650, 1.5, 7, scene.settings);
      expect([...uniforms].every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(terrainSample(0, 1, 10000, scene.settings).height)).toBe(true);
    }
    expect(new Set(scenes.map(s => JSON.stringify(s.settings.hills))).size).toBeGreaterThan(90);
    expect(scenes.filter(s => s.fallback).length).toBeLessThanOrEqual(5);
    console.info('100 seed composition audit', {
      fallback: scenes.filter(s => s.fallback).length,
      mobileReliefMin: Math.min(...scenes.map(s => s.metrics.mobileRelief)),
      maxHeight: Math.max(...scenes.map(s => s.metrics.maxHeight)),
      maxSlope: Math.max(...scenes.map(s => s.metrics.maxSlope)),
      maxFoldRatio: Math.max(...scenes.map(s => s.metrics.foldRatio)),
      maxQuietRatio: Math.max(...scenes.map(s => s.metrics.quietRatio)),
    });
  }, 15_000);
  it('rejects malformed/flat/wall compositions and uses secure per-document seeds', () => {
    expect(scoreScene({ ...DEFAULT_SETTINGS, hills: DEFAULT_SETTINGS.hills.map(h => ({ ...h, amplitude: 0 })) }).valid).toBe(false);
    expect(scoreScene({ ...DEFAULT_SETTINGS, hills: DEFAULT_SETTINGS.hills.map(h => ({ ...h, x: NaN })) }).valid).toBe(false);
    const source = { getRandomValues: vi.fn((a: Uint32Array) => { a[0] = 777; return a; }) } as unknown as Crypto;
    expect(documentSeed('12345', source)).toBe(12345);
    expect(documentSeed('4294967296', source)).toBe(777);
    expect(documentSeed(null, source)).toBe(777);
  });
  it('caps real draw opportunities independently of RAF and excludes inactive time', () => {
    for (const limit of [12, 24]) {
      const clock = new FrameClock(); let draws = 0;
      for (let n = 0; n < 2400; n++) if (clock.step(n * 1000 / 240, 1, true, true, limit)) draws++;
      expect(draws).toBe(limit * 10);
      clock.suspend(); const elapsed = clock.elapsed;
      clock.step(60000, 1, true, true, limit);
      expect(clock.elapsed).toBe(elapsed);
      clock.step(60100, 1, true, true, limit);
      expect(clock.elapsed).toBeCloseTo(elapsed + .1);
    }
  });
  it('disposes late async resources and times out without resurrecting a session', async () => {
    const resource = { dispose: vi.fn() }, ready = vi.fn(), error = vi.fn();
    let resolve!: (value: typeof resource) => void;
    const session = new RendererSession<typeof resource>(error);
    const pending = session.load(() => new Promise(r => { resolve = r; }), ready);
    session.dispose(); resolve(resource); await pending;
    expect(resource.dispose).toHaveBeenCalledOnce(); expect(ready).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    vi.useFakeTimers();
    let late!: (value: typeof resource) => void;
    const timeout = boundedInitialization(new Promise<typeof resource>(r => { late = r; }), 'device', 8, r => r.dispose());
    const assertion = expect(timeout).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(8); await assertion;
    late(resource); await Promise.resolve();
    expect(resource.dispose).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
