import { PDFDocument } from 'pdf-lib';
import { boundedFiles, fail, MiB } from './bounds';
export const abort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('Cancelled');
};
export async function readPdf(file: File) {
  boundedFiles([file], 1, 32 * MiB, 32 * MiB);
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), {
      updateMetadata: false,
    });
    if (doc.isEncrypted || doc.getPageCount() < 1 || doc.getPageCount() > 1000)
      throw new Error();
    return doc;
  } catch {
    fail(
      'PDF 损坏、已加密、不受支持或超过 1000 页。',
      'PDF is damaged, encrypted, unsupported or exceeds 1,000 pages.',
    );
  }
}
export async function finishPdf(
  doc: PDFDocument,
  count: number,
  signal?: AbortSignal,
) {
  abort(signal);
  const bytes = await doc.save({ objectsPerTick: 20 });
  abort(signal);
  if (bytes.length > 128 * MiB)
    fail('PDF 输出超过 128 MiB。', 'PDF output exceeds 128 MiB.');
  const checked = await PDFDocument.load(bytes, { updateMetadata: false });
  if (checked.getPageCount() !== count)
    fail('PDF 验证失败。', 'PDF verification failed.');
  abort(signal);
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/pdf',
  });
}
export function pageRange(input: string, count: number) {
  if (input.length > 10000 || !input.trim())
    fail('请输入页码范围。', 'Enter a page range.');
  const pages: number[] = [];
  const seen = new Set<number>();
  for (const token of input.split(',')) {
    const m = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) fail('无效的页码范围。', 'Invalid page range.');
    const start = Number(m[1]),
      end = Number(m[2] ?? m[1]);
    if (start < 1 || end < start || end > count)
      fail('页码越界或范围倒序。', 'Page range is out of bounds or reversed.');
    for (let n = start; n <= end; n++) {
      if (seen.has(n))
        fail('页码不能重复。', 'Duplicate pages are not allowed.');
      seen.add(n);
      pages.push(n - 1);
    }
  }
  return pages;
}
export async function mergePdfs(files: File[], signal?: AbortSignal) {
  boundedFiles(files);
  const output = await PDFDocument.create();
  let count = 0;
  for (const file of files) {
    abort(signal);
    const doc = await readPdf(file);
    count += doc.getPageCount();
    if (count > 1000) fail('合并最多 1000 页。', 'Merge at most 1,000 pages.');
    for (const page of await output.copyPages(doc, doc.getPageIndices()))
      output.addPage(page);
    await new Promise((r) => setTimeout(r, 0));
  }
  return finishPdf(output, count, signal);
}
export async function extractPdf(
  doc: PDFDocument,
  indices: number[],
  signal?: AbortSignal,
) {
  abort(signal);
  const out = await PDFDocument.create();
  for (const page of await out.copyPages(doc, indices)) out.addPage(page);
  return finishPdf(out, indices.length, signal);
}
