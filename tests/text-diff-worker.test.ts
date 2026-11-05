// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { runComparison, type DiffWorker, type DiffResponse } from '../src/tools/text-diff/comparison';
import { compareLines } from '../src/tools/text-diff/core';

function worker() {
  const mock: DiffWorker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() };
  return mock;
}
const request = { left: 'a', right: 'a\nb', ignore: false };
afterEach(() => vi.useRealTimers());
it('posts only the current input, delivers the real structure and terminates the finished worker', async () => {
  const mock = worker(), signal = new AbortController().signal;
  const promise = runComparison(request, signal, () => mock);
  expect(mock.postMessage).toHaveBeenCalledExactlyOnceWith(request);
  const result = compareLines(request.left, request.right);
  mock.onmessage!({ data: { result } } as MessageEvent<DiffResponse>);
  await expect(promise).resolves.toEqual(result);
  expect(mock.terminate).toHaveBeenCalledOnce();
  expect(mock.onmessage).toBeNull();
});
it('terminates superseded work and ignores a captured late response, without affecting the next request', async () => {
  const first = worker(), second = worker(), controller = new AbortController();
  const promise = runComparison(request, controller.signal, () => first);
  const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  const stale = first.onmessage!;
  controller.abort();
  stale({ data: { result: compareLines('wrong', 'outdated') } } as MessageEvent<DiffResponse>);
  await rejected;
  expect(first.terminate).toHaveBeenCalledOnce();
  const next = runComparison({ ...request, right: 'latest' }, new AbortController().signal, () => second);
  const latest = compareLines('a', 'latest');
  second.onmessage!({ data: { result: latest } } as MessageEvent<DiffResponse>);
  await expect(next).resolves.toEqual(latest);
});
it.each(['timeout', 'resource'] as const)('reports %s failures with no partial success', async error => {
  const mock = worker(), promise = runComparison(request, new AbortController().signal, () => mock);
  mock.onmessage!({ data: { error } } as MessageEvent<DiffResponse>);
  await expect(promise).rejects.toThrow(error === 'timeout' ? /timed out/ : /resources/);
  expect(mock.terminate).toHaveBeenCalledOnce();
});
it('cleans up startup, worker and malformed-message failures', async () => {
  await expect(runComparison(request, new AbortController().signal, () => { throw new Error('startup'); })).rejects.toThrow('Could not start background comparison');
  for (const kind of ['onerror', 'onmessageerror'] as const) {
    const mock = worker(), promise = runComparison(request, new AbortController().signal, () => mock);
    if (kind === 'onerror') mock.onerror!(new Event('error', { cancelable: true }) as ErrorEvent);
    else mock.onmessageerror!(new MessageEvent('messageerror'));
    await expect(promise).rejects.toThrow(/Background comparison failed/);
    expect(mock.terminate).toHaveBeenCalledOnce();
  }
});
it('enforces a wall-clock deadline that covers startup and tokenization, and supports already-aborted input', async () => {
  vi.useFakeTimers();
  const mock = worker(), promise = runComparison(request, new AbortController().signal, () => mock);
  const rejected = expect(promise).rejects.toThrow(/timed out/);
  await vi.advanceTimersByTimeAsync(5000);
  await rejected;
  expect(mock.terminate).toHaveBeenCalledOnce();
  const controller = new AbortController(); controller.abort();
  const factory = vi.fn();
  await expect(runComparison(request, controller.signal, factory)).rejects.toMatchObject({ name: 'AbortError' });
  expect(factory).not.toHaveBeenCalled();
});
