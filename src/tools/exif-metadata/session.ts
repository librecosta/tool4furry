import { acceptImage, decodeChecked } from '../image/browser-codec';
import { cleanImageMetadata } from '../image/metadata';
import { ImageResources } from '../image/resources';
import { resolveImageLimits, type ImageLimits } from '../image/limits';
import { extension, mime, type ImageSource } from '../image/types';
import { batchTime, taskFilename } from '../file-naming';
import { SerialJobs } from '../image-converter/serial-jobs';
import { packZip } from '../image-converter/zip';
import { readMetadata, type MetadataView } from './read-metadata';

export type MetadataTask = Readonly<{
  id: string; sequence: number; file: File; request: number;
  status: 'queued' | 'processing' | 'stale' | 'ready' | 'error'; phase: 'inspect' | 'clean';
  source?: ImageSource; before?: MetadataView;
  output?: {blob: Blob; after: MetadataView; changed: boolean};
  error?: 'input' | 'clean' | 'timeout' | 'budget';
}>;
export type MetadataState = Readonly<{
  tasks: readonly MetadataTask[]; selectedId?: string; issues: readonly string[]; version: number;
}>;
export const emptyMetadataState: MetadataState = {tasks: [], issues: [], version: 0};

/** One collection and one native lane; inspection never owns a preview URL. */
export class MetadataSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  readonly limits: ImageLimits;
  private view: MetadataState = emptyMetadataState;
  private disposed = false;
  private sequence = 0;
  private activeFile?: {id: string; file: File};
  private archive?: AbortController;
  private downloads = new Map<string, {url: string; timer: ReturnType<typeof setTimeout>}>();
  private listeners = new Set<() => void>();
  private readonly time = batchTime(new Date());
  constructor(limits?: ImageLimits) {
    this.limits = limits ?? resolveImageLimits({userAgent: navigator.userAgent, coarsePointer: matchMedia('(pointer: coarse)').matches});
  }
  snapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<MetadataState>, content = true) {
    if (this.disposed) return;
    if (content) { this.archive?.abort(); this.revokeDownload('zip'); }
    this.view = {...this.view, ...patch, version: this.view.version + Number(content)};
    this.listeners.forEach(listener => listener());
  }
  private task(id: string) { return this.view.tasks.find(task => task.id === id); }
  private patch(id: string, patch: Partial<MetadataTask>) {
    this.publish({tasks: this.view.tasks.map(task => task.id === id ? {...task, ...patch} : task)});
  }
  private valid(id: string, request: number) { return !this.disposed && this.task(id)?.request === request; }
  select(id: string) { if (this.task(id)) this.publish({selectedId: id}, false); }
  add(files: readonly File[]) {
    if (this.disposed) return;
    const tasks = [...this.view.tasks], issues: string[] = [], accepted: string[] = [];
    // A removed File still occupies memory until its native operation settles.
    const retained = this.activeFile && !tasks.some(task => task.id === this.activeFile!.id) ? this.activeFile.file : undefined;
    let bytes = tasks.reduce((sum, task) => sum + task.file.size, retained?.size ?? 0);
    for (const file of files) {
      if (tasks.length + Number(!!retained) >= this.limits.files || file.size > this.limits.bytes || bytes + file.size > this.limits.totalBytes) {
        if (issues.length < 20) issues.push(file.name);
        continue;
      }
      const sequence = ++this.sequence, id = `metadata-${sequence}`;
      tasks.push({id, sequence, file, request: 0, status: 'queued', phase: 'inspect'});
      bytes += file.size; accepted.push(id);
    }
    this.publish({tasks, issues, selectedId: this.view.selectedId ?? accepted[0]});
    for (const id of accepted) this.inspect(id);
  }
  private inspect(id: string) {
    const task = this.task(id); if (!task) return;
    const request = task.request, current = () => this.valid(id, request);
    this.jobs.schedule(`inspect-${id}`, async () => {
      if (!current()) return;
      this.activeFile = {id, file: task.file}; this.patch(id, {status: 'processing'});
      try {
        const source = await acceptImage(task.file, this.resources, this.limits);
        if (!current()) return;
        if (source.info.format === 'avif') throw new Error('unsupported');
        const before = await readMetadata(source.blob, this.limits);
        if (current()) this.patch(id, {source, before, status: 'stale'});
      } catch { if (current()) this.patch(id, {status: 'error', error: 'input'}); }
      finally { this.activeFile = undefined; }
    }, () => { if (current()) this.patch(id, {status: 'error', request: request + 1, error: 'timeout'}); });
  }
  clean(id?: string) {
    for (const task of this.view.tasks) {
      if (id && task.id !== id || !task.source || !['stale', 'error'].includes(task.status)) continue;
      const source = task.source, request = task.request + 1, current = () => this.valid(task.id, request);
      this.revokeDownload(task.id);
      this.patch(task.id, {request, status: 'queued', phase: 'clean', output: undefined, error: undefined});
      this.jobs.schedule(`clean-${task.id}`, async () => {
        if (!current()) return;
        this.activeFile = {id: task.id, file: task.file}; this.patch(task.id, {status: 'processing'});
        try {
          const cleaned = await cleanImageMetadata(source.blob, this.limits.bytes, this.limits);
          if (!current()) return;
          if (cleaned.blob.type !== mime[source.info.format] || ['format', 'width', 'height', 'orientation'].some(key =>
            cleaned.info[key as keyof typeof cleaned.info] !== source.info[key as keyof typeof source.info])) throw new Error('output');
          const bitmap = await decodeChecked(cleaned.blob, cleaned.info, this.resources, this.limits);
          this.resources.close(bitmap);
          if (!current()) return;
          const after = await readMetadata(cleaned.blob, this.limits);
          if (!current()) return;
          const used = this.view.tasks.reduce((sum, entry) => sum + (entry.output?.blob.size ?? 0), 0);
          if (used + cleaned.blob.size > this.limits.totalBytes) { this.patch(task.id, {status: 'error', error: 'budget'}); return; }
          this.patch(task.id, {status: 'ready', output: {blob: cleaned.blob, after, changed: cleaned.changed}});
        } catch { if (current()) this.patch(task.id, {status: 'error', error: 'clean'}); }
        finally { this.activeFile = undefined; }
      }, () => { if (current()) this.patch(task.id, {status: 'error', request: request + 1, error: 'timeout'}); });
    }
  }
  retry(id: string) {
    const task = this.task(id); if (task?.status !== 'error') return;
    if (task.source) this.clean(id);
    else { this.patch(id, {request: task.request + 1, status: 'queued', phase: 'inspect', error: undefined}); this.inspect(id); }
  }
  remove(id: string) {
    const index = this.view.tasks.findIndex(task => task.id === id); if (index < 0) return;
    this.jobs.cancel(`inspect-${id}`); this.jobs.cancel(`clean-${id}`); this.revokeDownload(id);
    const tasks = this.view.tasks.filter(task => task.id !== id);
    this.publish({tasks, selectedId: this.view.selectedId === id ? tasks[Math.min(index, tasks.length - 1)]?.id : this.view.selectedId});
  }
  clear() {
    for (const task of this.view.tasks) { this.jobs.cancel(`inspect-${task.id}`); this.jobs.cancel(`clean-${task.id}`); }
    for (const key of this.downloads.keys()) this.revokeDownload(key);
    this.publish({tasks: [], selectedId: undefined, issues: []});
  }
  filename(task: MetadataTask) {
    return taskFilename({time: this.time, sequence: task.sequence, source: task.file.name,
      extension: extension[task.source!.info.format], label: 'cleaned'}).name;
  }
  private revokeDownload(key: string) {
    const saved = this.downloads.get(key); if (!saved) return;
    clearTimeout(saved.timer); this.resources.revoke(saved.url); this.downloads.delete(key);
  }
  save(blob: Blob, name: string, key = 'zip') {
    if (this.disposed) return;
    this.revokeDownload(key);
    const url = this.resources.url(blob), anchor = document.createElement('a');
    this.downloads.set(key, {url, timer: setTimeout(() => this.revokeDownload(key), 1000)});
    anchor.href = url; anchor.download = name; document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  }
  download(id: string) {
    const task = this.task(id);
    if (task?.status === 'ready' && task.output) this.save(task.output.blob, this.filename(task), task.id);
  }
  async zip() {
    const snapshot = this.view;
    if (snapshot.tasks.some(task => ['queued', 'processing', 'stale'].includes(task.status))) throw new Error('pending');
    const entries = snapshot.tasks.flatMap(task => task.status === 'ready' && task.output ? [{name: this.filename(task), blob: task.output.blob}] : []);
    if (!entries.length || this.disposed) throw new Error('empty');
    this.archive?.abort();
    const controller = new AbortController(); this.archive = controller;
    try {
      const blob = await packZip(entries, controller.signal);
      if (this.disposed || this.view.version !== snapshot.version || controller.signal.aborted) throw new Error('changed');
      this.save(blob, `t4f-${this.time}-cleaned.zip`);
      return entries.length;
    } finally { if (this.archive === controller) this.archive = undefined; }
  }
  dispose() { this.clear(); this.disposed = true; this.archive?.abort(); this.jobs.dispose(); this.listeners.clear(); }
}
