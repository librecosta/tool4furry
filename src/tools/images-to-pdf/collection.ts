import { SerialJobs } from '../image-converter/serial-jobs';
import { ImageResources } from '../image/resources';
import { decodeChecked, toBlob } from '../image/browser-codec';
import { inspectComic } from '../comic-page-organizer/source';
import { fail } from '../general/bounds';
import type { ImageSource } from '../image/types';
import { imagesPdfLimits } from './policy';

export type ImagePage = Readonly<{
  id: string; file: File; status: 'checking' | 'ready' | 'error';
  source?: ImageSource; error?: unknown; url?: string; thumbnailError?: boolean;
}>;
type Preview = Readonly<{id: string; url?: string; source: ImageSource; error?: boolean}>;
type View = Readonly<{pages: readonly ImagePage[]; preview?: Preview}>;
const cancelled = () => new DOMException('Cancelled', 'AbortError');

/** Local files and a small visible thumbnail cache. All native decode/export
 * work shares one SerialJobs lane; cancellation never frees that lane early. */
export class ImagesPdfCollection {
  readonly resources = new ImageResources();
  private jobs = new SerialJobs(null); // User-controlled long batches have no arbitrary total deadline.
  private life = new AbortController();
  private listeners = new Set<() => void>();
  private view: View = {pages: []};
  private visible = new Set<string>();
  private thumbnails = new Map<string, number>();
  private thumbnailJobs = new Set<string>();
  private inspection?: string;
  private previewJob?: AbortController;
  private waiting = new Set<() => void>();
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  snapshot = () => this.view;
  private publish(patch: Partial<View>) {
    if (this.life.signal.aborted) return;
    this.view = {...this.view, ...patch}; this.listeners.forEach(listener => listener());
  }
  private patch(id: string, value: Partial<ImagePage>) {
    this.publish({pages: this.view.pages.map(p => p.id === id ? {...p, ...value} : p)});
  }
  exclusive<T>(key: string, signal: AbortSignal, work: () => Promise<T>): Promise<T> {
    if (signal.aborted || this.life.signal.aborted) return Promise.reject(cancelled());
    return new Promise((resolve, reject) => {
      let started = false;
      const abort = () => {if (!started) {this.jobs.cancel(key); cleanup(); reject(cancelled());}};
      const cleanup = () => {signal.removeEventListener('abort', abort); this.waiting.delete(abort);};
      this.waiting.add(abort); signal.addEventListener('abort', abort, {once: true});
      this.jobs.schedule(key, async () => {
        started = true;
        try {
          if (signal.aborted || this.life.signal.aborted) throw cancelled();
          const value = await work();
          if (signal.aborted || this.life.signal.aborted) throw cancelled();
          resolve(value);
        } catch (error) {reject(error);} finally {cleanup();}
      }, () => {});
    });
  }
  add(files: readonly File[]) {
    if (!files.length || this.life.signal.aborted) return;
    this.publish({pages: [...this.view.pages, ...files.map(file => ({id: crypto.randomUUID(), file, status: 'checking' as const}))]});
    this.inspectNext();
  }
  private inspectNext() {
    if (this.inspection || this.life.signal.aborted) return;
    const page = this.view.pages.find(p => p.status === 'checking');
    if (!page) return;
    this.inspection = page.id;
    void this.exclusive(`inspect-${page.id}`, this.life.signal, async () => {
      try {
        const source = await inspectComic(page.file, imagesPdfLimits);
        if (source.info.format !== 'png' && source.info.format !== 'jpeg') fail('仅支持静态 PNG / JPEG 图片。', 'Only static PNG / JPEG images are supported.');
        if (this.life.signal.aborted || !this.view.pages.some(p => p.id === page.id)) return;
        this.patch(page.id, {source, status: 'ready'});
        this.thumbnail(page.id);
      } catch (error) {this.patch(page.id, {error, status: 'error'});}
    }).catch(() => {}).finally(() => {
      this.inspection = undefined; this.inspectNext();
    });
  }
  setVisible = (ids: readonly string[]) => {
    this.visible = new Set(ids);
    for (const id of ids) {
      const bytes = this.thumbnails.get(id);
      if (bytes !== undefined) {this.thumbnails.delete(id); this.thumbnails.set(id, bytes);}
      this.thumbnail(id);
    }
  };
  private thumbnail(id: string) {
    const page = this.view.pages.find(p => p.id === id);
    if (!this.visible.has(id) || !page?.source || page.url || page.thumbnailError || this.thumbnailJobs.has(id)) return;
    this.thumbnailJobs.add(id);
    void this.exclusive(`thumb-${id}`, this.life.signal, async () => {
      if (!this.visible.has(id) || !this.view.pages.some(p => p.id === id)) return;
      const source = page.source!, ratio = Math.min(1, 480 / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * ratio)), height = Math.max(1, Math.round(source.height * ratio));
      // Ask the browser decoder for a bounded bitmap instead of retaining a full-resolution thumbnail source.
      const bitmap = await createImageBitmap(source.blob, {imageOrientation: 'from-image', resizeWidth: width, resizeHeight: height, resizeQuality: 'high'});
      let canvas: HTMLCanvasElement | undefined;
      try {
        if (this.life.signal.aborted || !this.visible.has(id)) return;
        canvas = this.resources.canvas(width, height);
        const context = canvas.getContext('2d'); if (!context) throw new Error('canvas');
        context.drawImage(bitmap, 0, 0, width, height);
        const blob = await toBlob(canvas, 'image/png');
        if (this.life.signal.aborted || !this.visible.has(id) || !this.view.pages.some(p => p.id === id)) return;
        const cacheBytes = () => [...this.thumbnails.values()].reduce((a, b) => a + b, 0);
        while (this.thumbnails.size && (this.thumbnails.size >= 48 || cacheBytes() + blob.size > 8 * 1024 ** 2)) {
          const oldest = [...this.thumbnails.keys()].find(key => !this.visible.has(key)) ?? this.thumbnails.keys().next().value!;
          this.evict(oldest);
        }
        this.thumbnails.set(id, blob.size); this.patch(id, {url: this.resources.url(blob)});
      } finally {bitmap.close(); if (canvas) this.resources.release(canvas);}
    }).catch(() => {this.patch(id, {thumbnailError: true});}).finally(() => {this.thumbnailJobs.delete(id);});
  }
  private evict(id: string) {
    const page = this.view.pages.find(p => p.id === id);
    if (page?.url) this.resources.revoke(page.url);
    this.thumbnails.delete(id); this.patch(id, {url: undefined});
  }
  move(id: string, target: number) {
    const pages = [...this.view.pages], from = pages.findIndex(p => p.id === id);
    if (from < 0 || !Number.isFinite(target)) return;
    const to = Math.max(0, Math.min(pages.length - 1, Math.round(target)));
    if (from === to) return;
    pages.splice(to, 0, pages.splice(from, 1)[0]); this.publish({pages});
  }
  remove(id: string) {
    if (this.view.preview?.id === id) this.closePreview();
    this.evict(id); this.visible.delete(id);
    this.publish({pages: this.view.pages.filter(p => p.id !== id)});
  }
  clear() {
    this.closePreview();
    for (const page of this.view.pages) if (page.url) this.resources.revoke(page.url);
    this.thumbnails.clear(); this.visible.clear(); this.publish({pages: []});
  }
  openPreview(id: string) {
    this.closePreview();
    const page = this.view.pages.find(p => p.id === id);
    if (!page?.source || page.status !== 'ready') return;
    const controller = new AbortController(); this.previewJob = controller;
    this.publish({preview: {id, source: page.source}});
    void this.exclusive('preview', controller.signal, async () => {
      const bitmap = await decodeChecked(page.source!.blob, page.source!.info, this.resources, imagesPdfLimits);
      this.resources.close(bitmap);
      if (controller.signal.aborted || this.life.signal.aborted) return;
      this.publish({preview: {id, source: page.source!, url: this.resources.url(page.source!.blob)}});
    }).catch(() => {if (!controller.signal.aborted) this.publish({preview: {id, source: page.source!, error: true}});});
  }
  closePreview() {
    this.previewJob?.abort(); this.previewJob = undefined;
    if (this.view.preview?.url) this.resources.revoke(this.view.preview.url);
    this.publish({preview: undefined});
  }
  dispose() {
    this.closePreview(); this.clear(); this.life.abort();
    for (const abort of [...this.waiting]) abort();
    this.jobs.dispose(); this.listeners.clear();
  }
}
