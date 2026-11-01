import { acceptImage, decodeChecked, toBlob } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { resolveImageLimits, type ImageLimits } from '../image/limits';
import { SerialJobs } from '../image-converter/serial-jobs';
import { packZip } from '../image-converter/zip';
import { batchTime, taskFilename } from '../file-naming';
import { extension, type ImageSource } from '../image/types';
import { defaults, renderWatermark, validSettings, type WatermarkSettings } from './render';

export type Task = Readonly<{id: string; sequence: number; file: File; source?: ImageSource; thumbnail?: string;
  status: 'checking' | 'idle' | 'queued' | 'processing' | 'ready' | 'error' | 'stale'; error?: string; result?: Blob; request: number}>;
export type View = Readonly<{tasks: readonly Task[]; settings: WatermarkSettings; selected?: string;
  preview?: HTMLCanvasElement; watermark?: {source: ImageSource; preview: HTMLCanvasElement}; assetBusy: boolean; error?: string; version: number}>;
export class WatermarkSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  readonly limits: ImageLimits;
  readonly time = batchTime(new Date());
  private listeners = new Set<() => void>();
  private sequence = 0;
  private disposed = false;
  private previewTicket = 0;
  private assetTicket = 0;
  private assetBytes = 0;
  private zipController?: AbortController;
  private downloadURLs = new Map<string, ReturnType<typeof setTimeout>>();
  private state: View = {tasks: [], settings: defaults, assetBusy: false, version: 0};
  constructor(limits?: ImageLimits) {
    this.limits = limits ?? resolveImageLimits({userAgent: navigator.userAgent, coarsePointer: matchMedia('(pointer: coarse)').matches});
  }
  get snapshot() { return this.state; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<View>) {
    if (this.disposed) return;
    this.zipController?.abort(); this.zipController = undefined;
    this.state = {...this.state, ...patch}; this.listeners.forEach(listener => listener());
  }
  private patch(id: string, change: Partial<Task>) { this.emit({tasks: this.state.tasks.map(task => task.id === id ? {...task, ...change} : task)}); }
  private active(id: string, request: number, version = this.state.version) {
    return !this.disposed && version === this.state.version && this.state.tasks.some(task => task.id === id && task.request === request);
  }
  private async bounded(source: ImageSource, edge: number) {
    const bitmap = await decodeChecked(source.blob, source.info, this.resources, this.limits);
    let canvas: HTMLCanvasElement | undefined;
    try {
      const scale = Math.min(1, edge / Math.max(source.width, source.height));
      canvas = this.resources.canvas(Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)));
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('draw');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch (error) { if (canvas) this.resources.release(canvas); throw error; }
    finally { this.resources.close(bitmap); }
  }
  add(files: readonly File[]) {
    if (this.disposed) return;
    let bytes = this.state.tasks.reduce((n, task) => n + task.file.size, this.assetBytes), count = this.state.tasks.length;
    const added: Task[] = []; let rejected = false;
    for (const file of files) {
      if (count >= this.limits.files || !file.size || file.size > this.limits.bytes || bytes + file.size > this.limits.totalBytes) { rejected = true; continue; }
      const sequence = ++this.sequence;
      added.push({id: `watermark-${sequence}`, sequence, file, status: 'checking', request: 0}); bytes += file.size; count++;
    }
    this.emit({tasks: [...this.state.tasks, ...added], error: rejected ? 'budget' : undefined});
    for (const task of added) this.jobs.schedule(`intake:${task.id}`, async () => {
      let thumb: HTMLCanvasElement | undefined;
      try {
        const source = await acceptImage(task.file, this.resources, this.limits);
        if (!this.active(task.id, task.request)) return;
        thumb = await this.bounded(source, 96);
        const blob = await toBlob(thumb, 'image/png');
        if (!this.active(task.id, task.request)) return;
        const thumbnail = this.resources.url(blob);
        this.patch(task.id, {source, thumbnail, status: 'idle'});
        if (!this.state.selected) this.select(task.id);
      } catch { if (this.active(task.id, task.request)) this.patch(task.id, {status: 'error', error: 'input'}); }
      finally { if (thumb) this.resources.release(thumb); }
    }, () => { this.patch(task.id, {request: task.request + 1, status: 'error', error: 'timeout'}); });
  }
  select(id: string) {
    if (this.disposed || !this.state.tasks.some(task => task.id === id && task.source)) return;
    const ticket = ++this.previewTicket;
    if (this.state.preview) this.resources.release(this.state.preview);
    this.emit({selected: id, preview: undefined});
    const source = this.state.tasks.find(task => task.id === id)!.source!;
    this.jobs.schedule('preview', async () => {
      let canvas: HTMLCanvasElement | undefined;
      try {
        canvas = await this.bounded(source, 1200);
        if (ticket !== this.previewTicket || this.disposed) { this.resources.release(canvas); return; }
        this.emit({preview: canvas});
      } catch { if (ticket === this.previewTicket) this.emit({error: 'preview'}); }
    }, () => { if (ticket === this.previewTicket) { this.previewTicket++; this.emit({error: 'timeout'}); } });
  }
  update(settings: WatermarkSettings) {
    if (!validSettings(settings)) { this.emit({error: 'settings'}); return false; }
    if (JSON.stringify(settings) === JSON.stringify(this.state.settings)) return true;
    this.invalidate({settings: {...settings}, error: undefined}); return true;
  }
  private invalidate(patch: Partial<View> = {}) {
    const tasks = this.state.tasks.map(task => {
      this.jobs.cancel(`output:${task.id}`);
      return task.source ? {...task, request: task.request + 1, result: undefined, status: 'stale' as const, error: undefined} : task;
    });
    this.emit({tasks, version: this.state.version + 1, ...patch});
  }
  setWatermark(file: File) {
    if (this.disposed) return;
    const sourceBytes = this.state.tasks.reduce((n, task) => n + task.file.size, 0);
    if (!file.size || file.size > this.limits.bytes || file.size + sourceBytes > this.limits.totalBytes) { this.emit({error: 'budget'}); return; }
    const ticket = ++this.assetTicket;
    this.assetBytes = file.size;
    if (this.state.watermark) this.resources.release(this.state.watermark.preview);
    this.invalidate({watermark: undefined, assetBusy: true, settings: {...this.state.settings, kind: 'image'}, error: undefined});
    this.jobs.schedule('asset', async () => {
      let preview: HTMLCanvasElement | undefined;
      try {
        const source = await acceptImage(file, this.resources, {...this.limits, pixels: Math.min(this.limits.pixels, 4_000_000), edge: Math.min(this.limits.edge, 4096)});
        preview = await this.bounded(source, 1024);
        if (this.disposed || ticket !== this.assetTicket) { this.resources.release(preview); return; }
        this.emit({watermark: {source, preview}, assetBusy: false});
      } catch { if (ticket === this.assetTicket) { this.assetBytes = 0; this.emit({assetBusy: false, error: 'watermark'}); } }
    }, () => { if (ticket === this.assetTicket) { this.assetTicket++; this.assetBytes = 0; this.emit({assetBusy: false, error: 'timeout'}); } });
  }
  removeWatermark() {
    this.assetBytes = 0;
    ++this.assetTicket; this.jobs.cancel('asset');
    if (this.state.watermark) this.resources.release(this.state.watermark.preview);
    this.invalidate({watermark: undefined, assetBusy: false, settings: {...this.state.settings, kind: 'text'}});
  }
  start(ids = this.state.tasks.filter(task => task.source).map(task => task.id)) {
    if (this.disposed || !validSettings(this.state.settings) || this.state.assetBusy || this.state.settings.kind === 'image' && !this.state.watermark) { this.emit({error: 'settings'}); return; }
    const settings = this.state.settings, version = this.state.version, mark = this.state.watermark?.source;
    for (const id of ids) {
      const task = this.state.tasks.find(item => item.id === id); if (!task?.source) continue;
      const request = task.request + 1, source = task.source;
      this.patch(id, {request, status: 'queued', result: undefined, error: undefined});
      this.jobs.schedule(`output:${id}`, async () => {
        if (!this.active(id, request, version)) return;
        this.patch(id, {status: 'processing'});
        try {
          const result = await renderWatermark(source, settings, mark, this.resources, this.limits);
          if (!this.active(id, request, version)) return;
          const total = this.state.tasks.reduce((n, item) => n + (item.result?.size ?? 0), 0);
          if (result.size + total > this.limits.totalBytes) throw new Error('budget');
          this.patch(id, {status: 'ready', result});
        } catch (error) { if (this.active(id, request, version)) this.patch(id, {status: 'error', error: error instanceof Error && error.message === 'budget' ? 'budget' : 'output'}); }
      }, () => { if (this.active(id, request, version)) this.patch(id, {request: request + 1, status: 'error', error: 'timeout'}); });
    }
  }
  cancel() {
    const tasks = this.state.tasks.map(task => {
      if (!['queued', 'processing'].includes(task.status)) return task;
      this.jobs.cancel(`output:${task.id}`);
      return {...task, request: task.request + 1, status: 'stale' as const, result: undefined};
    });
    this.emit({tasks});
  }
  remove(id: string) {
    const task = this.state.tasks.find(item => item.id === id); if (!task) return;
    this.jobs.cancel(`intake:${id}`); this.jobs.cancel(`output:${id}`);
    if (task.thumbnail) this.resources.revoke(task.thumbnail);
    const index = this.state.tasks.indexOf(task), tasks = this.state.tasks.filter(item => item.id !== id);
    this.emit({tasks});
    if (this.state.selected === id) {
      ++this.previewTicket; this.jobs.cancel('preview');
      if (this.state.preview) this.resources.release(this.state.preview);
      this.emit({selected: undefined, preview: undefined});
      const next = tasks[Math.min(index, tasks.length - 1)]; if (next?.source) this.select(next.id);
    }
  }
  clear() { for (const task of [...this.state.tasks]) this.remove(task.id); this.emit({error: undefined}); }
  filename(task: Task) { return taskFilename({time: this.time, sequence: task.sequence, source: task.file.name, extension: extension[this.state.settings.format], label: 'watermark'}).name; }
  download(blob: Blob, name: string) {
    if (this.disposed) return;
    const url = this.resources.url(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
    document.body.append(anchor); anchor.click(); anchor.remove();
    this.downloadURLs.set(url, setTimeout(() => { this.resources.revoke(url); this.downloadURLs.delete(url); }, 1000));
  }
  async zip() {
    if (this.disposed || this.state.tasks.some(task => ['checking', 'queued', 'processing'].includes(task.status))) throw new Error('pending');
    const tasks = this.state.tasks.filter(task => task.status === 'ready' && task.result), snapshot = this.state;
    if (!tasks.length) throw new Error('empty');
    const controller = new AbortController(); this.zipController?.abort(); this.zipController = controller;
    try {
      const blob = await packZip(tasks.map(task => ({name: this.filename(task), blob: task.result!})), controller.signal);
      if (this.disposed || this.state !== snapshot || controller.signal.aborted) throw new Error('changed');
      this.download(blob, `t4f-${this.time}-watermark.zip`);
    } finally { if (this.zipController === controller) this.zipController = undefined; }
  }
  dispose() {
    this.clear(); this.removeWatermark(); ++this.previewTicket; ++this.assetTicket;
    this.zipController?.abort(); this.disposed = true; this.jobs.dispose(); this.listeners.clear();
    for (const [url, timer] of this.downloadURLs) { clearTimeout(timer); this.resources.revoke(url); }
    this.downloadURLs.clear();
  }
}
