// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { File } from 'node:buffer';
import { beforeEach, expect, it, vi } from 'vitest';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { openPreview } from '../src/tools/pdf-split/preview-engine';
vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn(), GlobalWorkerOptions: {} }));
vi.mock('../src/tools/pdf-split/preview-assets', () => ({ PdfBinaryData: class {} }));
beforeEach(() => vi.clearAllMocks());

it('reads independent bytes for the worker and configures a local Vite worker URL', async () => {
  const bytes = new Uint8Array([37,80,68,70,1,2,3]);
  const file = new File([bytes], 'file.pdf');
  const destroy = vi.fn(async () => {});
  vi.mocked(getDocument).mockImplementation(options => {
    const data = (options as { data: Uint8Array }).data;
    expect(options).toMatchObject({ stopAtErrors: true, canvasMaxAreaInBytes: 16 * 1024 ** 2 });
    expect(options).not.toHaveProperty('maxImageSize');
    expect(data).toEqual(bytes); expect(data.buffer).not.toBe(bytes.buffer);
    structuredClone(data, { transfer: [data.buffer] });
    return { promise: Promise.resolve({}), destroy } as unknown as ReturnType<typeof getDocument>;
  });
  const session = await openPreview(file as unknown as globalThis.File, new AbortController().signal);
  expect(bytes.byteLength).toBe(7); expect((await file.arrayBuffer()).byteLength).toBe(7);
  expect(GlobalWorkerOptions.workerSrc).toContain('pdf.worker.min.mjs');
  expect(GlobalWorkerOptions.workerSrc).not.toMatch(/^https?:/);
  await session.destroy(); expect(destroy).toHaveBeenCalledOnce();
});
it('destroys a loading document on abort and does not deliver a stale session', async () => {
  const controller = new AbortController();
  let reject!: (error: Error) => void;
  const destroy = vi.fn(async () => { reject(new Error('Loading cancelled')); });
  vi.mocked(getDocument).mockReturnValue({ promise: new Promise((_, no) => { reject = no; }), destroy } as unknown as ReturnType<typeof getDocument>);
  const output = openPreview(new File(['pdf'], 'f.pdf') as unknown as globalThis.File, controller.signal);
  const rejected = expect(output).rejects.toThrow('Loading cancelled');
  await vi.waitFor(() => expect(getDocument).toHaveBeenCalled());
  controller.abort(); await rejected; expect(destroy).toHaveBeenCalled();
});
it('ships complete Apache-2.0, CMap, font and codec notices with the private tool', () => {
  const text = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const notice = text('src/tools/pdf-split/pdfjs.NOTICE.txt');
  const base = 'node_modules/pdfjs-dist/';
  const licenses = ['LICENSE', ...['cmaps','standard_fonts','wasm'].flatMap(dir => readdirSync(base + dir).filter(n => /^LICENSE/.test(n)).map(n => dir + '/' + n))];
  for (const file of licenses) expect(notice).toContain(text(base + file));
});
