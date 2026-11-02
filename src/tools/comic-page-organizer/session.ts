import { ImageResources } from '../image/resources';
import { extension, ImageFailure, type ImageSource } from '../image/types';
import { encodeImage } from '../image/browser-codec';
import { AvifEncoder } from '../image/avif-encoder';
import { allowsAvifOutput, avifOutputLimits } from '../image/limits';
import { SerialJobs } from '../image-converter/serial-jobs';
import { planIntake, type IntakeSummary } from '../image-converter/intake';
import { batchTime } from '../file-naming';
import { archiveSize, ArchiveFailure, writeZip, zipBlob } from '../archive/stream-zip';
import { mobileComicBudget, type ComicBudget } from './limits';
import { inspectComic, comicThumbnail, verifyComic } from './source';
import type { SaveHandle } from './save-file';
import { defaultExportSettings, validExportSettings, validPagePrefix, type ExportSettings, type ComicImageFormat } from './export-settings';

export type ComicPage = Readonly<{
  id: string; importIndex: number; file: File; status: 'queued' | 'checking' | 'ready' | 'error';
  source?: ImageSource; url?: string; thumbnailError?: boolean;
}>;
export type ComicFormat = 'zip' | 'cbz' | 'pdf';
export type ComicView = Readonly<{
  pages: readonly ComicPage[]; selected: readonly string[];
  intake?: IntakeSummary; packing: boolean; committing: boolean; progress: number; exported?: ComicFormat;
  settings: ExportSettings;
  archiveError?: 'budget' | 'changed' | 'failed' | 'timeout' | 'pdfBudget' | 'pageFailed' | 'cancelled' | 'invalidSettings' | 'avifDevice' | 'avifBudget' | 'avifLoad' | 'avifTimeout';
}>;
export const emptyComicView: ComicView = {pages: [], selected: [], packing: false, committing: false, progress: 0, settings: defaultExportSettings};
const nameOrder = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});
const path = (file: File) => file.webkitRelativePath || file.name;
export function naturalPages<T extends {file: File; importIndex?: number}>(pages: readonly T[]): T[] {
  return pages.map((page, index) => ({page, index})).sort((a, b) =>
    nameOrder.compare(path(a.page.file), path(b.page.file)) || (a.page.importIndex ?? a.index) - (b.page.importIndex ?? b.index),
  ).map(item => item.page);
}
export function archiveEntries(pages: readonly ComicPage[], prefix = 'page', format: ComicImageFormat = 'original') {
  if (!validPagePrefix(prefix)) throw new Error('invalidSettings');
  const width = Math.max(3, String(pages.length).length);
  return pages.map((page, i) => {
    if (page.status !== 'ready' || !page.source) throw new Error('unverified');
    return {name: `${prefix}-${String(i + 1).padStart(width, '0')}.${extension[format === 'original' ? page.source.info.format : format]}`, blob: page.file};
  });
}
type Archive = {blob: Blob; filename: string; current: () => boolean};

/** Files remain file-backed. Only a bounded visible thumbnail cache is owned;
 * export decoding, thumbnails and PDF share one actual native execution lane. */
export class ComicSession {
  readonly jobs = new SerialJobs(300000);
  readonly limits;
  private view: ComicView = emptyComicView;
  private listeners = new Set<() => void>();
  private sequence = 0;
  private revision = 0;
  private settingsRevision = 0;
  private disposed = false;
  private activePage?: ComicPage;
  private archive?: {controller: AbortController; finish: (value?: Archive) => void; format: ComicFormat};
  private avif = new AvifEncoder();
  private thumbnails = new Map<string, number>();
  private visible = new Set<string>();
  private downloads = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly time = batchTime(new Date());
  constructor(readonly budget: ComicBudget = mobileComicBudget, readonly resources = new ImageResources()) {this.limits = budget.input;}
  snapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private publish(patch: Partial<ComicView>) {
    if (this.disposed) return;
    this.view = {...this.view, ...patch}; this.listeners.forEach(listener => listener());
  }
  private invalidate() {
    this.revision++;
    this.archive?.controller.abort();
    this.publish({exported: undefined, archiveError: this.archive ? 'changed' : undefined});
  }
  configure(patch: Partial<ExportSettings>) {
    if (this.disposed || this.view.committing) return;
    const settings = {...this.view.settings, ...patch};
    if (JSON.stringify(settings) === JSON.stringify(this.view.settings)) return;
    this.settingsRevision++;
    if (this.archive?.format !== 'pdf') this.archive?.controller.abort();
    this.publish({settings, exported: this.view.exported === 'pdf' ? 'pdf' : undefined,
      archiveError: this.archive && this.archive.format !== 'pdf' ? 'changed' : undefined});
  }
  avifIssue(): 'avifDevice' | 'avifBudget' | undefined {
    if (!allowsAvifOutput(this.limits) || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') return 'avifDevice';
    if (this.view.pages.some(p => p.status === 'ready' && p.source && (p.source.width > avifOutputLimits.edge || p.source.height > avifOutputLimits.edge || p.source.width * p.source.height > avifOutputLimits.pixels))) return 'avifBudget';
  }
  add(files: readonly File[]) {
    if (this.disposed || this.view.committing) return;
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
      this.patchPage(page.id, {status: 'checking'}); this.activePage = page;
      try {
        const source = await inspectComic(page.file, this.limits);
        if (!live()) return;
        this.patchPage(page.id, {status: 'ready', source});
        if (this.visible.has(page.id)) this.thumbnail(page.id);
      } catch {if (live()) this.patchPage(page.id, {status: 'error'});}
      finally {this.activePage = undefined;}
    }, () => {if (live()) this.patchPage(page.id, {status: 'error'});});
  }
  private patchPage(id: string, patch: Partial<ComicPage>) {
    this.publish({pages: this.view.pages.map(page => page.id === id ? {...page, ...patch} : page)});
  }
  showThumbnails(ids: readonly string[]) {
    this.visible = new Set(ids);
    for (const page of this.view.pages) if (!this.visible.has(page.id)) this.jobs.cancel(`thumb-${page.id}`);
    for (const id of ids) {
      if (this.thumbnails.has(id)) {const bytes = this.thumbnails.get(id)!; this.thumbnails.delete(id); this.thumbnails.set(id, bytes);}
      else this.thumbnail(id);
    }
  }
  private thumbnail(id: string) {
    const page = this.view.pages.find(page => page.id === id);
    if (!page?.source || page.url || page.thumbnailError || this.disposed) return;
    this.jobs.schedule(`thumb-${id}`, async () => {
      if (!this.visible.has(id) || !this.view.pages.some(p => p.id === id && !p.url && !p.thumbnailError) || this.disposed) return;
      this.activePage = page;
      try {
        const blob = await comicThumbnail(page.source!, this.resources, this.limits);
        if (this.disposed || !this.visible.has(id) || !this.view.pages.some(p => p.id === id)) return;
        if (blob.size > this.budget.thumbnailBytes) throw new Error('thumbnail budget');
        while (this.thumbnails.size >= this.budget.thumbnails || [...this.thumbnails.values()].reduce((a, b) => a + b, 0) + blob.size > this.budget.thumbnailBytes) {
          const oldest = [...this.thumbnails.keys()].find(key => !this.visible.has(key)) ?? this.thumbnails.keys().next().value;
          if (!oldest) break;
          const previous = this.view.pages.find(p => p.id === oldest);
          if (previous?.url) this.resources.revoke(previous.url);
          this.thumbnails.delete(oldest); this.patchPage(oldest, {url: undefined});
        }
        this.thumbnails.set(id, blob.size); this.patchPage(id, {url: this.resources.url(blob)});
      } catch {if (!this.disposed) this.patchPage(id, {thumbnailError: true});}
      finally {this.activePage = undefined;}
    }, () => {this.visible.delete(id); this.patchPage(id, {thumbnailError: true});});
  }
  select(id: string, selected: boolean) {
    if (!this.view.pages.some(page => page.id === id)) return;
    this.publish({selected: selected ? [...new Set([...this.view.selected, id])] : this.view.selected.filter(value => value !== id)});
  }
  selectAll(selected: boolean) {this.publish({selected: selected ? this.view.pages.map(page => page.id) : []});}
  remove(ids: readonly string[]) {
    if (this.view.committing && !this.disposed) return;
    if (!ids.some(id => this.view.pages.some(page => page.id === id))) return;
    this.invalidate();
    for (const page of this.view.pages.filter(page => ids.includes(page.id))) {
      this.jobs.cancel(page.id); this.jobs.cancel(`thumb-${page.id}`); this.visible.delete(page.id); this.thumbnails.delete(page.id);
      if (page.url) this.resources.revoke(page.url);
    }
    this.publish({pages: this.view.pages.filter(page => !ids.includes(page.id)), selected: this.view.selected.filter(id => !ids.includes(id))});
  }
  clear() {this.remove(this.view.pages.map(page => page.id)); this.publish({intake: undefined});}
  move(id: string, target: number) {
    if (this.view.committing) return;
    const pages = [...this.view.pages], from = pages.findIndex(page => page.id === id);
    if (from < 0 || !Number.isFinite(target)) return;
    const to = Math.max(0, Math.min(pages.length - 1, Math.round(target))); if (from === to) return;
    const [page] = pages.splice(from, 1); pages.splice(to, 0, page);
    this.invalidate(); this.publish({pages});
  }
  sort() {
    if (this.view.committing) return;
    const pages = naturalPages(this.view.pages); if (pages.every((page, i) => page === this.view.pages[i])) return;
    this.invalidate(); this.publish({pages});
  }
  filename(format: ComicFormat) {return `t4f-${this.time}-comic.${format}`;}
  archiveBytes() {try {return archiveSize(archiveEntries(this.view.pages.filter(p => p.status === 'ready'), this.view.settings.prefix));} catch {return Infinity;}}
  cancelExport() {if (!this.view.committing) this.archive?.controller.abort('cancelled');}
  pack(format: ComicFormat, destination?: Promise<SaveHandle>): Promise<Archive | undefined> {
    if (this.disposed || this.archive || !this.view.pages.some(p => p.status === 'ready') || this.view.pages.some(p => ['queued', 'checking'].includes(p.status))) return Promise.resolve(undefined);
    const settings = this.view.settings;
    if (format !== 'pdf' && (!validExportSettings(settings) || settings.format === 'avif' && this.avifIssue())) {
      this.publish({archiveError: settings.format === 'avif' && this.avifIssue() || 'invalidSettings'}); return Promise.resolve(undefined);
    }
    const pages = this.view.pages.filter(p => p.status === 'ready'), revision = this.revision, settingsRevision = this.settingsRevision;
    const controller = new AbortController(), current = () => !this.disposed && this.revision === revision && (format === 'pdf' || this.settingsRevision === settingsRevision) && !controller.signal.aborted;
    return new Promise(resolve => {
      const owner = {controller, finish: resolve, format}; this.archive = owner;
      this.publish({packing: true, progress: 0, exported: undefined, archiveError: undefined});
      // Attach a rejection handler immediately, including when a previous native
      // thumbnail is still settling. A cancelled picker never falls back silently.
      const target = destination?.then(handle => ({handle}), error => ({error}));
      this.jobs.schedule('archive', async () => {
        const timer = setTimeout(() => controller.abort(new ArchiveFailure('timeout')), 300000);
        try {
          const selected = await target;
          if (selected && 'error' in selected) throw selected.error;
          if (!current()) throw new ArchiveFailure('changed');
          const progress = (count: number) => {if (current()) this.publish({progress: count});};
          let blob: Blob | undefined;
          if (format === 'pdf') {
            const {comicPdf, pdfBudget} = await import('./pdf');
            try {pdfBudget(pages.map(p => p.source!), this.budget.pdf);} catch {throw new Error('pdfBudget');}
            blob = await comicPdf(pages.map(p => p.source!), this.resources, this.limits, this.budget.pdf, controller.signal, progress);
          } else {
            const original = settings.format === 'original';
            const sources = archiveEntries(pages, settings.prefix, settings.format), maxBytes = selected ? this.budget.streamBytes : this.budget.blobBytes;
            if (original && archiveSize(sources) > maxBytes) throw new ArchiveFailure('budget');
            const entries = original ? sources : sources.map((entry, index) => ({name: entry.name, blob: async () => {
              const page = pages[index]; this.activePage = page;
              try {
                if (!current()) throw new ArchiveFailure('changed');
                return await encodeImage(page.source!, {format: settings.format as Exclude<ComicImageFormat, 'original'>,
                  quality: settings.format === 'png' ? null : settings.qualities[settings.format as keyof typeof settings.qualities],
                  jpegBackground: settings.jpegBackground}, this.resources, this.limits, {avif: this.avif, signal: controller.signal});
              } finally {this.activePage = undefined;}
            }}));
            const options = {signal: controller.signal, maxBytes, progress, beforeClose: () => {if (selected && current()) this.publish({committing: true});}, prepare: async (_entry: unknown, index: number) => {
              const page = pages[index]; this.activePage = page;
              try {if (original) await verifyComic(page.source!, this.resources, this.limits);}
              catch (error) {if (current()) this.patchPage(page.id, {status: 'error'}); throw new Error('pageFailed', {cause: error});}
              finally {this.activePage = undefined;}
            }};
            if (selected) {
              const sink = await selected.handle.createWritable();
              await writeZip(entries, sink, options);
            } else blob = await zipBlob(entries, options);
            if (blob && format === 'cbz') blob = new Blob([blob], {type: 'application/vnd.comicbook+zip'});
          }
          if (current()) {
            this.publish({exported: format});
            if (blob) resolve({blob, filename: this.filename(format), current});
          }
        } catch (error) {
          if (this.disposed) return;
          const code = error instanceof ArchiveFailure ? error.code : error instanceof ImageFailure && ['avifDevice','avifBudget','avifLoad','avifTimeout'].includes(error.code) ? error.code as 'avifDevice' | 'avifBudget' | 'avifLoad' | 'avifTimeout' : error instanceof Error && ['pdfBudget', 'pageFailed'].includes(error.message) ? error.message as 'pdfBudget' | 'pageFailed' : 'failed';
          if (error instanceof DOMException && error.name === 'AbortError' && !controller.signal.aborted) this.publish({archiveError: undefined});
          else this.publish({archiveError: controller.signal.reason === 'cancelled' ? 'cancelled' : controller.signal.reason instanceof ArchiveFailure && controller.signal.reason.code === 'timeout' ? 'timeout' : controller.signal.aborted ? 'changed' : code});
        } finally {
          clearTimeout(timer); resolve(undefined);
          if (this.archive === owner) {this.archive = undefined; this.publish({packing: false, committing: false});}
        }
      }, () => {controller.abort(new ArchiveFailure('timeout')); this.publish({archiveError: 'timeout'});});
    });
  }
  download(archive: Archive) {
    if (!archive.current()) return false;
    const url = this.resources.url(archive.blob), link = document.createElement('a');
    link.href = url; link.download = archive.filename; link.click();
    this.downloads.set(url, setTimeout(() => {this.resources.revoke(url); this.downloads.delete(url);}, 1000)); return true;
  }
  dispose() {
    this.publish({committing: false}); this.clear(); this.disposed = true; this.archive?.controller.abort(); this.archive?.finish(); this.avif.dispose(); this.jobs.dispose(); this.listeners.clear();
    for (const [url, timer] of this.downloads) {clearTimeout(timer); this.resources.revoke(url);}
    this.downloads.clear();
  }
}
