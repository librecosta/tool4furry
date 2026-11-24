import { ADTS, FLAC, MATROSKA, MP3, MP4, OGG, QTFF, WAVE, WEBM,
  AudioSampleSink, BlobSource, Input, UnsupportedInputFormatError, type InputAudioTrack } from 'mediabunny';
import { gainAt, inputBudget, type AudioInfo, type CutPlan, type Span } from './core';

export type Peaks = {
  from: number;
  to: number;
  min: Float32Array<ArrayBuffer>;
  max: Float32Array<ArrayBuffer>;
};
export type AudioError = 'inputSize' | 'inputFormat' | 'channels' | 'decode' | 'encode' | 'outputSize' | 'write' | 'playback';

export class MediaFailure extends Error {
  constructor(readonly code: AudioError) { super(code); }
}

export async function readAudio<T>(file: Blob, task: (track: InputAudioTrack) => Promise<T>) {
  if (!file.size || file.size > inputBudget) throw new MediaFailure('inputSize');
  const input = new Input({ source: new BlobSource(file), formats: [WAVE, MP3, FLAC, MP4, QTFF, ADTS, OGG, WEBM, MATROSKA] });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !await track.canDecode()) throw new MediaFailure('inputFormat');
    return await task(track);
  } catch (error) {
    if (error instanceof UnsupportedInputFormatError) throw new MediaFailure('inputFormat');
    throw error;
  } finally {
    input.dispose();
  }
}

export async function inspect(track: InputAudioTrack): Promise<AudioInfo> {
  const [sampleRate, channels, first] = await Promise.all([
    track.getSampleRate(), track.getNumberOfChannels(), track.getFirstTimestampOrNull(),
  ]);
  if (channels !== 1 && channels !== 2) throw new MediaFailure('channels');
  if (first === null || !Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new MediaFailure('inputFormat');
  const origin = Math.max(0, first);
  const end = await track.computeDuration();
  const frames = Math.round((end - origin) * sampleRate);
  if (!Number.isSafeInteger(frames) || frames < 1) throw new MediaFailure('inputFormat');
  return { sampleRate, channels, frames, origin };
}

type Samples = {
  source: number;
  size: number;
  data: Float32Array<ArrayBuffer>[];
};

// Request one extra frame before the edit to cover decoder timestamp quantization.
export async function* pcm(track: InputAudioTrack, info: AudioInfo, from: number, to: number, signal: AbortSignal) {
  const sink = new AudioSampleSink(track);
  const presentation = (frame: number) => info.origin + frame / info.sampleRate;
  for await (const sample of sink.samples(presentation(Math.max(0, from - 1)), presentation(to))) {
    let result: Samples | undefined;
    try {
      signal.throwIfAborted();
      if (sample.sampleRate !== info.sampleRate || sample.numberOfChannels !== info.channels)
        throw new MediaFailure('decode');
      const at = Math.round((sample.timestamp - info.origin) * info.sampleRate);
      const start = Math.max(at, from);
      const end = Math.min(at + sample.numberOfFrames, to);
      if (start >= end) continue;
      const size = end - start;
      const data = Array.from({ length: info.channels }, (_, planeIndex) => {
        const plane = new Float32Array(size);
        sample.copyTo(plane, { planeIndex, frameOffset: start - at, frameCount: size, format: 'f32-planar' });
        return plane;
      });
      result = { source: start, size, data };
    } finally {
      sample.close();
    }
    if (result) yield result;
  }
}

export async function analyzePeaks(track: InputAudioTrack, info: AudioInfo, from: number, to: number, bins: number,
  signal: AbortSignal, progress?: (ratio: number) => void): Promise<Peaks & { decodedEnd: number }> {
  const count = Math.min(bins, to - from);
  const min = new Float32Array(count).fill(Infinity);
  const max = new Float32Array(count).fill(-Infinity);
  const scale = count / (to - from);
  let decodedEnd = from, reported = -1;
  for await (const block of pcm(track, info, from, to, signal)) {
    const first = block.data[0], second = block.data[1];
    for (let i = 0; i < block.size; i++) {
      const bin = Math.min(count - 1, Math.floor((block.source + i - from) * scale));
      const a = first[i], b = second?.[i] ?? a;
      min[bin] = Math.min(min[bin], a, b);
      max[bin] = Math.max(max[bin], a, b);
    }
    decodedEnd = Math.max(decodedEnd, block.source + block.size);
    const percent = Math.floor((decodedEnd - from) / (to - from) * 100);
    if (percent > reported) {
      reported = percent;
      progress?.(percent / 100);
    }
  }
  if (decodedEnd === from) throw new MediaFailure('decode');
  for (let bin = 0; bin < count; bin++) {
    if (!Number.isFinite(min[bin])) min[bin] = max[bin] = 0;
  }
  return { from, to, min, max, decodedEnd };
}

export type OutputBlock = { output: number; size: number; data: Float32Array<ArrayBuffer>[] };

export async function* renderPlan(track: InputAudioTrack, info: AudioInfo, plan: CutPlan,
  firstOutput: number, signal: AbortSignal): AsyncGenerator<OutputBlock> {
  for (const span of plan.spans) {
    const start = span.from + Math.max(0, firstOutput - span.output);
    if (start >= span.to) continue;
    yield* renderSpan(track, info, plan, span, start, signal);
  }
}

async function* renderSpan(track: InputAudioTrack, info: AudioInfo, plan: CutPlan, span: Span, start: number,
  signal: AbortSignal): AsyncGenerator<OutputBlock> {
  let next = start;
  for await (const block of pcm(track, info, start, span.to, signal)) {
    if (block.source > next) throw new MediaFailure('decode');
    const skip = Math.max(0, next - block.source);
    if (skip >= block.size) continue;
    const size = block.size - skip;
    const output = span.output + next - span.from;
    const data = block.data.map(channel => channel.subarray(skip));
    if (plan.fadeIn || plan.fadeOut) {
      for (let i = 0; i < size; i++) {
        const gain = gainAt(plan, output + i);
        for (const channel of data) channel[i] *= gain;
      }
    }
    yield { output, size, data };
    next += size;
  }
  if (next !== span.to) throw new MediaFailure('decode');
}
