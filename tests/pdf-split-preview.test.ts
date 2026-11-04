import { expect, it, vi } from 'vitest';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PreviewSession, thumbnailSize, enlargedSize } from '../src/tools/pdf-split/preview-session';

function fixture() {
  const clean = vi.fn(), release = vi.fn(async () => {}), starts: number[] = [];
  const renders: { finish: () => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const doc = { getPage: vi.fn(async (n: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 10000 * scale, height: 20000 * scale }),
    cleanup: clean,
    render: () => {
      starts.push(n);
      let finish!: () => void, reject!: (reason: Error) => void;
      const promise = new Promise<void>((yes, no) => { finish = yes; reject = no; });
      const cancel = vi.fn(() => reject(new Error('Cancelled')));
      renders.push({ finish, cancel });
      return { promise, cancel };
    },
  })) } as unknown as PDFDocumentProxy;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({})) as unknown as HTMLCanvasElement['getContext']);
  return { session: new PreviewSession(doc, release), doc, starts, renders, clean, release };
}
it('serializes renders, bounds canvas pixels and cleans each page', async () => {
  const f = fixture(), canvas = document.createElement('canvas'), large = document.createElement('canvas');
  const a = f.session.render(1, canvas, thumbnailSize, new AbortController().signal);
  const b = f.session.render(2, large, enlargedSize, new AbortController().signal);
  await vi.waitFor(() => expect(f.starts).toEqual([1]));
  expect(canvas.width * canvas.height).toBeLessThanOrEqual(thumbnailSize.pixels);
  f.renders[0].finish(); await a;
  await vi.waitFor(() => expect(f.starts).toEqual([1, 2]));
  expect(large.width * large.height).toBeLessThanOrEqual(enlargedSize.pixels);
  f.renders[1].finish(); await b;
  expect(f.clean).toHaveBeenCalledTimes(2);
  await f.session.destroy(); await f.session.destroy(); expect(f.release).toHaveBeenCalledOnce();
});
it('cancels the active task, skips cancelled queued pages and rejects work after destruction', async () => {
  const f = fixture(), a = new AbortController(), b = new AbortController();
  const first = f.session.render(1, document.createElement('canvas'), thumbnailSize, a.signal);
  const second = f.session.render(2, document.createElement('canvas'), thumbnailSize, b.signal);
  const settled = Promise.allSettled([first, second]);
  await vi.waitFor(() => expect(f.renders).toHaveLength(1));
  b.abort(); a.abort();
  expect((await settled).map(r => r.status)).toEqual(['rejected', 'rejected']);
  expect(f.renders[0].cancel).toHaveBeenCalledOnce(); expect(f.starts).toEqual([1]);
  await f.session.destroy();
  await expect(f.session.render(3, document.createElement('canvas'), thumbnailSize, new AbortController().signal)).rejects.toThrow();
});
it('times out a stalled getPage, retires the document and does not start queued rendering', async () => {
  vi.useFakeTimers();
  const release = vi.fn(async () => {});
  const session = new PreviewSession({ getPage: () => new Promise(() => {}) } as unknown as PDFDocumentProxy, release);
  const output = session.render(1, document.createElement('canvas'), thumbnailSize, new AbortController().signal);
  const check = expect(output).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(15_000); await check;
  expect(release).toHaveBeenCalledOnce(); vi.useRealTimers();
});
