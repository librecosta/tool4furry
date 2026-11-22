import { convertText, type CodecRequest, type Conversion } from './core';

export const backgroundThreshold = 128_000;
export const conversionTimeout = 12_000;

export function runCodec(request: CodecRequest, signal: AbortSignal): Promise<Conversion> {
  const aborted = () => new DOMException('Aborted', 'AbortError');
  if (signal.aborted) return Promise.reject(aborted());
  if (request.input.length < backgroundThreshold)
    return Promise.resolve(convertText(request));

  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    function cleanup() {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (worker) {
        worker.onmessage = worker.onmessageerror = worker.onerror = null;
        worker.terminate();
      }
      return true;
    }
    function cancel() {
      if (cleanup()) reject(aborted());
    }
    function finish(result: Conversion) {
      if (cleanup()) resolve(result);
    }
    try {
      worker = new Worker(new URL('./codec.worker.ts', import.meta.url), { type: 'module', name: 't4f-url-base64' });
      worker.onmessage = ({ data }: MessageEvent<Conversion>) => finish(data);
      worker.onmessageerror = () => finish({ issue: 'worker' });
      worker.onerror = event => {
        event.preventDefault();
        finish({ issue: 'worker' });
      };
      signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => finish({ issue: 'timeout' }), conversionTimeout);
      worker.postMessage(request);
    } catch {
      finish({ issue: 'worker' });
    }
  });
}
