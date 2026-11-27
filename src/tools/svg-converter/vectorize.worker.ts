import { tracePixelArt, type RasterPixels, type TraceSettings, type VectorResult } from './vector';

self.onmessage = async ({ data }: MessageEvent<{ source: RasterPixels; settings: TraceSettings }>) => {
  try {
    const start = performance.now();
    const { source, settings } = data;
    const result = settings.preset === 'pixel'
      ? tracePixelArt(source)
      : (await import('./color-trace')).traceColor(source, settings);
    if (!result.count) {
      self.postMessage({ error: 'empty' });
      return;
    }
    self.postMessage({ ...result, width: source.width, height: source.height, elapsed: performance.now() - start } satisfies VectorResult);
  } catch (error) {
    self.postMessage({ error: error instanceof Error && error.message === 'geometry-budget' ? 'budget' : 'trace' });
  }
};
