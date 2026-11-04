import type { PDFDocument } from 'pdf-lib';
import { abort, extractPdf } from '../general/pdf';
import { fail, MiB } from '../general/bounds';
import { packZip } from '../image-converter/zip';

export type OutputKind = 'pdf' | 'zip';
export function outputIssue(count: number, kind: OutputKind) {
  if (!count) fail('请至少选择一页。', 'Select at least one page.');
  if (kind === 'zip' && count > 200)
    fail('逐页 ZIP 最多选择 200 页。', 'Select at most 200 pages for a per-page ZIP.');
}

export async function createOutput(doc: PDFDocument, pages: readonly number[], kind: OutputKind, signal: AbortSignal) {
  outputIssue(pages.length, kind);
  if (new Set(pages).size !== pages.length || pages.some(i => !Number.isInteger(i) || i < 0 || i >= doc.getPageCount()))
    fail('无效的页码。', 'Invalid page selection.');
  if (kind === 'pdf') return extractPdf(doc, [...pages], signal);
  const entries = [];
  let bytes = 22;
  for (const index of pages) {
    abort(signal);
    const blob = await extractPdf(doc, [index], signal);
    const name = `page-${String(index + 1).padStart(3, '0')}.pdf`;
    bytes += blob.size + 92 + 2 * new TextEncoder().encode(name).length;
    if (bytes > 96 * MiB) fail('逐页输出超过 96 MiB。', 'Per-page output exceeds 96 MiB.');
    entries.push({ name, blob });
  }
  return packZip(entries, signal);
}
