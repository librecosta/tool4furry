import { GpuRenderer } from './gpu-renderer';
import { type TerrainSettings } from './gpu-terrain';
import { createScene, documentSeed } from './scenes';
import { FrameClock } from './clock';
import { RendererSession } from './renderer-session';

/** One document owns one seed; bfcache restoration only recreates GPU resources. */
export function mountWavefield(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  const query = import.meta.env.DEV ? new URLSearchParams(location.search) : new URLSearchParams();
  let scene: ReturnType<typeof createScene>;
  try { scene = createScene(documentSeed(import.meta.env.DEV ? query.get('waveSeed') : null)); } catch { return () => {}; }
  let settings: TerrainSettings = scene.settings;
  const qaTime = import.meta.env.DEV ? Number(query.get('waveTime')) : 0;
  const clock = new FrameClock(Number.isFinite(qaTime) ? Math.max(0, qaTime) : 0);
  const still = import.meta.env.DEV && query.get('waveStill') === '1';
  let session: RendererSession<GpuRenderer> | undefined, renderer: GpuRenderer | undefined;
  let visible = false, disposed = false, failed = false, hiddenPage = false, verified = false, pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined, raf = 0, dirty = true;
  let submissions = 0, lastSubmit = -Infinity, sizeVersion = 0, measuring = false;
  const intervals: number[] = [], costs: number[] = [];
  const allowed = () => !disposed && !failed && !hiddenPage && !document.hidden && visible &&
    !reduced.matches && !connection?.saveData && root.isConnected;
  const limit = () => root.clientWidth <= 760 ? 12 : 24;
  const stop = () => { clearTimeout(timer); timer = undefined; cancelAnimationFrame(raf); raf = 0; clock.suspend(); intervals.length = 0; measuring = false; };
  const poster = () => { root.dataset.wavefield = 'static'; };
  const fail = (error: unknown) => {
    failed = true; stop(); poster(); renderer = undefined; session?.fail(error);
    if (import.meta.env.DEV) root.dataset.waveFailure = error instanceof Error ? error.message : 'unavailable';
  };
  const record = (cost: number, now: number) => {
    submissions++; costs.push(cost); if (costs.length > 120) costs.shift();
    if (measuring) intervals.push(now - lastSubmit);
    if (intervals.length > 120) intervals.shift(); lastSubmit = now; measuring = true;
    if (import.meta.env.DEV) {
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
      const p95 = [...costs].sort((a, b) => a - b)[Math.ceil(costs.length * .95) - 1];
      Object.assign(root.dataset, { waveSubmits: String(submissions), waveTime: clock.elapsed.toFixed(3),
        waveFps: intervals.length ? (1000 * intervals.length / intervals.reduce((a, b) => a + b, 0)).toFixed(2) : '',
        waveMean: mean.toFixed(3), waveP95: p95.toFixed(3), waveAdapter: renderer?.adapter ?? '',
        wavePixels: canvas.width + 'x' + canvas.height, waveInstances: String(renderer?.instanceCount) });
    }
  };
  const schedule = () => {
    if (!allowed() || !renderer || pending || timer !== undefined || raf || (still && !dirty)) return;
    // Timer-gated RAF: at most one callback pending, even on 240 Hz displays.
    timer = setTimeout(() => { timer = undefined; raf = requestAnimationFrame(tick); },
      Math.max(0, Math.ceil(1000 / limit() - (performance.now() - lastSubmit))));
  };
  const tick = async (now: number) => {
    raf = 0;
    if (!allowed() || !renderer) { stop(); return; }
    if (!clock.step(now, settings.speed, !still, true, limit())) { schedule(); return; }
    const current = session, resource = renderer, size = sizeVersion;
    dirty = false;
    try {
      if (!verified) {
        pending = true;
        const frame = await resource.firstFrame(clock.elapsed, settings);
        if (current !== session || current?.cancelled || disposed) return;
        record(frame.cost, frame.submittedAt); verified = size === sizeVersion; pending = false;
        if (verified && allowed()) root.dataset.wavefield = 'ready';
        if (import.meta.env.DEV && query.get('waveLoss') === '1') resource.simulateDeviceLoss();
      } else record(resource.draw(clock.elapsed, settings), performance.now());
      schedule();
    } catch (error) { if (current === session && !current?.cancelled) fail(error); }
  };
  const resize = () => {
    if (!renderer || disposed) return;
    const rect = root.getBoundingClientRect();
    const dpr = import.meta.env.DEV && query.has('waveDpr') ? Number(query.get('waveDpr')) : devicePixelRatio;
    renderer.resize(rect.width, rect.height, Number.isFinite(dpr) && dpr > 0 ? dpr : 1);
    sizeVersion++; verified = false; dirty = true; poster(); clock.invalidate(); schedule();
  };
  const start = () => {
    if (!allowed() || session) return;
    const current = new RendererSession<GpuRenderer>(error => { if (session === current) fail(error); });
    session = current;
    void current.load(async () => {
      if (import.meta.env.DEV && query.get('waveReference') === '1')
        settings = (await import('./reference')).referenceSettings;
      return GpuRenderer.create(canvas, error => { if (session === current) fail(error); },
        () => current.cancelled || disposed, undefined,
        import.meta.env.DEV ? query.get('waveFail') : null);
    }, resource => { renderer = resource; resize(); });
  };
  const sync = () => {
    stop();
    if (reduced.matches || connection?.saveData) poster();
    if (allowed()) {
      if (renderer) { if (verified) root.dataset.wavefield = 'ready'; dirty = true; clock.invalidate(); schedule(); }
      else start();
    }
  };
  const resizeObserver = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
  // Removal cancels pending async device creation too.
  const removal = new MutationObserver(() => { if (!root.isConnected) dispose(); });
  resizeObserver.observe(root); intersection.observe(root); removal.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync); connection?.addEventListener('change', sync);
  let resolution: MediaQueryList;
  const watchDpr = () => {
    resolution?.removeEventListener('change', onDpr);
    resolution = matchMedia('(resolution: ' + devicePixelRatio + 'dppx)'); resolution.addEventListener('change', onDpr);
  };
  const onDpr = () => { watchDpr(); resize(); };
  watchDpr();
  const onHide = (event: PageTransitionEvent) => {
    hiddenPage = true; stop(); poster(); session?.dispose(); session = undefined; renderer = undefined; pending = false; verified = false;
    if (!event.persisted) dispose();
  };
  const onShow = () => { hiddenPage = false; sync(); };
  const dispose = () => {
    if (disposed) return; disposed = true; stop(); poster(); session?.dispose(); session = undefined; renderer = undefined;
    resizeObserver.disconnect(); intersection.disconnect(); removal.disconnect(); resolution.removeEventListener('change', onDpr);
    document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); connection?.removeEventListener('change', sync);
    window.removeEventListener('pagehide', onHide); window.removeEventListener('pageshow', onShow);
  };
  window.addEventListener('pagehide', onHide); window.addEventListener('pageshow', onShow);
  if (import.meta.env.DEV) Object.assign(root.dataset, { waveSeed: String(scene.seed), waveCandidate: String(scene.candidate),
    waveFallback: String(scene.fallback), waveScore: scene.metrics.score.toFixed(3), waveRelief: scene.metrics.mobileRelief.toFixed(3) });
  return dispose;
}
