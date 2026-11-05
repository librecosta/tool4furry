import { HashError, validDigest, type HashAlgorithm, type HashFailure } from './core';
import type { HashRequest, HashResponse } from './protocol';
export type HashTask = {
  id: string; file: File; algorithm: HashAlgorithm;
  status: 'queued' | 'processing' | 'ready' | 'error' | 'cancelled';
  progress: number; digest?: string; error?: HashFailure; expected: string;
};
type Snapshot = { algorithm: HashAlgorithm; items: readonly HashTask[]; selectedId?: string };
export interface HashWorker {
  onmessage: ((event: MessageEvent<HashResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(data: HashRequest): void;
  terminate(): void;
}
function workerFactory(): HashWorker {
  if (typeof Worker === 'undefined') throw new HashError('unsupported');
  return new Worker(new URL('./hash.worker.ts', import.meta.url), { type: 'module', name: 't4f-file-hash' });
}
/** File Hash only: stable File owners and one active worker request, never a global store. */
export class HashQueue {
  private state: Snapshot = { algorithm: 'md5', items: [] };
  private listeners = new Set<() => void>();
  private sequence = 0;
  private worker?: HashWorker;
  private active?: string;
  private disposed = false;
  constructor(private readonly createWorker = workerFactory) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: Snapshot) { this.state = next; this.listeners.forEach(listener => listener()); }
  private patch(id: string, patch: Partial<HashTask>) {
    this.publish({ ...this.state, items: this.state.items.map(item => item.id === id ? { ...item, ...patch } : item) });
  }
  private stop() {
    if (this.worker) {
      this.worker.onmessage = this.worker.onerror = this.worker.onmessageerror = null;
      this.worker.terminate(); this.worker = undefined;
    }
    this.active = undefined;
  }
  activate() { this.disposed = false; this.pump(); }
  dispose() {
    this.disposed = true; this.stop();
    // Strict Mode may attach again immediately; keep File owners stable.
    this.state = { ...this.state, items: this.state.items.map(item => item.status === 'processing' ? { ...item, status: 'queued', progress: 0 } : item) };
  }
  add(files: readonly File[]) {
    if (this.disposed || !files.length) return;
    const added = files.map(file => ({ id: `hash-${++this.sequence}`, file, algorithm: this.state.algorithm, status: 'queued' as const, progress: 0, expected: '' }));
    this.publish({ ...this.state, items: [...this.state.items, ...added], selectedId: this.state.selectedId ?? added[0].id }); this.pump();
  }
  select(id: string) { if (this.state.items.some(item => item.id === id)) this.publish({ ...this.state, selectedId: id }); }
  setExpected(id: string, expected: string) { this.patch(id, { expected }); }
  setAlgorithm(algorithm: HashAlgorithm) {
    if (this.state.algorithm === algorithm) return;
    this.stop();
    this.publish({ ...this.state, algorithm, items: this.state.items.map(item => ({ id: item.id, file: item.file, algorithm, status: 'queued', progress: 0, expected: '' })) }); this.pump();
  }
  remove(id: string) {
    if (id === this.active) this.stop();
    const items = this.state.items.filter(item => item.id !== id);
    this.publish({ ...this.state, items, selectedId: this.state.selectedId === id ? items[0]?.id : this.state.selectedId }); this.pump();
  }
  cancel() {
    this.stop();
    this.publish({ ...this.state, items: this.state.items.map(item => ['queued', 'processing'].includes(item.status) ? { ...item, status: 'cancelled', progress: 0 } : item) });
  }
  retry(id?: string) {
    this.publish({ ...this.state, items: this.state.items.map(item => (!id || id === item.id) && ['error', 'cancelled'].includes(item.status) ? { ...item, status: 'queued', progress: 0, error: undefined } : item) }); this.pump();
  }
  clear() { this.stop(); this.publish({ algorithm: 'md5', items: [] }); }
  private pump() {
    if (this.disposed || this.active) return;
    const task = this.state.items.find(item => item.status === 'queued');
    if (!task) return;
    this.active = task.id; this.patch(task.id, { status: 'processing', progress: 0 });
    const fail = (code: HashFailure) => {
      this.stop(); this.patch(task.id, { status: 'error', error: code });
      queueMicrotask(() => this.pump());
    };
    try {
      const worker = this.worker ??= this.createWorker();
      const valid = () => !this.disposed && this.worker === worker && this.active === task.id && this.state.algorithm === task.algorithm;
      worker.onmessage = ({ data }) => {
        if (!valid() || data.id !== task.id || data.algorithm !== task.algorithm) return;
        if (data.type === 'progress') {
          if (!Number.isFinite(data.loaded) || data.total !== task.file.size || data.loaded < 0 || data.loaded > data.total) return;
          this.patch(task.id, { progress: Math.max(this.state.items.find(item => item.id === task.id)!.progress, data.total ? data.loaded / data.total : 1) });
        } else if (data.type === 'result') {
          if (!validDigest(data.digest, task.algorithm)) { fail('worker'); return; }
          this.active = undefined; this.patch(task.id, { status: 'ready', digest: data.digest.toLowerCase(), progress: 1 }); this.pump();
        } else if (data.type === 'error') fail(data.code);
      };
      worker.onerror = event => { event.preventDefault(); if (valid()) fail('worker'); };
      worker.onmessageerror = () => { if (valid()) fail('worker'); };
      worker.postMessage({ id: task.id, algorithm: task.algorithm, file: task.file });
    } catch (error) { fail(error instanceof HashError ? error.code : 'worker'); }
  }
}
