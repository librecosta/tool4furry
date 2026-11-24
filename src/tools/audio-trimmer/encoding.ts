import { AudioSample, AudioSampleSource, FlacOutputFormat, Mp3OutputFormat, Mp4OutputFormat,
  OggOutputFormat, Output, Quality, StreamTarget, WavOutputFormat, canEncodeAudio,
  type InputAudioTrack, type StreamTargetChunk } from 'mediabunny';
import { blobBudget, estimatedBytes, formats, type AudioInfo, type CutPlan, type Encoding, type Format } from './core';
import { MediaFailure, renderPlan } from './media';
import type { Capabilities } from './protocol';
import mp3WorkerUrl from '../../../node_modules/@mediabunny/mp3-encoder/dist/bundles/mediabunny-mp3-encoder.worker.js?url&no-inline';
import flacWorkerUrl from '../../../node_modules/@mediabunny/flac-encoder/dist/bundles/mediabunny-flac-encoder.worker.js?url&no-inline';

const flacRates = [8000, 16000, 22050, 24000, 32000, 44100, 48000, 88200, 96000, 176400, 192000];
const mp3Rates = [32000, 44100, 48000];
const containers = {
  mp3: () => new Mp3OutputFormat(),
  wav: (large: boolean) => new WavOutputFormat({ large }),
  flac: () => new FlacOutputFormat(),
  m4a: () => new Mp4OutputFormat({ fastStart: false }),
  ogg: () => new OggOutputFormat(),
};

export async function encodingOptions({ sampleRate, channels }: AudioInfo): Promise<Capabilities> {
  const options: Capabilities = { wav: { 0: sampleRate } };
  let wasmAvailable = false;
  try {
    // Compile a small i8x16.splat module to check SIMD and Worker CSP together.
    await WebAssembly.compile(Uint8Array.of(
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
      3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 253, 15, 11,
    ));
    wasmAvailable = true;
  } catch { /* Native WebCodecs and PCM remain available. */ }
  if (wasmAvailable) options.flac = { 0: flacRates.includes(sampleRate) ? sampleRate : 48000 };
  if (wasmAvailable) {
    options.mp3 = Object.fromEntries(formats.mp3.bitrates.map(bitrate =>
      [bitrate, mp3Rates.includes(sampleRate) || (bitrate === 128 && [16000, 22050, 24000].includes(sampleRate)) ? sampleRate : 44100]));
  }
  await Promise.all((['m4a', 'ogg'] as const).map(async format => {
    const optionsForFormat: Record<number, number> = {};
    for (const bitrate of formats[format].bitrates) {
      for (const rate of new Set(format === 'ogg' ? [48000] : [sampleRate, 48000, 44100])) {
        if (await canEncodeAudio(formats[format].codec, {
          sampleRate: rate, numberOfChannels: channels, bitrate: bitrate * 1000,
        }).catch(() => false)) {
          optionsForFormat[bitrate] = rate;
          break;
        }
      }
    }
    if (Object.keys(optionsForFormat).length) options[format] = optionsForFormat;
  }));
  return options;
}

async function prepare(format: Format) {
  if (format === 'mp3') {
    const { registerMp3Encoder } = await import('@mediabunny/mp3-encoder');
    Reflect.set(globalThis, Symbol.for('@mediabunny/mp3-encoder:workerUrl'), new URL(mp3WorkerUrl, location.origin));
    registerMp3Encoder();
  }
  if (format === 'flac') {
    const { registerFlacEncoder } = await import('@mediabunny/flac-encoder');
    Reflect.set(globalThis, Symbol.for('@mediabunny/flac-encoder:workerUrl'), new URL(flacWorkerUrl, location.origin));
    registerFlacEncoder();
  }
}

class BlobOutput {
  private static readonly blockSize = 1024 * 1024;
  private readonly blocks: Uint8Array<ArrayBuffer>[] = [];
  private size = 0;

  write({ data, position }: StreamTargetChunk) {
    if (position + data.length > blobBudget) throw new MediaFailure('outputSize');
    const blockSize = BlobOutput.blockSize;
    let offset = 0;
    while (offset < data.length) {
      const index = Math.floor(position / blockSize), local = position % blockSize;
      const chunk = this.blocks[index] ??= new Uint8Array(blockSize);
      const count = Math.min(blockSize - local, data.length - offset);
      chunk.set(data.subarray(offset, offset + count), local);
      position += count;
      offset += count;
    }
    this.size = Math.max(this.size, position);
  }

  finish(type: string) {
    const blockSize = BlobOutput.blockSize;
    return new Blob(Array.from({ length: Math.ceil(this.size / blockSize) }, (_, index) =>
      (this.blocks[index] ?? new Uint8Array(blockSize)).subarray(0, Math.min(blockSize, this.size - index * blockSize))),
    { type });
  }
}

export async function exportPlan(track: InputAudioTrack, info: AudioInfo, plan: CutPlan, encoding: Encoding,
  signal: AbortSignal, progress: (value: number) => void, write?: (chunk: StreamTargetChunk) => Promise<void>) {
  const { format, bitrate, sampleRate } = encoding;
  await prepare(format);
  signal.throwIfAborted();
  const container = formats[format];
  if (!await canEncodeAudio(container.codec, { sampleRate, numberOfChannels: info.channels, bitrate: bitrate * 1000 || undefined }))
    throw new MediaFailure('encode');
  const blob = write ? undefined : new BlobOutput();
  const target = new StreamTarget(new WritableStream({
    write: (chunk: StreamTargetChunk) => {
      signal.throwIfAborted();
      return write ? write(chunk) : blob!.write(chunk);
    },
  }), { chunked: true, chunkSize: 1024 * 1024 });
  const output = new Output({ format: containers[format](estimatedBytes(plan, info, encoding) >= 0xffffffff), target });
  const source = new AudioSampleSource({
    codec: container.codec,
    quality: bitrate ? new Quality({ bitrate: bitrate * 1000, bitrateMode: 'constant' }) : undefined,
    transform: sampleRate !== info.sampleRate ? { sampleRate } : undefined,
  });
  output.addAudioTrack(source);
  const cancel = () => { void output.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    await output.start();
    let last = -1;
    for await (const block of renderPlan(track, info, plan, 0, signal)) {
      const planar = new Float32Array(block.size * info.channels);
      block.data.forEach((channel, index) => planar.set(channel, index * block.size));
      const sample = new AudioSample({
        data: planar, format: 'f32-planar', numberOfChannels: info.channels,
        sampleRate: info.sampleRate, timestamp: block.output / info.sampleRate,
      });
      try {
        await source.add(sample);
      } finally {
        sample.close();
      }
      const percent = Math.floor((block.output + block.size) / plan.frames * 99);
      if (percent > last) progress((last = percent) / 100);
    }
    source.close();
    await output.finalize();
    signal.throwIfAborted();
    return blob?.finish(container.mime);
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
