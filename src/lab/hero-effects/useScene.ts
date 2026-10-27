import { useEffect, useRef, type RefObject } from 'react';
import { createSceneLoop, type FrameMetrics } from './scene-runtime';
import { qualities, type Quality } from './geometry';

export type SceneStatus = 'running' | 'paused' | 'reduced' | 'hidden' | 'offscreen' | 'unavailable' | 'context-lost';
export type SceneStats = FrameMetrics & { status: SceneStatus; backend: string; count: number; width: number; height: number; pixelWidth: number; pixelHeight: number; dpr: number; vertexBytes: number };
export type Renderer = { backend: string; count: number; vertexBytes: number; resize: (width: number, height: number, dpr: number) => void; draw: (dt: number, elapsed: number) => void; active: (running: boolean) => void; dispose: () => void };
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
    let failed = false, lost = false, visible = true, disposed = false;
    let width = 1, height = 1, dpr = 1;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const status = (): SceneStatus => failed ? 'unavailable' : lost ? 'context-lost' : media.matches ? 'reduced' : paused.current ? 'paused' : document.hidden ? 'hidden' : !visible ? 'offscreen' : 'running';
    const emit = () => {
      if (!disposed) report.current({ ...loop.metrics(), status: status(), backend: renderer?.backend ?? '—', count: renderer?.count ?? 0, vertexBytes: renderer?.vertexBytes ?? 0, width, height, pixelWidth: canvas.width, pixelHeight: canvas.height, dpr });
    };
    const loop = createSceneLoop((dt, elapsed) => renderer?.draw(dt, elapsed), emit);
    const sync = () => {
      const running = status() === 'running';
      canvas.dataset.running = String(running);
      renderer?.active(running);
      loop.setRunning(running);
      if (!running && !lost && !failed) loop.still();
      emit();
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, qualities[props.quality].dpr);
      renderer?.resize(width, height, dpr);
      if (status() !== 'running' && !lost) loop.still();
      emit();
    };
    const initialize = () => {
      try { renderer = create(canvas, props.quality, props.overlay); failed = false; lost = false; }
      catch { failed = true; }
      resize(); sync();
    };
    const onLost = (event: Event) => {
      event.preventDefault(); lost = true;
      loop.setRunning(false); renderer?.active(false); renderer?.dispose(); renderer = undefined;
      canvas.dataset.running = 'false'; emit();
    };
    const onRestored = () => { if (!disposed && lost) initialize(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    document.addEventListener('visibilitychange', sync);
    media.addEventListener('change', sync);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    intersection?.observe(canvas);
    update.current = sync;
    initialize();
    return () => {
      disposed = true; update.current = null;
      loop.dispose(); resizeObserver.disconnect(); intersection?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', sync);
      renderer?.active(false); renderer?.dispose();
      // This canvas is unmounted on effect/quality/reset changes, never reused.
      if (renderer?.backend.startsWith('WebGL')) {
        const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      }
      canvas.width = canvas.height = 1;
    };
  }, [canvasRef, create, props.quality, props.overlay]);
}
