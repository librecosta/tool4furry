import { PreviewSession } from './preview-session';

/** Loaded only after a validated local PDF is selected; never part of the shell. */
export async function openPreview(file: File, signal: AbortSignal) {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }, { PdfBinaryData }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url&no-inline'),
    import('./preview-assets'),
  ]);
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  // A separate File read: PDF.js may transfer this buffer to its worker.
  // pdf-lib's document and its input bytes never share this ArrayBuffer.
  const data = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data, useWorkerFetch: false,
    BinaryDataFactory: PdfBinaryData, stopAtErrors: true, enableXfa: false,
    // Let PDF.js downsample large embedded images within its canvas budget.
    // maxImageSize would silently omit their contents from otherwise valid pages.
    canvasMaxAreaInBytes: 16 * 1024 ** 2 });
  const cancel = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 20_000);
  try {
    const doc = await task.promise;
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return new PreviewSession(doc, async () => {
      signal.removeEventListener('abort', cancel);
      await task.destroy();
    });
  } catch (error) {
    signal.removeEventListener('abort', cancel);
    await task.destroy().catch(() => {});
    throw error;
  } finally { clearTimeout(timer); }
}
