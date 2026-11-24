import { describe, expect, it } from 'vitest';
import { blobBudget, displayTime, estimatedBytes, gainAt, inputBudget, makePlan, outputAt, parseTime, sourceAt } from '../src/tools/audio-trimmer/core';
import { analyzePeaks, inspect, readAudio } from '../src/tools/audio-trimmer/media';
import { exportPlan } from '../src/tools/audio-trimmer/encoding';

function stereoWav() {
  const array = new ArrayBuffer(44 + 8 * 2 * 2);
  const data = new DataView(array);
  const text = (at: number, value: string) => new Uint8Array(array, at, value.length).set(new TextEncoder().encode(value));
  text(0, 'RIFF');
  data.setUint32(4, array.byteLength - 8, true);
  text(8, 'WAVEfmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, 8000, true);
  data.setUint32(28, 32000, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  text(36, 'data');
  data.setUint32(40, 32, true);
  [4096, -8192, 0, 16384, 8192, 0, 16384, -4096, 0, -28672, -8192, 0, 32767, -32768, 4096, 8192]
    .forEach((sample, index) => data.setInt16(44 + index * 2, sample, true));
  return new Blob([array], { type: 'audio/wav' });
}

function wavFrames(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const label = (at: number) => new TextDecoder().decode(buffer.slice(at, at + 4));
  expect(label(0)).toBe('RIFF');
  expect(label(8)).toBe('WAVE');
  expect(view.getUint32(4, true) + 8).toBe(buffer.byteLength);
  const value: Record<string, number[]> = {};
  for (let cursor = 12; cursor + 8 <= buffer.byteLength;) {
    const length = view.getUint32(cursor + 4, true);
    if (label(cursor) === 'fmt ') {
      value.format = [view.getUint16(cursor + 8, true), view.getUint16(cursor + 10, true),
        view.getUint32(cursor + 12, true), view.getUint16(cursor + 22, true)];
    } else if (label(cursor) === 'data') {
      value.samples = Array.from({ length: length / 2 }, (_, index) => view.getInt16(cursor + 8 + index * 2, true));
    }
    cursor += 8 + length + (length % 2);
  }
  return value;
}
const signal = new AbortController().signal;

describe('Audio Trimmer sample plan', () => {
  const info = { frames: 160000, sampleRate: 48000, channels: 1, origin: 0 };
  it('parses millisecond edits and keeps h:mm:ss time on a two-hour file', () => {
    expect(parseTime('01:05.001')).toBe(65.001);
    expect(parseTime('02:09:42.688')).toBe(7782.688);
    expect(displayTime(7782.688)).toBe('02:09:42.688');
    for (const value of ['', '1:60', '1:61:59.999', '1.1234', '1e4', '-1']) expect(parseTime(value)).toBeNaN();
  });
  it('maps retained output through a removal gap and rejects empty or oversized fades', () => {
    const { plan } = makePlan(info, 'remove', 1.001, 2.001, 0.001, 0.001);
    expect(plan?.spans).toEqual([{ from: 0, to: 48048, output: 0 }, { from: 96048, to: 160000, output: 48048 }]);
    expect(plan?.frames).toBe(112000);
    expect(outputAt(plan!, 55000)).toBe(48048);
    expect(sourceAt(plan!, 48048)).toBe(96048);
    expect(gainAt(plan!, 0)).toBe(0);
    expect(gainAt(plan!, 48048)).toBe(1);
    expect(gainAt(plan!, 111999)).toBe(0);
    expect(makePlan(info, 'remove', 0, 160000 / 48000, 0, 0)).toEqual({ error: 'empty' });
    expect(makePlan(info, 'keep', 1, 1, 0, 0)).toEqual({ error: 'range' });
    expect(makePlan(info, 'keep', 0, 0.501, 0.4, 0.2)).toEqual({ error: 'fade' });
    expect(estimatedBytes(plan!, info, { format: 'wav', sampleRate: 48000, bitrate: 0 })).toBeLessThan(blobBudget);
  });
});

describe('bounded audio pipeline', () => {
  it('reads min/max from both channels and exports intact stereo PCM boundaries', async () => {
    await readAudio(stereoWav(), async track => {
      const info = await inspect(track);
      expect(info).toEqual({ frames: 8, sampleRate: 8000, channels: 2, origin: 0 });
      const peaks = await analyzePeaks(track, info, 0, 8, 4, signal);
      expect(peaks.min[2]).toBeCloseTo(-0.875);
      expect(peaks.max[0]).toBeCloseTo(0.5);
      const { plan } = makePlan(info, 'keep', 1 / 8000, 4 / 8000, 0, 0);
      const blob = await exportPlan(track, info, plan!, { format: 'wav', bitrate: 0, sampleRate: 8000 }, signal, () => {});
      expect(blob?.type).toBe('audio/wav');
      expect(wavFrames(await blob!.arrayBuffer())).toEqual({
        format: [1, 2, 8000, 16],
        samples: [0, 16384, 8192, 0, 16384, -4096],
      });
    });
  });

  it('writes both sides of a removal in order and applies fades at the outer edges', async () => {
    await readAudio(stereoWav(), async track => {
      const info = await inspect(track);
      const { plan } = makePlan(info, 'remove', 2 / 8000, 5 / 8000, 2 / 8000, 2 / 8000);
      const blob = await exportPlan(track, info, plan!, { format: 'wav', bitrate: 0, sampleRate: 8000 }, signal, () => {});
      expect(wavFrames(await blob!.arrayBuffer()).samples).toEqual([0, 0, 0, 16384, -8192, 0, 32767, -32768, 0, 0]);
    });
  });

  it('rejects empty, oversized and unrecognized input before analysis', async () => {
    await expect(readAudio(new Blob(), inspect)).rejects.toMatchObject({ code: 'inputSize' });
    const oversized = new Blob(['size guard']);
    Object.defineProperty(oversized, 'size', { value: inputBudget + 1 });
    await expect(readAudio(oversized, inspect)).rejects.toMatchObject({ code: 'inputSize' });
    await expect(readAudio(new Blob(['not audio'], { type: 'audio/wav' }), inspect)).rejects.toMatchObject({ code: 'inputFormat' });
  });

  it('skips encoding for a pre-aborted task', async () => {
    await readAudio(stereoWav(), async track => {
      const info = await inspect(track);
      const { plan } = makePlan(info, 'keep', 0, 8 / 8000, 0, 0);
      const abort = new AbortController();
      abort.abort();
      const progress = () => { throw new Error('Aborted task did work'); };
      await expect(exportPlan(track, info, plan!, { format: 'wav', bitrate: 0, sampleRate: 8000 }, abort.signal, progress))
        .rejects.toThrow(/abort/i);
    });
  });
});
