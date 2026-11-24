import { BlobSource, Input, MATROSKA, MP4, MPEG_TS, QTFF, WEBM, WAVE, MP3, OGG,
  VideoSampleSink, type InputVideoTrack, type VideoSample } from 'mediabunny';
import { fitSize, inputLimit, microseconds, sampleTimes, VideoError, type FramePlan, type ImageSettings } from './core';
import type { Position, VideoInfo } from './protocol';

export async function withVideo<T>(file: File, run: (track: InputVideoTrack, sink: VideoSampleSink) => Promise<T>) {
  if (!file.size || file.size > inputLimit) throw new VideoError('inputSize');
  const input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, WEBM, MATROSKA, MPEG_TS, OGG, WAVE, MP3] });
  try {
    const track = await input.getPrimaryVideoTrack().catch(() => { throw new VideoError('invalid'); });
    if (!track) throw new VideoError('noTrack');
    if (!await track.canDecode()) throw new VideoError('unsupported');
    return await run(track, new VideoSampleSink(track));
  } finally {
    input.dispose();
  }
}

export async function inspect(track: InputVideoTrack, sink: VideoSampleSink) {
  const [width, height, first, end, stats, timeResolution, hdr] = await Promise.all([
    track.getDisplayWidth(), track.getDisplayHeight(), track.getFirstTimestampOrNull(),
    track.computeDuration(), track.computePacketStats(120), track.getTimeResolution(), track.hasHighDynamicRange(),
  ]);
  if (first === null || !Number.isFinite(first) || !Number.isFinite(end) || end <= Math.max(first, 0) ||
    !width || !height || !Number.isFinite(timeResolution) || timeResolution <= 0) throw new VideoError('decode');
  for await (const sample of sink.samples(Math.max(first, 0))) {
    try {
      if (sample.timestamp < 0) continue;
      const origin = sample.timestamp;
      const info = { width, height, origin, end, duration: end - origin, fps: stats.averagePacketRate, timeResolution, hdr };
      if (info.duration <= 0) throw new VideoError('decode');
      return { info, preview: await renderPreview(sample, info) };
    } finally {
      sample.close();
    }
  }
  throw new VideoError('decode');
}

export async function positionSample(sink: VideoSampleSink, info: VideoInfo, position: Position) {
  if (position.step === 'next') {
    // Samples are in presentation order, even when packets arrive in decode order.
    for await (const sample of sink.samples(position.timestamp)) {
      if (sample.timestamp > position.timestamp) return sample;
      sample.close();
    }
    return sink.getSample(position.timestamp);
  }
  const target = position.step === 'first' ? info.origin
    : position.step === 'last' || position.requested >= info.duration && !position.step ? Infinity
    : position.step === 'previous' ? position.timestamp - .5 / info.timeResolution
    : info.origin + position.requested;
  return sink.getSample(Math.max(info.origin, target));
}

export async function* extractionSamples(sink: VideoSampleSink, info: VideoInfo, plan: FramePlan) {
  if (plan.mode !== 'every') {
    yield* sink.samplesAtTimestamps(plan.mode === 'single' ? [plan.timestamp] : sampleTimes(plan, info.origin));
    return;
  }

  const origin = microseconds(info.origin);
  const start = origin + microseconds(plan.start);
  const end = origin + microseconds(plan.end);
  for await (const sample of sink.samples(start / 1_000_000, end / 1_000_000)) {
    // The sink can first yield the frame displayed at start, whose PTS precedes the range.
    const timestamp = microseconds(sample.timestamp);
    if (timestamp >= start && timestamp < end) yield sample;
    else sample.close();
  }
}

export async function encodeFrame(sample: VideoSample, settings: ImageSettings) {
  if (typeof OffscreenCanvas === 'undefined') throw new VideoError('encode');
  const { width, height } = settings.size;
  try {
    const canvas = new OffscreenCanvas(width, height);
    try {
      const ctx = canvas.getContext('2d', { alpha: settings.format !== 'jpeg', colorSpace: 'srgb' });
      if (!ctx) throw new VideoError('encode');
      // The sink applies rotation and flip metadata to the sample. Its drawing
      // API uses the visible rectangle and accounts for pixel aspect ratio.
      sample.draw(ctx, 0, 0, width, height);
      const mime = 'image/' + settings.format;
      const image = await canvas.convertToBlob({ type: mime, quality: settings.quality });
      if (!image.size || image.type !== mime) throw new VideoError('encode');
      return image;
    } finally {
      canvas.width = canvas.height = 0;
    }
  } catch {
    throw new VideoError('encode');
  }
}

export async function renderPreview(sample: VideoSample, info: VideoInfo) {
  const image = await encodeFrame(sample, { size: fitSize(info, { width: 1600, height: 1600 }), format: 'png', quality: 1 });
  return { timestamp: sample.timestamp, image };
}
