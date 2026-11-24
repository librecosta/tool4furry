import { fitSize, memoryLimit, VideoError } from './core';
import { encodeFrame, extractionSamples, inspect, positionSample, renderPreview, withVideo } from './media';
import type { FrameEvent, VideoRequest, VideoResponse, VideoResults } from './protocol';

let acknowledge: (() => void) | undefined;
const send = (message: VideoResponse) => self.postMessage(message);
const emit = (frame: FrameEvent) => new Promise<void>(resolve => {
  acknowledge = resolve;
  send({ type: 'frame', frame });
});

async function processRequest(request: VideoRequest): Promise<VideoResults[keyof VideoResults]> {
  return withVideo(request.file, async (track, sink) => {
    if (request.type === 'inspect') return inspect(track, sink);
    if (request.type === 'preview') {
      const sample = await positionSample(sink, request.info, request.position);
      if (!sample) throw new VideoError('decode');
      try {
        return await renderPreview(sample, request.info);
      } finally {
        sample.close();
      }
    }

    let frames = 0, sampled = 0, bytes = 0, last = -Infinity, reported = -Infinity;
    const { info, plan, settings, gallery } = request;
    const thumb = fitSize(settings.size, { width: 480, height: 360 });
    for await (const sample of extractionSamples(sink, info, plan)) {
      sampled++;
      let result: FrameEvent | undefined;
      try {
        if (sample && plan.mode === 'single' && sample.timestamp !== plan.timestamp) throw new VideoError('decode');
        if (sample && sample.timestamp >= info.origin && sample.timestamp > last) {
          if (gallery && frames >= gallery.frames) throw new VideoError('gallery');
          const image = await encodeFrame(sample, settings);
          const thumbnail = gallery ? await encodeFrame(sample, { size: thumb, format: 'png', quality: 1 }) : undefined;
          bytes += image.size + (thumbnail?.size ?? 0);
          if (gallery && (bytes > gallery.bytes || bytes > memoryLimit)) throw new VideoError('gallery');
          last = sample.timestamp;
          result = { timestamp: last, image, thumbnail };
        }
      } finally {
        sample?.close();
      }
      if (result) {
        await emit(result);
        frames++;
      }
      if (performance.now() - reported > 72) {
        reported = performance.now();
        send({ type: 'progress', time: last === -Infinity ? 0 : last - info.origin, sampled, frames });
      }
    }
    if (!frames) throw new VideoError('empty');
    return { frames, sampled };
  });
}

self.onmessage = ({ data }: MessageEvent<VideoRequest | 'ack'>) => {
  if (data === 'ack') {
    const next = acknowledge;
    acknowledge = undefined;
    next?.();
    return;
  }
  void processRequest(data).then(value => send({ type: 'result', value }), error => {
    send({ type: 'error', code: error instanceof VideoError ? error.code : 'decode' });
  });
};
