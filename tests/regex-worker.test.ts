import { afterEach, it, expect, vi } from 'vitest';
import { runRegex } from '../src/tools/regex-tester/client';
const request = { pattern: 'a', flags: 'g', text: 'a', replacement: 'b' };
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.all.push(this);
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeWorker.all = [];
});
it('terminates the worker on success and on cancellation without accepting late results', async () => {
  vi.stubGlobal('Worker', FakeWorker);
  const controller = new AbortController();
  const job = runRegex(request, controller.signal),
    worker = FakeWorker.all[0];
  const result = { matches: [], replaced: 'b' };
  worker.onmessage!({ data: { result } });
  expect(await job).toEqual(result);
  expect(worker.terminate).toHaveBeenCalledOnce();
  const next = runRegex(request, controller.signal),
    late = FakeWorker.all[1],
    rejected = expect(next).rejects.toThrow('Cancelled');
  controller.abort();
  late.onmessage!({ data: { result } });
  await rejected;
  expect(late.terminate).toHaveBeenCalledOnce();
});
it('hard-stops a hung expression rather than blocking the page', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
  const job = runRegex(request, new AbortController().signal),
    rejected = expect(job).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(1500);
  await rejected;
  expect(FakeWorker.all[0].terminate).toHaveBeenCalledOnce();
});
