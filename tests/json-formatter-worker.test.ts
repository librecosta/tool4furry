// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { JsonProcessor } from '../src/tools/json-formatter/processing';
import { createJsonWorkerHandler, type JsonRequest, type JsonResponse } from '../src/tools/json-formatter/protocol';

class WorkerHarness {
  private handle = createJsonWorkerHandler();
  onmessage: ((event: MessageEvent<JsonResponse>) => void) | null = null;
  onerror: Worker['onerror'] = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminate = vi.fn();
  sent: JsonRequest[] = [];
  postMessage(request: JsonRequest) { this.sent.push(request); }
  deliver() {
    this.onmessage?.({ data: this.handle(this.sent.at(-1)!) } as MessageEvent<JsonResponse>);
  }
}

afterEach(() => vi.useRealTimers());

it('keeps one worker, sends source only on a new revision and retrieves paged ranges without formatting', async () => {
  const port = new WorkerHarness();
  const factory = vi.fn(() => port);
  const worker = new JsonProcessor(factory);
  const source = '{"a.b":[9007199254740993,null]}';
  const initial = worker.format(1, source, 2);
  expect(port.sent[0]).toMatchObject({ kind: 'format', revision: 1, source, indent: 2 });
  port.deliver();
  expect(await initial).toMatchObject({ root: { count: 1 }, output: '{\n  "a.b": [\n    9007199254740993,\n    null\n  ]\n}' });

  const next = worker.format(1, source, 0);
  expect(port.sent[1]).toMatchObject({ kind: 'format', source: undefined });
  port.deliver();
  expect((await next).output).toBe(source);
  const children = worker.children(1, 1, 0);
  port.deliver();
  expect(await children).toMatchObject([{ id: 2, kind: 'number' }, { id: 3, kind: 'null' }]);
  const path = worker.path(1, 3);
  port.deliver();
  expect(await path).toBe('$["a.b"][1]');
  expect(factory).toHaveBeenCalledOnce();
  worker.clear();
  expect(port.terminate).toHaveBeenCalledOnce();
});

it('preempts obsolete work and rejects a late response from the terminated worker', async () => {
  const first = new WorkerHarness(), second = new WorkerHarness();
  const worker = new JsonProcessor(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));
  const old = worker.format(1, '[0]', 2);
  const abandoned = expect(old).rejects.toMatchObject({ code: 'cancelled' });
  const late = first.onmessage;
  const latest = worker.format(2, 'false', 0);
  expect(first.terminate).toHaveBeenCalledOnce();
  late?.({ data: { id: first.sent[0].id, kind: 'format', result: { issue: { code: 'resource' } } } } as MessageEvent<JsonResponse>);
  second.deliver();
  await abandoned;
  expect((await latest).output).toBe('false');
  worker.clear();
});

it('warns on timeout and on Worker errors, and can restart after the failure', async () => {
  vi.useFakeTimers();
  const first = new WorkerHarness(), second = new WorkerHarness(), third = new WorkerHarness();
  const worker = new JsonProcessor(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second).mockReturnValueOnce(third), 10);
  const timeout = expect(worker.format(1, '0', 2)).rejects.toMatchObject({ code: 'timeout' });
  vi.advanceTimersByTime(10);
  await timeout;
  expect(first.terminate).toHaveBeenCalledOnce();
  const error = expect(worker.format(2, 'null', 2)).rejects.toMatchObject({ code: 'worker' });
  second.onmessageerror?.({} as MessageEvent);
  await error;
  const latest = worker.format(3, '[null,]', 2);
  third.deliver();
  expect(await latest).toEqual({
    issue: { code: 'trailingComma', offset: 6, column: 7, line: 1 },
    root: undefined,
  });
  worker.clear();
});
