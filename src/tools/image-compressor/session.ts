import { acceptImage } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { allowsAvifOutput, avifOutputLimits, resolveImageLimits, type ImageLimits } from '../image/limits';
import { AvifEncoder } from '../image/avif-encoder';
import { extension, ImageFailure, type ImageSource } from '../image/types';
import { SerialJobs } from '../image-converter/serial-jobs';
import { packZip } from '../image-converter/zip';
import { batchTime, taskFilename } from '../file-naming';
import { compressImage, recommendedSettings, sameCompressionSettings, validSettings, type CompressionSettings } from './compress';

export type CompressionResult = Awaited<ReturnType<typeof compressImage>> & {url: string};
export type CompressionTask = Readonly<{
  id: string; sequence: number; file: File; request: number;
  status: 'validating' | 'queued' | 'processing' | 'ready' | 'stale' | 'error';
  source?: ImageSource; sourceUrl?: string; result?: CompressionResult; error?: string;
}>;
export type CompressionView = Readonly<{
  tasks: readonly CompressionTask[]; settings: CompressionSettings; issues: readonly string[]; version: number;
}>;
export class CompressorSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  readonly limits: ImageLimits;
  readonly avifSupported: boolean;
  private avif = new AvifEncoder();
  private operations = new Map<string, AbortController>();
  private listeners = new Set<() => void>();
  private disposed = false;
  private sequence = 0;
  private activeFile?: {id: string; file: File};
  private archive?: AbortController;
  private urls = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly time = batchTime(new Date());
  private view: CompressionView = { tasks: [], settings: {...recommendedSettings}, issues: [], version: 0 };
  constructor(limits?: ImageLimits) {
    this.limits = limits ?? resolveImageLimits({userAgent: navigator.userAgent,
      mobile: (navigator as Navigator & {userAgentData?: {mobile?: boolean}}).userAgentData?.mobile,
      coarsePointer: typeof matchMedia === 'undefined' || matchMedia('(pointer: coarse)').matches});
    this.avifSupported = allowsAvifOutput(this.limits) && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
  }
  snapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<CompressionView>) {
    if (this.disposed) return;
    this.archive?.abort();
    this.view = {...this.view, ...patch, version: this.view.version + 1};
    this.listeners.forEach(listener => listener());
  }
  private task(id: string) { return this.view.tasks.find(task => task.id === id); }
  private patch(id: string, values: Partial<CompressionTask>) {
    this.publish({tasks: this.view.tasks.map(task => task.id === id ? {...task, ...values} : task)});
  }
  private valid(id: string, request: number) { return !this.disposed && this.task(id)?.request === request; }
  add(files: readonly File[]) {
    if (this.disposed) return;
    const tasks = [...this.view.tasks], issues: string[] = [];
    // Removal cancels publication, not the File retained by native work. Keep
    // that allocation in admission accounting until the active promise settles.
    const retained = this.activeFile && !tasks.some(task => task.id === this.activeFile!.id) ? this.activeFile.file : undefined;
    let total = tasks.reduce((sum, task) => sum + task.file.size, retained?.size ?? 0);
    const accepted: string[] = [];
    for (const file of files) {
      if (tasks.length + (retained ? 1 : 0) >= this.limits.files || file.size > this.limits.bytes || total + file.size > this.limits.totalBytes) {
        if (issues.length < 20) issues.push(file.name);
        continue;
      }
      const sequence = ++this.sequence, id = `compress-${sequence}`;
      tasks.push({id, sequence, file, request: 0, status: 'validating'});
      total += file.size; accepted.push(id);
    }
    this.publish({tasks, issues});
    for (const id of accepted) this.inspect(id);
  }
  private inspect(id: string) {
    const task = this.task(id); if (!task) return;
    const request = task.request;
    this.jobs.schedule(`intake-${id}`, async () => {
      if (!this.valid(id, request)) return;
      this.activeFile = {id, file: task.file};
      try {
        const source = await acceptImage(task.file, this.resources, this.limits);
        if (!this.valid(id, request)) return;
        this.patch(id, {source, sourceUrl: this.resources.url(source.blob), status: 'stale'});
      } catch (error) { if (this.valid(id, request)) this.patch(id, {status: 'error', error: error instanceof ImageFailure ? error.code : 'decode'}); }
      finally { this.activeFile = undefined; }
    }, () => { if (this.valid(id, request)) this.patch(id, {status: 'error', request: request + 1, error: 'timeout'}); });
  }
  configure(patch: Partial<CompressionSettings>) {
    const settings = {...this.view.settings, ...patch};
    if (!validSettings(settings)) return false;
    if (JSON.stringify(settings) === JSON.stringify(this.view.settings)) return true;
    if (sameCompressionSettings(settings, this.view.settings)) { this.publish({settings}); return true; }
    const tasks = this.view.tasks.map(task => {
      this.operations.get(task.id)?.abort();
      this.jobs.cancel(`encode-${task.id}`);
      if (task.result) this.resources.revoke(task.result.url);
      // A still-valid intake is independent of export settings.
      return task.source ? {...task, result: undefined, error: undefined, request: task.request + 1, status: 'stale' as const} : task;
    });
    this.publish({settings, tasks});
    return true;
  }
  start(id?: string) {
    for (const task of this.view.tasks) {
      if (id && task.id !== id || !task.source || ['validating', 'processing', 'queued'].includes(task.status) || task.result) continue;
      const request = task.request + 1, settings = {...this.view.settings};
      this.patch(task.id, {request, status: 'queued', error: undefined});
      const current = () => this.valid(task.id, request);
      this.jobs.schedule(`encode-${task.id}`, async () => {
        if (!current()) return;
        this.activeFile = {id: task.id, file: task.file};
        const controller = new AbortController(); this.operations.set(task.id, controller);
        const deadline = settings.format === 'avif' ? setTimeout(() => {
          if (current()) {
            controller.abort();
            this.patch(task.id, {request: request + 1, status: 'error', error: 'avifTimeout'});
          }
        }, avifOutputLimits.timeout) : undefined;
        this.patch(task.id, {status: 'processing'});
        try {
          const result = await compressImage(task.source!, settings, this.resources, this.limits, current, {avif: this.avif, signal: controller.signal});
          if (!current()) return;
          const used = this.view.tasks.reduce((sum, entry) => sum + (entry.result?.blob.size ?? 0), 0);
          if (used + result.blob.size > this.limits.totalBytes) throw new ImageFailure('bytes');
          this.patch(task.id, {status: 'ready', result: {...result, url: this.resources.url(result.blob)}});
        } catch (error) { if (current()) this.patch(task.id, {status: 'error', error: error instanceof ImageFailure ? error.code : 'encode'}); }
        finally {
          clearTimeout(deadline); this.activeFile = undefined;
          if (this.operations.get(task.id) === controller) this.operations.delete(task.id);
        }
      }, () => { if (current()) { this.operations.get(task.id)?.abort(); this.patch(task.id, {request: request + 1, status: 'error', error: 'timeout'}); } });
    }
  }
  retry(id: string) {
    const task = this.task(id); if (!task || task.status !== 'error') return;
    if (task.source) this.start(id);
    else { this.patch(id, {request: task.request + 1, status: 'validating', error: undefined}); this.inspect(id); }
  }
  cancel() {
    const tasks = this.view.tasks.map(task => {
      this.operations.get(task.id)?.abort();
      this.jobs.cancel(`encode-${task.id}`);
      this.jobs.cancel(`intake-${task.id}`);
      if (task.status === 'validating') return {...task, status: 'error' as const, request: task.request + 1, error: 'cancelled'};
      return ['processing', 'queued'].includes(task.status) ? {...task, status: 'stale' as const, request: task.request + 1} : task;
    });
    this.publish({tasks});
  }
  remove(id: string) {
    const task = this.task(id); if (!task) return;
    this.operations.get(id)?.abort();
    this.jobs.cancel(`intake-${id}`); this.jobs.cancel(`encode-${id}`);
    if (task.sourceUrl) this.resources.revoke(task.sourceUrl);
    if (task.result) this.resources.revoke(task.result.url);
    this.publish({tasks: this.view.tasks.filter(entry => entry.id !== id)});
  }
  clear() { for (const task of [...this.view.tasks]) this.remove(task.id); this.publish({issues: []}); }
  filename(task: CompressionTask) {
    return taskFilename({time: this.time, sequence: task.sequence, source: task.file.name, extension: extension[task.result?.format ?? this.view.settings.format], label: 'compressed'}).name;
  }
  save(blob: Blob, name: string) {
    if (this.disposed) return;
    const url = this.resources.url(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click();
    this.urls.set(url, setTimeout(() => { this.resources.revoke(url); this.urls.delete(url); }, 1000));
  }
  download(id: string) { const task = this.task(id); if (task?.status === 'ready' && task.result) this.save(task.result.blob, this.filename(task)); }
  previewFailed(id: string) {
    const task = this.task(id); if (!task) return;
    if (task.result) this.resources.revoke(task.result.url);
    this.patch(id, {result: undefined, request: task.request + 1, status: 'error', error: 'decode'});
  }
  async zip() {
    const snapshot = this.view;
    if (snapshot.tasks.some(task => ['validating', 'queued', 'processing', 'stale'].includes(task.status))) throw new Error('pending');
    const entries = snapshot.tasks.flatMap(task => task.status === 'ready' && task.result ? [{name: this.filename(task), blob: task.result.blob}] : []);
    if (!entries.length) throw new Error('empty');
    this.archive?.abort();
    const controller = new AbortController(); this.archive = controller;
    try {
      const blob = await packZip(entries, controller.signal);
      if (this.disposed || this.view !== snapshot || controller.signal.aborted) throw new Error('changed');
      this.save(blob, `t4f-${this.time}-compressed.zip`);
      return entries.length;
    } finally { if (this.archive === controller) this.archive = undefined; }
  }
  dispose() {
    this.clear(); this.disposed = true; this.archive?.abort(); this.jobs.dispose(); this.avif.dispose(); this.operations.clear(); this.listeners.clear();
    for (const [url, timer] of this.urls) { clearTimeout(timer); this.resources.revoke(url); } this.urls.clear();
  }
}
