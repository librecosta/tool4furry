import type { AudioError, OutputBlock } from './media';
import type { AudioRequest, AudioResponse, AudioTaskResults } from './protocol';

export class AudioTaskError extends Error {
  constructor(readonly code: AudioError) { super(code); }
}

export function audioTask<T extends AudioRequest>(request: T, signal: AbortSignal, events: {
  progress?: (value: number) => void;
  samples?: (block: OutputBlock) => Promise<void>;
  write?: (position: number, data: Uint8Array<ArrayBuffer>) => Promise<void>;
} = {}) {
  return new Promise<AudioTaskResults[T['type']]>((resolve, reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL('./audio.worker.ts', import.meta.url), { type: 'module', name: 't4f-audio-trimmer' });
    let closing: ReturnType<typeof setTimeout> | undefined;
    function finish() {
      clearTimeout(closing);
      worker.terminate();
      signal.removeEventListener('abort', cancel);
    }
    function cancel() {
      reject(signal.reason);
      worker.postMessage('cancel');
      closing = setTimeout(finish, 1500);
    }
    signal.addEventListener('abort', cancel, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      finish();
      reject(new AudioTaskError(request.type === 'export' ? 'encode' : 'decode'));
    };
    worker.onmessage = ({ data }: MessageEvent<AudioResponse>) => {
      if (data.type === 'error' || data.type === 'result') {
        finish();
        if (data.type === 'error') reject(new AudioTaskError(data.code));
        else resolve(data.value as AudioTaskResults[T['type']]);
        return;
      }
      if (signal.aborted) return;
      if (data.type === 'progress') {
        events.progress?.(data.value);
        return;
      }
      const pending = data.type === 'samples' ? events.samples?.(data.block) : events.write?.(data.position, data.data);
      void pending?.then(() => {
        if (!signal.aborted) worker.postMessage('ack');
      }, () => {
        finish();
        reject(new AudioTaskError(data.type === 'write' ? 'write' : 'playback'));
      });
    };
    worker.postMessage(request);
  });
}
