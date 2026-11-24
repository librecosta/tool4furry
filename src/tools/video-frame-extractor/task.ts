import { VideoError } from './core';
import type { FrameEvent, VideoRequest, VideoResponse, VideoResults } from './protocol';

export function videoTask<T extends VideoRequest>(request: T, signal: AbortSignal, events?: {
  frame: (frame: FrameEvent) => Promise<void>;
  progress: (update: Extract<VideoResponse, { type: 'progress' }>) => void;
}) {
  return new Promise<VideoResults[T['type']]>((resolve, reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL('./video-frame.worker.ts', import.meta.url), { type: 'module', name: 't4f-video-frame-worker' });
    const finish = () => {
      worker.terminate();
      signal.removeEventListener('abort', cancel);
    };
    function cancel() {
      finish();
      reject(signal.reason);
    }
    const fail = (error: unknown) => { finish(); reject(error); };
    signal.addEventListener('abort', cancel, { once: true });
    worker.onerror = event => { event.preventDefault(); fail(new VideoError('decode')); };
    worker.onmessageerror = () => fail(new VideoError('decode'));
    worker.onmessage = ({ data }: MessageEvent<VideoResponse>) => {
      if (signal.aborted) return;
      switch (data.type) {
        case 'result':
          finish();
          resolve(data.value as VideoResults[T['type']]);
          break;
        case 'error':
          fail(new VideoError(data.code));
          break;
        case 'progress':
          events?.progress(data);
          break;
        case 'frame':
          if (!events) { fail(new VideoError('decode')); break; }
          void events.frame(data.frame).then(() => {
            if (!signal.aborted) worker.postMessage('ack');
          }, fail);
      }
    };
    try { worker.postMessage(request); } catch (error) { fail(error); }
  });
}
