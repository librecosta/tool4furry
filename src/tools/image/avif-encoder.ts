import { ImageFailure } from './types';
import { avifOutputLimits } from './limits';

/** One optional ST worker per Converter. The Session's existing FIFO owns scheduling. */
export class AvifEncoder {
  private worker?: Worker;
  private pending?: { reject: (error: ImageFailure) => void; stop: () => void };
  private idle?: ReturnType<typeof setTimeout>;
  private sequence = 0;
  constructor(private create = () => new Worker(new URL('./avif.worker.ts', import.meta.url), { type: 'module' })) {}
  encode(rgba: ArrayBuffer, width: number, height: number, quality: number, avif444: boolean, signal?: AbortSignal) {
    if (signal?.aborted) return Promise.reject(new ImageFailure('cancelled'));
    if (this.pending) return Promise.reject(new ImageFailure('encode'));
    clearTimeout(this.idle);
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const id = ++this.sequence;
      const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); this.pending = undefined; };
      const fail = (error: ImageFailure) => { if (this.pending !== request) return; stop(); this.reset(); reject(error); };
      const abort = () => fail(new ImageFailure('cancelled'));
      const timer = setTimeout(() => fail(new ImageFailure('avifTimeout')), avifOutputLimits.timeout);
      const request = { reject, stop };
      this.pending = request;
      signal?.addEventListener('abort', abort, { once: true });
      try {
        const worker = this.worker ??= this.create();
        worker.onerror = () => fail(new ImageFailure('avifLoad'));
        worker.onmessageerror = () => fail(new ImageFailure('avifLoad'));
        worker.onmessage = ({ data }) => {
          if (this.worker !== worker || data.id !== id || !this.pending) return;
          if (data.error || !(data.buffer instanceof ArrayBuffer)) { fail(new ImageFailure(data.error === 'encode' ? 'encode' : 'avifLoad')); return; }
          stop();
          // WASM memory cannot shrink. Reuse ordinary small jobs; reclaim high-water
          // engines immediately and small engines after a bounded idle period.
          if (data.heap >= 256 * 1024 ** 2 || width * height >= 2 * 1024 ** 2) this.reset();
          else this.idle = setTimeout(() => this.reset(), 30000);
          resolve(data.buffer);
        };
        worker.postMessage({ id, rgba, width, height, quality, avif444 }, [rgba]);
      } catch { fail(new ImageFailure('avifLoad')); }
    });
  }
  private reset() {
    clearTimeout(this.idle);
    this.worker?.terminate(); this.worker = undefined;
  }
  dispose() {
    const pending = this.pending; pending?.stop(); this.reset();
    pending?.reject(new ImageFailure('cancelled'));
  }
}
