import { useEffect, useRef, type RefObject } from 'react';
import { createSceneLoop, type FrameMetrics } from './scene-runtime';
import { qualities, type Quality } from './geometry';

export type SceneStatus = 'running' | 'paused' | 'reduced' | 'hidden' | 'offscreen' | 'unavailable';
export type MeshLayout = { mainLines: number; crossLines: number; samples: number; meshBytes: number };
export type SceneStats = FrameMetrics & MeshLayout & { status: SceneStatus; width: number; height: number; pixelWidth: number; pixelHeight: number; dpr: number; screenDpr: number; maxFps: number };
export type Renderer = { layout: () => MeshLayout; resize: (width: number, height: number, dpr: number) => void; draw: (dt: number, elapsed: number) => void; active: (running: boolean) => void; dispose: () => void };
export type SceneFactory = (canvas: HTMLCanvasElement, quality: Quality, overlay: boolean) => Renderer;
export type SceneProps = { quality: Quality; overlay: boolean; paused: boolean; onStats: (stats: SceneStats) => void };

export function useScene(canvasRef: RefObject<HTMLCanvasElement | null>, create: SceneFactory, props: SceneProps) {
  const paused = useRef(props.paused), update = useRef<(() => void) | null>(null);
  const report = useRef(props.onStats);
  report.current = props.onStats;
  useEffect(() => { paused.current = props.paused; update.current?.(); }, [props.paused]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer | undefined;
    let failed = false, visible = true, disposed = false;
    let width = 1, height = 1, dpr = 1, screenDpr = 1;
    let densityQuery: MediaQueryList | undefined;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const maxFps = () => props.quality === 'low' || width <= 760 ? 30 : 60;
    const status = (): SceneStatus => failed ? 'unavailable' : media.matches ? 'reduced' : paused.current ? 'paused' : document.hidden ? 'hidden' : !visible ? 'offscreen' : 'running';
    const emit = () => {
      if (!disposed) report.current({ ...loop.metrics(), ...(renderer?.layout() ?? { mainLines: 0, crossLines: 0, samples: 0, meshBytes: 0 }), status: status(), width, height, pixelWidth: canvas.width, pixelHeight: canvas.height, dpr, screenDpr, maxFps: maxFps() });
    };
    const loop = createSceneLoop((dt, elapsed) => {
      try { renderer?.draw(dt, elapsed); }
      catch { failed = true; renderer?.active(false); renderer?.dispose(); renderer = undefined; loop.setRunning(false); canvas.dataset.running = 'false'; emit(); }
    }, emit, { maxFps });
    const sync = () => {
      const running = status() === 'running';
      canvas.dataset.running = String(running);
      renderer?.active(running); loop.setRunning(running); emit();
    };
    const watchDensity = () => {
      densityQuery?.removeEventListener('change', onDensity);
      densityQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      densityQuery.addEventListener('change', onDensity);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      screenDpr = window.devicePixelRatio || 1;
      dpr = Math.min(screenDpr, qualities[props.quality].dpr);
      renderer?.resize(width, height, dpr);
      // Static/reduced frames are complete too; hidden/offscreen stay stopped.
      if (!failed && status() !== 'running' && status() !== 'hidden' && status() !== 'offscreen') loop.still();
      emit();
    };
    function onDensity() { resize(); watchDensity(); }
    const onMotion = () => { if (media.matches && !failed && !document.hidden && visible) loop.still(); sync(); };
    document.addEventListener('visibilitychange', sync);
    media.addEventListener('change', onMotion);
    const resizeObserver = new ResizeObserver(resize);
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    try { renderer = create(canvas, props.quality, props.overlay); }
    catch { failed = true; }
    resizeObserver.observe(canvas); intersection?.observe(canvas);
    watchDensity(); update.current = sync; resize(); sync();
    return () => {
      disposed = true; update.current = null;
      loop.dispose(); resizeObserver.disconnect(); intersection?.disconnect();
      document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', onMotion);
      densityQuery?.removeEventListener('change', onDensity);
      renderer?.active(false); renderer?.dispose();
      canvas.width = canvas.height = 1;
    };
  }, [canvasRef, create, props.quality, props.overlay]);
}
