import type { JsonIndent } from './core';
import type { JsonOperation, JsonRequest, JsonResponse } from './protocol';

type WorkerPort = Pick<Worker, 'terminate' | 'onerror' | 'onmessageerror'> & {
  onmessage: ((event: MessageEvent<JsonResponse>) => void) | null;
  postMessage(message: JsonRequest): void;
};

export class JsonWorkerError extends Error {
  constructor(public readonly code: 'unavailable' | 'worker' | 'timeout' | 'cancelled') {
    super(code);
  }
}

function createWorker(): WorkerPort {
  if (typeof Worker === 'undefined') throw new JsonWorkerError('unavailable');
  return new Worker(new URL('./json.worker.ts', import.meta.url), { type: 'module', name: 't4f-json-workspace' });
}

type Pending = {
  timer: ReturnType<typeof setTimeout>;
  resolve(response: JsonResponse): void;
  reject(error: JsonWorkerError): void;
};

/** One reusable, tool-owned worker. A newer request can preempt active formatting. */
export class JsonProcessor {
  private worker?: WorkerPort;
  private pending = new Map<number, Pending>();
  private sequence = 0;
  private revision?: number;
  private formatting?: number;

  constructor(private readonly factory = createWorker, private readonly deadline = 12_000) {}

  async format(revision: number, text: string, indent: JsonIndent) {
    if (this.formatting !== undefined) this.clear();
    const id = ++this.sequence;
    this.formatting = id;
    try {
      const response = await this.send({
        kind: 'format', revision, indent,
        source: this.revision === revision ? undefined : text,
      }, id);
      if (response.kind !== 'format') throw new JsonWorkerError('worker');
      // Invalid documents were not indexed, so they still need their source on retry.
      this.revision = response.result.root ? revision : undefined;
      return response.result;
    } finally {
      if (this.formatting === id) this.formatting = undefined;
    }
  }

  async children(revision: number, node: number, offset: number) {
    const response = await this.send({ kind: 'children', revision, node, offset });
    if (response.kind !== 'children') throw new JsonWorkerError('worker');
    return response.nodes;
  }

  async path(revision: number, node: number) {
    const response = await this.send({ kind: 'path', revision, node });
    if (response.kind !== 'path') throw new JsonWorkerError('worker');
    return response.path;
  }

  clear(code: JsonWorkerError['code'] = 'cancelled') {
    const worker = this.worker;
    this.worker = undefined;
    if (worker) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
    }
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new JsonWorkerError(code));
    }
    this.pending.clear();
    this.revision = this.formatting = undefined;
  }

  private start() {
    if (this.worker) return this.worker;
    const worker = this.factory();
    this.worker = worker;
    worker.onmessage = ({ data }) => {
      if (this.worker !== worker) return;
      const request = this.pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(data.id);
      request.resolve(data);
    };
    worker.onerror = event => {
      event.preventDefault();
      if (this.worker === worker) this.clear('worker');
    };
    worker.onmessageerror = () => {
      if (this.worker === worker) this.clear('worker');
    };
    return worker;
  }

  private send(operation: JsonOperation, id = ++this.sequence): Promise<JsonResponse> {
    return new Promise((resolve, reject) => {
      try {
        const worker = this.start();
        const timer = setTimeout(() => this.clear('timeout'), this.deadline);
        this.pending.set(id, { timer, resolve, reject });
        worker.postMessage({ ...operation, id });
      } catch (error) {
        this.clear('worker');
        reject(error instanceof JsonWorkerError ? error : new JsonWorkerError('worker'));
      }
    });
  }
}
