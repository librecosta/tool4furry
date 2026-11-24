
/** @vitest-environment node */
import { unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { videoArchive } from '../src/tools/video-frame-extractor/archive';
import {
  checkSize, displayTime, frameName, framePlan, inputLimit, memoryLimit, outputSize, parseTime,
  relativeTime, sampleTimes, sheetLayout,
} from '../src/tools/video-frame-extractor/core';

const interval = { mode: 'interval', start: '0.250', end: '2.250', interval: '0.5', sampling: 'seconds', count: '5' } as const;

describe('precise extraction plans', () => {
  it('preserves microseconds for PTS names and parses long relative seek positions', () => {
    expect(parseTime('01:02:03.123456')).toBe(3723.123456);
    expect(parseTime('74:01.005')).toBe(4441.005);
    expect(displayTime(3599.9995)).toBe('01:00:00.000');
    expect(relativeTime(2.033333333, 2)).toBe(.033333);
    expect(frameName('夏%?:.mp4', 3600.125123, 1, 'jpeg')).toBe('夏%__-01-00-00.125123-0001.jpg');
    for (const value of ['2:60', '0:60:00', '-1', '1e3', 'Infinity', '', '0.1234567']) {
      expect(() => parseTime(value)).toThrow();
    }
  });

  it('uses exact raw PTS for single mode and stays half-open in all batch modes', () => {
    expect(framePlan({ ...interval, mode: 'single' }, 0, -.125)).toEqual({ mode: 'single', timestamp: -.125 });
    expect(framePlan({ ...interval, mode: 'every' }, 4)).toEqual({ mode: 'every', start: .25, end: 2.25 });
    const plan = framePlan(interval, 4);
    if (plan.mode !== 'interval') throw new Error('Expected interval plan');
    expect([...sampleTimes(plan, 2)]).toEqual([2.25, 2.75, 3.25, 3.75]);
    expect(() => framePlan({ ...interval, start: '2.25' }, 4)).toThrow();
    expect(() => framePlan(interval, 2)).toThrow();
    for (const value of ['0', '-1', 'x', '0.0001']) expect(() => framePlan({ ...interval, interval: value }, 4)).toThrow();
  });

  it('places count samples at start plus i × range/N and retains phase for fractional FPS', () => {
    const plan = framePlan({ ...interval, mode: 'count', count: '1' }, 4);
    const count = framePlan({ ...interval, mode: 'count', count: '4' }, 4);
    const fps = framePlan({ ...interval, start: '0', end: '3600', sampling: 'fps', interval: '29.97' }, 3600);
    if (plan.mode !== 'count' || count.mode !== 'count' || fps.mode !== 'interval') throw new Error('Expected sampling plans');
    expect([...sampleTimes(plan, 2)]).toEqual([2.25]);
    expect([...sampleTimes(count, 2)]).toEqual([2.25, 2.75, 3.25, 3.75]);
    const times = [...sampleTimes(fps, 0)];
    expect(times.length).toBe(107892);
    expect(times.at(-1)).toBeCloseTo((times.length - 1) / 29.97, 6);
    expect(times.at(-1)).toBeLessThan(3600);
    expect(() => framePlan({ ...interval, mode: 'count', count: '2.1' }, 4)).toThrow();
  });

  it('keeps display proportions for portrait, original 8K and custom shrink bounds', () => {
    expect(inputLimit).toBe(2 ** 31);
    expect(outputSize({ width: 2160, height: 3840 }, '1080', { width: 0, height: 0 })).toEqual({ width: 1080, height: 1920 });
    expect(outputSize({ width: 1920, height: 1080 }, 'custom', { width: 640, height: 640 })).toEqual({ width: 640, height: 360 });
    expect(outputSize({ width: 480, height: 360 }, '720', { width: 0, height: 0 })).toEqual({ width: 480, height: 360 });
    expect(outputSize({ width: 7680, height: 4320 }, 'original', { width: 0, height: 0 })).toEqual({ width: 7680, height: 4320 });
    expect(() => checkSize({ width: 10000, height: 4100 })).toThrow();
    expect(() => checkSize({ width: 0, height: 400 })).toThrow();
  });

  it('sizes contact sheets with bounded columns, labels and pixel area', () => {
    const settings = { columns: 3, thumbnail: 200, timestamps: true, format: 'png' } as const;
    expect(sheetLayout(7, settings)).toMatchObject({ width: 648, height: 608, cols: 3, imageHeight: 144 });
    expect(sheetLayout(2, { ...settings, timestamps: false }).height).toBe(233);
    expect(() => sheetLayout(0, settings)).toThrow();
    expect(() => sheetLayout(300, { ...settings, columns: 12, thumbnail: 640 })).toThrow();
  });
});

describe('streaming classic ZIP', () => {
  it('writes store entries with backpressure and returns correct ordered UTF-8 names', async () => {
    const parts: Uint8Array<ArrayBuffer>[] = [];
    const write = vi.fn(async (chunk: Uint8Array<ArrayBuffer>) => { parts.push(chunk); });
    const sink = { write, close: vi.fn(async () => {}), abort: vi.fn(async () => {}) };
    const archive = videoArchive(new AbortController().signal, sink);
    const image = new Blob([new Uint8Array(2 ** 20 + 1).fill(39)]);
    await archive.add('视频-0001.png', image);
    expect(write.mock.calls.some(([buffer]) => buffer.length === 2 ** 20)).toBe(true);
    expect(sink.close).not.toHaveBeenCalled();
    await archive.add('视频-0002.jpg', new Blob(['frame2']));
    expect(await archive.finish()).toBeUndefined();
    expect(sink.close).toHaveBeenCalledOnce();
    await archive.dispose();
    expect(sink.abort).not.toHaveBeenCalled();
    const files = unzipSync(new Uint8Array(await new Blob(parts).arrayBuffer()));
    expect(Object.keys(files)).toEqual(['视频-0001.png', '视频-0002.jpg']);
    expect(files['视频-0001.png'].at(-1)).toBe(39);
    expect(new TextDecoder().decode(files['视频-0002.jpg'])).toBe('frame2');
  });

  it('aborts the writable on cancellation and rejects byte budgets before reading any image', async () => {
    const controller = new AbortController();
    const sink = { write: vi.fn(async () => { controller.abort(); }), close: vi.fn(async () => {}), abort: vi.fn(async () => {}) };
    const archive = videoArchive(controller.signal, sink);
    await expect(archive.add('frame.png', new Blob(['x']))).rejects.toMatchObject({ name: 'AbortError' });
    await archive.dispose();
    expect(sink.abort).toHaveBeenCalledOnce();
    expect(sink.close).not.toHaveBeenCalled();
    const inMemory = videoArchive(new AbortController().signal);
    const slice = vi.fn();
    await expect(inMemory.add('frame.png', { size: memoryLimit, slice } as unknown as Blob)).rejects.toMatchObject({ code: 'zipBudget' });
    expect(slice).not.toHaveBeenCalled();
    const direct = videoArchive(new AbortController().signal, sink);
    await expect(direct.add('frame.png', { size: 2 ** 32, slice } as unknown as Blob)).rejects.toMatchObject({ code: 'zipFormat' });
    await direct.dispose();
    await inMemory.dispose();
  });
});
