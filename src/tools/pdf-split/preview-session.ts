import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

export const previewBatchSize = 24;
export const thumbnailSize = { width: 280, edge: 420, pixels: 100_000 };
export const enlargedSize = { width: 1100, edge: 1800, pixels: 2_000_000 };
export type PreviewSize = typeof thumbnailSize;
const cancelled = () => new DOMException('Preview cancelled', 'AbortError');

/** One render at a time; callers own only their mounted canvas, with no image cache. */
export class PreviewSession {
  private tail: Promise<unknown> = Promise.resolve();
  private life = new AbortController();
  private closed?: Promise<void>;
  constructor(private doc: PDFDocumentProxy, private release: () => Promise<void>) {}

  render(pageNumber: number, canvas: HTMLCanvasElement, size: PreviewSize, signal: AbortSignal) {
    const run = async () => {
      if (signal.aborted || this.life.signal.aborted) throw cancelled();
      let page: PDFPageProxy | undefined;
      let task: RenderTask | undefined;
      const cancel = () => task?.cancel();
      signal.addEventListener('abort', cancel);
      this.life.signal.addEventListener('abort', cancel);
      let timer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          cancel();
          void this.destroy().catch(() => {});
          reject(new Error('Preview timed out'));
        }, 15_000);
      });
      try {
        page = await Promise.race([this.doc.getPage(pageNumber), deadline]);
        if (signal.aborted || this.life.signal.aborted) throw cancelled();
        const original = page.getViewport({ scale: 1 });
        if (![original.width, original.height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid page dimensions');
        const scale = Math.min(size.width / original.width, size.edge / Math.max(original.width, original.height), Math.sqrt(size.pixels / (original.width * original.height)));
        const viewport = page.getViewport({ scale });
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        task = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' });
        await Promise.race([task.promise, deadline]);
        if (signal.aborted || this.life.signal.aborted) throw cancelled();
      } finally {
        clearTimeout(timer!);
        signal.removeEventListener('abort', cancel);
        this.life.signal.removeEventListener('abort', cancel);
        page?.cleanup();
      }
    };
    const result = this.tail.then(run);
    this.tail = result.catch(() => {});
    return result;
  }

  destroy() {
    if (!this.closed) {
      this.life.abort();
      this.closed = this.release();
    }
    return this.closed;
  }
}
