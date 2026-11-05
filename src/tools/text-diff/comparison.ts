import { LocalError } from '../general/bounds';
import type { DiffResult } from './core';

export type DiffRequest = { left: string; right: string; ignore: boolean };
export type DiffResponse = { result: DiffResult } | { error: 'timeout' | 'resource' };
export interface DiffWorker {
  onmessage: ((event: MessageEvent<DiffResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(data: DiffRequest): void;
  terminate(): void;
}
function createWorker(): DiffWorker {
  if (typeof Worker === 'undefined') throw new LocalError('此浏览器不支持后台文本比较。', 'This browser does not support background text comparison.');
  return new Worker(new URL('./diff.worker.ts', import.meta.url), { type: 'module', name: 't4f-text-diff' });
}
/** One cancellable comparison, with termination rather than queued obsolete work. */
export function runComparison(input: DiffRequest, signal: AbortSignal, factory = createWorker): Promise<DiffResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    let worker: DiffWorker | undefined, timer: ReturnType<typeof setTimeout> | undefined, settled = false;
    const finish = (result?: DiffResult, error?: unknown) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
      if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(undefined, new DOMException('Aborted', 'AbortError'));
    const failure = () => finish(undefined, new LocalError('后台比较失败，请重试或减少文本范围。', 'Background comparison failed. Retry or compare a smaller text range.'));
    signal.addEventListener('abort', abort, { once: true });
    try {
      worker = factory();
      worker.onmessage = ({ data }) => {
        if ('result' in data) finish(data.result);
        else finish(undefined, data.error === 'timeout'
          ? new LocalError('比较超时，请减少差异范围后重试。', 'Comparison timed out. Compare a smaller range of changes.')
          : new LocalError('文本比较超出当前设备处理能力。', 'Text comparison exceeded this device’s available resources.'));
      };
      worker.onerror = event => { event.preventDefault(); failure(); };
      worker.onmessageerror = failure;
      // Covers startup, tokenization and response cloning as well as edit search.
      timer = setTimeout(() => finish(undefined, new LocalError('后台比较超时，请减少文本范围。', 'Background comparison timed out. Compare a smaller text range.')), 5000);
      worker.postMessage(input);
    } catch (error) {
      finish(undefined, error instanceof LocalError ? error : new LocalError('无法启动后台比较，请重试或检查浏览器能力。', 'Could not start background comparison. Retry or check browser support.'));
    }
  });
}
