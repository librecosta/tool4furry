// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CodecRequest, Conversion } from '../src/tools/url-base64/core';
import { backgroundThreshold, conversionTimeout, runCodec } from '../src/tools/url-base64/processing';

class FakeWorker {
  static instances: FakeWorker[] = [];
  constructor() { FakeWorker.instances.push(this); }
  onmessage: ((event: { data: Conversion }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  onerror: ((event: { preventDefault(): void }) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}
const options = { family: 'url', direction: 'encode', variant: 'component' } as const;
const large: CodecRequest = { input: 'a'.repeat(backgroundThreshold), options };

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('converts short input locally and sends one full request for a large input', async () => {
  const signal = new AbortController().signal;
  expect(await runCodec({ input: '你好&', options }, signal)).toEqual({ output: '%E4%BD%A0%E5%A5%BD%26', characters: 3 });
  expect(FakeWorker.instances).toHaveLength(0);
  const pending = runCodec(large, signal);
  const [worker] = FakeWorker.instances;
  expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(large);
  worker.onmessage?.({ data: { output: large.input, characters: large.input.length } });
  expect(await pending).toEqual({ output: large.input, characters: large.input.length });
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(worker.onmessage).toBeNull();
});

it('terminates obsolete work and ignores late events while a new task completes', async () => {
  const obsolete = new AbortController();
  const old = runCodec(large, obsolete.signal);
  const [first] = FakeWorker.instances;
  const late = first.onmessage!;
  const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' });
  obsolete.abort();
  await rejected;
  const current = runCodec(large, new AbortController().signal);
  late({ data: { output: 'obsolete', characters: 1 } });
  const [, second] = FakeWorker.instances;
  second.onmessage?.({ data: { output: 'current', characters: 1 } });
  expect(await current).toEqual({ output: 'current', characters: 1 });
  expect(first.terminate).toHaveBeenCalledOnce();
  expect(second.terminate).toHaveBeenCalledOnce();
  await expect(runCodec(large, obsolete.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(FakeWorker.instances).toHaveLength(2);
});

it('handles timeout, runtime errors, messaging errors and missing support without blocking future work', async () => {
  vi.useFakeTimers();
  const signal = new AbortController().signal;
  const timeout = runCodec(large, signal);
  await vi.advanceTimersByTimeAsync(conversionTimeout);
  expect(await timeout).toEqual({ issue: 'timeout' });
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();

  const failed = runCodec(large, signal);
  const preventDefault = vi.fn();
  FakeWorker.instances[1].onerror?.({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(await failed).toEqual({ issue: 'worker' });
  expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce();

  const message = runCodec(large, signal);
  FakeWorker.instances[2].onmessageerror?.();
  expect(await message).toEqual({ issue: 'worker' });
  expect(FakeWorker.instances[2].terminate).toHaveBeenCalledOnce();

  vi.stubGlobal('Worker', undefined);
  expect(await runCodec(large, signal)).toEqual({ issue: 'worker' });
  expect(await runCodec({ input: 'x', options }, signal)).toEqual({ output: 'x', characters: 1 });
});
