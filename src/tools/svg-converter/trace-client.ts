import { fail } from '../general/bounds';
import type { RasterPixels, TraceSettings, VectorResult } from './vector';

export function traceInWorker({ data, width, height }: RasterPixels, settings: TraceSettings, signal: AbortSignal): Promise<VectorResult> {
  signal.throwIfAborted();
  const worker = new Worker(new URL('./vectorize.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const stop = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    };
    const rejectTrace = (kind?: string) => {
      stop();
      try {
        if (kind === 'budget') fail('生成的轮廓过多。请降低颜色数或细节。', 'Too many paths. Reduce the number of colors or detail.');
        if (kind === 'empty') fail('没有找到可用轮廓。请调整细节或选择其他图片。', 'No visible shapes were found. Adjust the detail or choose another image.');
        if (kind === 'timeout') fail('处理超时。请降低颜色数、细节或使用较小图片。', 'Tracing timed out. Reduce colors or detail, or use a smaller image.');
        fail('矢量化失败。可以重试或选择其他图片。', 'Tracing failed. Retry or select another image.');
      } catch (error) { reject(error); }
    };
    const abort = () => { stop(); reject(signal.reason); };
    const timeout = setTimeout(() => rejectTrace('timeout'), 60_000);
    worker.onmessage = ({ data }: MessageEvent<VectorResult | { error: string }>) => {
      if ('error' in data) { rejectTrace(data.error); return; }
      stop();
      resolve(data);
    };
    worker.onerror = () => rejectTrace();
    worker.onmessageerror = () => rejectTrace();
    signal.addEventListener('abort', abort, { once: true });
    try { worker.postMessage({ source: { data, width, height }, settings }, [data.buffer as ArrayBuffer]); }
    catch { rejectTrace(); }
  });
}
