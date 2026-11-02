import { acceptImage } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { mobileImageLimits, type ImageLimits } from '../image/limits';
import { extension, type ImageSource } from '../image/types';
import { SerialJobs } from '../image-converter/serial-jobs';
import { planIntake, type IntakeSummary } from '../image-converter/intake';
import { packZip, ZipFailure } from '../image-converter/zip';
import { batchTime } from '../file-naming';

export type ComicPage = Readonly<{
  id: string; importIndex: number; file: File; status: 'queued' | 'checking' | 'ready' | 'error';
  source?: ImageSource; url?: string;
}>;
export type ComicView = Readonly<{
  pages: readonly ComicPage[]; selected: readonly string[];
  intake?: IntakeSummary; packing: boolean; archiveError?: 'budget' | 'changed' | 'failed';
}>;
export const emptyComicView: ComicView = { pages: [], selected: [], packing: false };
const nameOrder = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});
const path = (file: File) => file.webkitRelativePath || file.name;
/** Reset ties use intake order, even after the user has moved duplicate names. */
export function naturalPages<T extends {file: File; importIndex?: number}>(pages: readonly T[]): T[] {
  return pages.map((page, index) => ({page, index})).sort((a, b) =>
    nameOrder.compare(path(a.page.file), path(b.page.file)) || (a.page.importIndex ?? a.index) - (b.page.importIndex ?? b.index),
  ).map(item => item.page);
}
export function archiveEntries(pages: readonly ComicPage[]) {
  const width = Math.max(3, String(pages.length).length);
  return pages.map((page, i) => {
    if (page.status !== 'ready' || !page.source) throw new Error('unverified');
    return {name: `page-${String(i + 1).padStart(width, '0')}.${extension[page.source.info.format]}`, blob: page.file};
  });
}
type Archive = {blob: Blob; filename: string; current: () => boolean};

/** Owns original Files and URLs only; decoded bitmaps are released per validation. */
export class ComicSession {
  readonly jobs = new SerialJobs();
  private view: ComicView = emptyComicView;
  private listeners = new Set<() => void>();
  private sequence = 0;
  private revision = 0;
  private disposed = false;
  private activePage?: ComicPage;
  private archive?: {controller: AbortController; finish: (value?: Archive) => void};
  private downloads = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly time = batchTime(new Date());
  constructor(readonly limits: ImageLimits = mobileImageLimits, readonly resources = new ImageResources()) {}
  snapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => {this.listeners.delete(listener);}; };
  private publish(patch: Partial<ComicView>) {
    if (this.disposed) return;
    this.view = {...this.view, ...patch}; this.listeners.forEach(listener => listener());
  }
  private invalidate() {
    this.revision++;
    if (this.archive) {
      this.archive.controller.abort(); this.archive.finish(); this.archive = undefined;
      this.jobs.cancel('archive');
    }
    this.publish({packing: false, archiveError: undefined});
  }
  add(files: readonly File[]) {
    if (this.disposed) return;
    // A removed active file remains allocated until its native validation settles.
    const retained = this.activePage && !this.view.pages.some(page => page.id === this.activePage!.id) ? [this.activePage] : [];
    const intake = planIntake(files, [...this.view.pages, ...retained], this.limits);
    const added = naturalPages(intake.accepted.map(file => {
      const importIndex = ++this.sequence;
      return {id: `page-${importIndex}`, importIndex, file, status: 'queued' as const};
    }));
    if (added.length) this.invalidate();
    this.publish({pages: [...this.view.pages, ...added], intake: intake.summary});
    for (const page of added) this.check(page);
  }
  private check(page: ComicPage) {
    const live = () => !this.disposed && this.view.pages.some(item => item.id === page.id && item.status === 'checking');
    this.jobs.schedule(page.id, async () => {
      if (this.disposed || !this.view.pages.some(item => item.id === page.id)) return;
      this.patchPage(page.id, {status: 'checking'});
      this.activePage = page;
      try {
        const source = await acceptImage(page.file, this.resources, this.limits);
        if (!live()) return;
        this.patchPage(page.id, {status: 'ready', source, url: this.resources.url(source.blob)});
      } catch {
        if (live()) this.patchPage(page.id, {status: 'error'});
      } finally {
        this.activePage = undefined;
      }
    }, () => { if (live()) this.patchPage(page.id, {status: 'error'}); });
  }
  private patchPage(id: string, patch: Partial<ComicPage>) {
    this.publish({pages: this.view.pages.map(page => page.id === id ? {...page, ...patch} : page)});
  }
  select(id: string, selected: boolean) {
    if (!this.view.pages.some(page => page.id === id)) return;
    this.publish({selected: selected ? [...new Set([...this.view.selected, id])] : this.view.selected.filter(value => value !== id)});
  }
  selectAll(selected: boolean) { this.publish({selected: selected ? this.view.pages.map(page => page.id) : []}); }
  remove(ids: readonly string[]) {
    if (!ids.some(id => this.view.pages.some(page => page.id === id))) return;
    this.invalidate();
    for (const page of this.view.pages.filter(page => ids.includes(page.id))) {
      this.jobs.cancel(page.id);
      if (page.url) this.resources.revoke(page.url);
    }
    this.publish({pages: this.view.pages.filter(page => !ids.includes(page.id)), selected: this.view.selected.filter(id => !ids.includes(id))});
  }
  clear() { this.remove(this.view.pages.map(page => page.id)); this.publish({intake: undefined}); }
  move(id: string, target: number) {
    const pages = [...this.view.pages], from = pages.findIndex(page => page.id === id);
    if (from < 0 || !Number.isFinite(target)) return;
    const to = Math.max(0, Math.min(pages.length - 1, Math.round(target)));
    if (from === to) return;
    const [page] = pages.splice(from, 1); pages.splice(to, 0, page);
    this.invalidate(); this.publish({pages});
  }
  sort() {
    const pages = naturalPages(this.view.pages);
    if (pages.every((page, i) => page === this.view.pages[i])) return;
    this.invalidate(); this.publish({pages});
  }
  pack(format: 'zip' | 'cbz'): Promise<Archive | undefined> {
    if (this.disposed || this.archive || !this.view.pages.some(page => page.status === 'ready') || this.view.pages.some(page => ['queued', 'checking'].includes(page.status))) return Promise.resolve(undefined);
    const pages = this.view.pages.filter(page => page.status === 'ready'), revision = this.revision;
    const controller = new AbortController(), current = () => !this.disposed && this.revision === revision && !controller.signal.aborted;
    return new Promise(resolve => {
      const owner = {controller, finish: resolve}; this.archive = owner;
      this.publish({packing: true, archiveError: undefined});
      this.jobs.schedule('archive', async () => {
        try {
          const blob = await packZip(archiveEntries(pages), controller.signal);
          if (current()) resolve({blob: format === 'cbz' ? new Blob([blob], {type: 'application/vnd.comicbook+zip'}) : blob, filename: `t4f-${this.time}-comic.${format}`, current});
        } catch (error) {
          if (current()) this.publish({archiveError: error instanceof ZipFailure ? error.code : 'failed'});
        } finally {
          resolve(undefined);
          if (this.archive === owner) { this.archive = undefined; this.publish({packing: false}); }
        }
      }, () => { if (this.archive === owner) { controller.abort(); resolve(undefined); this.archive = undefined; this.publish({packing: false, archiveError: 'failed'}); } });
    });
  }
  download(archive: Archive) {
    if (!archive.current()) return false;
    const url = this.resources.url(archive.blob), link = document.createElement('a');
    link.href = url; link.download = archive.filename; link.click();
    this.downloads.set(url, setTimeout(() => {this.resources.revoke(url); this.downloads.delete(url);}, 1000));
    return true;
  }
  dispose() {
    this.clear(); this.disposed = true; this.jobs.dispose(); this.listeners.clear();
    for (const [url, timer] of this.downloads) {clearTimeout(timer); this.resources.revoke(url);}
    this.downloads.clear();
  }
}
