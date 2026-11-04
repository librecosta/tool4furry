// @vitest-environment node
import { expect, it } from 'vitest';
import { PDFDocument, PDFArray, StandardFonts, decodePDFRawStream, degrees } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { pageRange } from '../src/tools/general/pdf';
import { formatPages, togglePage } from '../src/tools/pdf-split/selection';
import { createOutput } from '../src/tools/pdf-split/output';

function contents(doc: PDFDocument) {
  return doc.getPages().map(page => {
    const value = page.node.Contents()!;
    const streams = value instanceof PDFArray ? value.asArray() : [value];
    return { size: page.getSize(), rotation: page.getRotation().angle, data: streams.map(stream => [...decodePDFRawStream(doc.context.lookup(stream) as Parameters<typeof decodePDFRawStream>[0]).decode()]) };
  });
}
async function fixture(count: number) {
  const doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < count; i++) {
    const page = doc.addPage([240 + i, 320]);
    if (i === 4) page.setRotation(degrees(90));
    page.drawText(`Original page ${i + 1}`, { x: 20, y: 100, font });
  }
  return PDFDocument.load(await doc.save(), { updateMetadata: false });
}
it('compresses adjacent pages without changing explicit range order; clicks normalize to source order', () => {
  expect(formatPages([0, 1, 2, 4, 7])).toBe('1-3,5,8');
  expect(formatPages([7, 0, 1, 2, 4])).toBe('8,1-3,5');
  let range = '1-10';
  for (const page of [4, 6, 7, 9, 10]) range = togglePage(range, 10, page - 1);
  expect(range).toBe('1-3,5,8');
  expect(pageRange('8,1-3,5', 10)).toEqual([7, 0, 1, 2, 4]);
  expect(togglePage('8,1-3,5', 10, 7)).toBe('1-3,5');
  expect(togglePage('invalid', 10, 2)).toBe('3');
  expect(togglePage('3', 10, 2)).toBe('');
});
it('extracts actual PDF content streams and rotation in selected order', async () => {
  const doc = await fixture(10), indices = pageRange('8,1-3,5', 10);
  const blob = await createOutput(doc, indices, 'pdf', new AbortController().signal);
  expect(blob.type).toBe('application/pdf');
  expect(contents(await PDFDocument.load(await blob.arrayBuffer()))).toEqual(indices.map(i => contents(doc)[i]));
});
it('ZIP contains only selected pages, original page numbers and real validated PDF contents', async () => {
  const doc = await fixture(10), indices = [7, 0, 4];
  const zip = await createOutput(doc, indices, 'zip', new AbortController().signal);
  expect(zip.type).toBe('application/zip');
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(entries)).toEqual(['page-008.pdf', 'page-001.pdf', 'page-005.pdf']);
  for (const [position, bytes] of Object.values(entries).entries())
    expect(contents(await PDFDocument.load(bytes))).toEqual([contents(doc)[indices[position]]]);
});
it('allows ten selected pages from a 500-page input; rejects invalid selections and more than 200 ZIP pages', async () => {
  const doc = await fixture(500), signal = new AbortController().signal;
  const zip = await createOutput(doc, pageRange('491-500', 500), 'zip', signal);
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(entries)).toHaveLength(10);
  expect(Object.keys(entries)[0]).toBe('page-491.pdf');
  for (const pages of [[], [0, 0], [-1], [500]]) await expect(createOutput(doc, pages, 'pdf', signal)).rejects.toThrow();
  await expect(createOutput(doc, doc.getPageIndices().slice(0, 201), 'zip', signal)).rejects.toThrow(/200/);
  const controller = new AbortController(); controller.abort();
  await expect(createOutput(doc, [0], 'zip', controller.signal)).rejects.toThrow(/Cancelled/);
});
