import type { RegexRequest, RegexResult } from './core';
import { fail } from '../general/bounds';
export function runRegex(
  request: RegexRequest,
  signal: AbortSignal,
): Promise<RegexResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), {
      type: 'module',
    });
    let finished = false;
    const finish = (value?: RegexResult, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      worker.terminate();
      error ? reject(error) : resolve(value!);
    };
    const cancel = () => finish(undefined, new Error('Cancelled'));
    const timer = setTimeout(() => {
      try {
        fail(
          '表达式超时，已终止。请简化正则或缩短文本。',
          'Expression timed out and was terminated. Simplify it or shorten the text.',
        );
      } catch (e) {
        finish(undefined, e as Error);
      }
    }, 1500);
    worker.onmessage = (e) =>
      finish(e.data.result, e.data.error ? new Error(e.data.error) : undefined);
    worker.onerror = () => finish(undefined, new Error('Worker failed'));
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    else worker.postMessage(request);
  });
}
