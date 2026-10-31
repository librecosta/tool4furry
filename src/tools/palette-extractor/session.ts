import { acceptImage, decodeChecked, toBlob } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { resolveImageLimits, type ImageLimits } from '../image/limits';
import { SerialJobs } from '../image-converter/serial-jobs';
import {
  candidates,
  selectPalette,
  normalizeHex,
  type Candidate,
  type Mode,
  type Swatch,
} from './palette';
import { renderPalette, type ShareOptions } from './render';

type Source = {
  canvas: HTMLCanvasElement;
  pixels: ImageData;
  url: string;
  name: string;
  candidates: Candidate[];
};
export type PaletteView = {
  source?: Source;
  colors: Swatch[];
  mode: Mode;
  count: number;
  dirty: boolean;
  busy: boolean;
  error?: string;
  version: number;
};
/** Tool-local owner. One bounded native lane; cancelled native work settles before the next starts. */
export class PaletteSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  private listeners = new Set<() => void>();
  private disposed = false;
  private generation = 0;
  private id = 0;
  private downloads = new Map<string, ReturnType<typeof setTimeout>>();
  private exports = new Map<string, () => void>();
  private view: PaletteView = {
    colors: [],
    mode: 'balanced',
    count: 6,
    dirty: false,
    busy: false,
    version: 0,
  };
  constructor(
    readonly limits: ImageLimits = resolveImageLimits({
      userAgent: navigator.userAgent,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
    }),
  ) {}
  snapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<PaletteView>) {
    if (this.disposed) return;
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private release() {
    const source = this.view.source;
    if (source) {
      this.resources.revoke(source.url);
      this.resources.release(source.canvas);
    }
  }
  clear() {
    this.generation++;
    this.jobs.cancel('source');
    for (const [key, settle] of this.exports) {
      this.jobs.cancel(key);
      settle();
    }
    this.exports.clear();
    this.release();
    this.update({
      source: undefined,
      colors: [],
      dirty: false,
      busy: false,
      error: undefined,
      version: this.view.version + 1,
    });
  }
  import(file: File) {
    this.clear();
    const generation = this.generation;
    this.update({ busy: true });
    this.jobs.schedule(
      'source',
      async () => {
        if (this.disposed || generation !== this.generation) return;
        let preview: HTMLCanvasElement | undefined,
          analysis: HTMLCanvasElement | undefined;
        try {
          const source = await acceptImage(file, this.resources, this.limits);
          if (this.disposed || generation !== this.generation) return;
          const bitmap = await decodeChecked(
            source.blob,
            source.info,
            this.resources,
            this.limits,
          );
          try {
            const scale = Math.min(
              1,
              1600 / Math.max(source.width, source.height),
            );
            preview = this.resources.canvas(
              Math.max(1, Math.round(source.width * scale)),
              Math.max(1, Math.round(source.height * scale)),
            );
            const ctx = preview.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('decode');
            ctx.drawImage(bitmap, 0, 0, preview.width, preview.height);
          } finally {
            this.resources.close(bitmap);
          }
          const scale = Math.min(
            1,
            640 / Math.max(preview.width, preview.height),
          );
          analysis = this.resources.canvas(
            Math.max(1, Math.round(preview.width * scale)),
            Math.max(1, Math.round(preview.height * scale)),
          );
          const ctx = analysis.getContext('2d');
          if (!ctx) throw new Error('decode');
          ctx.drawImage(preview, 0, 0, analysis.width, analysis.height);
          const started = performance.now();
          const pool = candidates(
            ctx.getImageData(0, 0, analysis.width, analysis.height),
          );
          if (import.meta.env.DEV)
            console.debug(
              'palette-analysis',
              JSON.stringify({
                width: analysis.width,
                height: analysis.height,
                ms: performance.now() - started,
              }),
            );
          const pixels = preview
            .getContext('2d')!
            .getImageData(0, 0, preview.width, preview.height);
          const blob = await toBlob(preview, 'image/png');
          if (this.disposed || generation !== this.generation) return;
          const ready = {
            canvas: preview,
            pixels,
            url: this.resources.url(blob),
            name: file.name,
            candidates: pool,
          };
          preview = undefined;
          this.update({ source: ready, busy: false });
          this.extract(this.view.mode, this.view.count);
        } catch (error) {
          if (generation === this.generation)
            this.update({
              busy: false,
              error:
                (error as { code?: string }).code ?? (error as Error).message,
            });
        } finally {
          if (preview) this.resources.release(preview);
          if (analysis) this.resources.release(analysis);
        }
      },
      () => {
        if (generation === this.generation) {
          this.generation++;
          this.update({ busy: false, error: 'timeout' });
        }
      },
    );
  }
  extract(mode: Mode, count: number) {
    const colors = this.view.source
      ? selectPalette(this.view.source.candidates, mode, count).map((hex) => ({
          id: `swatch-${++this.id}`,
          hex,
        }))
      : [];
    this.update({
      mode,
      count,
      colors,
      dirty: false,
      error: undefined,
      version: this.view.version + 1,
    });
  }
  edit(id: string, value: string) {
    const hex = normalizeHex(value);
    if (!hex) return false;
    const color = this.view.colors.find((c) => c.id === id);
    if (!color) return false;
    if (color.hex === hex) return true;
    this.update({
      colors: this.view.colors.map((c) => (c.id === id ? { ...c, hex } : c)),
      dirty: true,
      version: this.view.version + 1,
    });
    return true;
  }
  add(value: string) {
    const hex = normalizeHex(value);
    if (!hex || this.view.colors.length >= 10) return false;
    this.update({
      colors: [...this.view.colors, { id: `swatch-${++this.id}`, hex }],
      dirty: true,
      version: this.view.version + 1,
    });
    return true;
  }
  remove(id: string) {
    if (this.view.colors.length <= 1) return;
    this.update({
      colors: this.view.colors.filter((c) => c.id !== id),
      dirty: true,
      version: this.view.version + 1,
    });
  }
  move(id: string, delta: number) {
    const colors = [...this.view.colors],
      index = colors.findIndex((c) => c.id === id),
      next = index + delta;
    if (index < 0 || next < 0 || next >= colors.length) return;
    [colors[index], colors[next]] = [colors[next], colors[index]];
    this.update({ colors, dirty: true, version: this.view.version + 1 });
  }
  export(
    options: ShareOptions | undefined,
    valid: () => boolean,
  ): Promise<Blob | undefined> {
    const snapshot = this.view;
    if (this.disposed || !snapshot.source || !snapshot.colors.length)
      return Promise.resolve(undefined);
    for (const [key, settle] of this.exports) {
      this.jobs.cancel(key);
      settle();
    }
    this.exports.clear();
    return new Promise((resolve, reject) => {
      // Export requests are serialized with source validation. The UI debounces and
      // invalidates old requests; each request is settled (never overwritten in queue).
      const key = `export-${++this.id}`;
      this.exports.set(key, () => resolve(undefined));
      this.jobs.schedule(
        key,
        async () => {
          const current = () =>
            !this.disposed &&
            this.exports.has(key) &&
            this.view.version === snapshot.version &&
            valid();
          if (!current()) {
            this.exports.delete(key);
            resolve(undefined);
            return;
          }
          try {
            resolve(
              await renderPalette(
                snapshot.source?.canvas,
                snapshot.colors.map((c) => c.hex),
                options,
                this.resources,
                this.limits,
                current,
              ),
            );
          } catch (error) {
            if (current()) reject(error);
            else resolve(undefined);
          } finally {
            this.exports.delete(key);
          }
        },
        () => {
          this.exports.delete(key);
          reject(new Error('timeout'));
        },
      );
    });
  }
  download(blob: Blob, name: string) {
    if (this.disposed) return;
    const url = this.resources.url(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    try {
      a.click();
    } finally {
      a.remove();
      this.downloads.set(
        url,
        setTimeout(() => {
          this.resources.revoke(url);
          this.downloads.delete(url);
        }, 1000),
      );
    }
  }
  dispose() {
    this.clear();
    this.disposed = true;
    this.jobs.dispose();
    this.listeners.clear();
    for (const [url, timer] of this.downloads) {
      clearTimeout(timer);
      this.resources.revoke(url);
    }
    this.downloads.clear();
  }
}
