// @vitest-environment node
import { expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFArray, decodePDFRawStream, StandardFonts } from 'pdf-lib';
import { readPdf, mergePdfs, finishPdf } from '../src/tools/general/pdf';
import { MiB } from '../src/tools/general/bounds';

async function fixture(name: string, labels: string[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [index, label] of labels.entries()) {
    const page = doc.addPage([300 + index * 10, 400]);
    page.drawText(label, { x: 30, y: 200, font });
  }
  return new File([(await doc.save()) as Uint8Array<ArrayBuffer>], name, { type: 'application/pdf' });
}
function contents(doc: PDFDocument) {
  return doc.getPages().map(page => {
    const value = page.node.Contents()!;
    const streams = value instanceof PDFArray ? value.asArray() : [value];
    return { size: page.getSize(), rotation: page.getRotation().angle,
      data: streams.map(stream => [...decodePDFRawStream(doc.context.lookup(stream) as Parameters<typeof decodePDFRawStream>[0]).decode()]) };
  });
}
it('merges actual page content streams in the exact input order', async () => {
  const a = await fixture('two.pdf', ['A1', 'A2']), b = await fixture('one.pdf', ['B1']);
  const result = await mergePdfs([b, a]);
  expect(result.type).toBe('application/pdf');
  const out = await PDFDocument.load(await result.arrayBuffer());
  expect(out.getPageCount()).toBe(3);
  expect(contents(out)).toEqual([...contents(await readPdf(b)), ...contents(await readPdf(a))]);
});
it('rejects damaged and encrypted PDF containers', async () => {
  await expect(readPdf(new File(['not a PDF'], 'bad.pdf'))).rejects.toThrow(/damaged/);
  const doc = await PDFDocument.create(); doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: PDFName.of('Standard') }));
  await expect(readPdf(new File([(await doc.save()) as Uint8Array<ArrayBuffer>], 'encrypted.pdf'))).rejects.toThrow(/encrypted/);
});
it('rejects file-count, individual-size and aggregate limits before reading files', async () => {
  const file = new File(['x'], 'limit.pdf');
  await expect(mergePdfs(Array(101).fill(file))).rejects.toThrow(/limit/);
  const oversized = new File(['x'], 'large.pdf'); Object.defineProperty(oversized, 'size', { value: 32 * MiB + 1 });
  await expect(mergePdfs([oversized])).rejects.toThrow(/limit/);
  const item = new File(['x'], 'part.pdf'); Object.defineProperty(item, 'size', { value: 25 * MiB });
  await expect(mergePdfs(Array(4).fill(item))).rejects.toThrow(/limit/);
});
it('rejects excessive source and combined pages and pre-cancelled work', async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 1001; i++) doc.addPage([10, 10]);
  const bytes = await doc.save();
  await expect(readPdf(new File([bytes as Uint8Array<ArrayBuffer>], '1001.pdf'))).rejects.toThrow(/1,000/);
  doc.removePage(1000);
  const thousand = new File([(await doc.save()) as Uint8Array<ArrayBuffer>], '1000.pdf');
  const one = await fixture('one.pdf', ['one']);
  await expect(mergePdfs([thousand, one])).rejects.toThrow(/1,000/);
  const controller = new AbortController(); controller.abort();
  await expect(mergePdfs([one], controller.signal)).rejects.toThrow(/Cancelled/);
});
it('rejects oversized output before accepting or parsing it', async () => {
  const doc = { save: async () => ({ length: 128 * MiB + 1 }) } as unknown as PDFDocument;
  await expect(finishPdf(doc, 1)).rejects.toThrow(/128 MiB/);
});
