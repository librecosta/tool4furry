// @vitest-environment node
import {readFileSync} from 'node:fs';
import {expect, it, vi} from 'vitest';
import {PDFDocument, PDFName, PDFDict, PDFRawStream} from 'pdf-lib';
import {imagesPdf} from '../src/tools/images-to-pdf/output';
import {imagesPdfBudget, imagesPdfLimits, heavyImages} from '../src/tools/images-to-pdf/policy';
import {inspectComic} from '../src/tools/comic-page-organizer/source';
import {pdfBudget} from '../src/tools/comic-page-organizer/pdf';
import {ImageResources} from '../src/tools/image/resources';
import {decodeChecked} from '../src/tools/image/browser-codec';
vi.mock('../src/tools/image/browser-codec', () => ({orientedSize: (i: {width:number;height:number;orientation:number}) => i.orientation >= 5 ? {width:i.height,height:i.width} : {width:i.width,height:i.height}, decodeChecked: vi.fn(async () => ({close: vi.fn()})), toBlob: vi.fn()}));
const load = (name: string) => inspectComic(new File([readFileSync(`tests/fixtures/images/${name}`)], name), imagesPdfLimits);
it('creates more than 40 real pages in order, preserving JPEG bytes, EXIF orientation and PNG alpha', async () => {
  const jpg = await load('orientation-6.jpg'), png = await load('transparent.png');
  const sources = [jpg, png, ...Array.from({length:43}, () => jpg)], resources = new ImageResources(), progress = vi.fn();
  const blob = await imagesPdf(sources, resources, new AbortController().signal, progress);
  expect(blob.type).toBe('application/pdf');
  const pdf = await PDFDocument.load(await blob.arrayBuffer());
  expect(pdf.getPageCount()).toBe(45);
  pdf.getPages().forEach((page, i) => {
    expect(page.getSize()).toEqual({width:sources[i].width,height:sources[i].height});
    const images = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    const image = pdf.context.lookup(images.values()[0]) as PDFRawStream;
    expect(image).toBeInstanceOf(PDFRawStream);
    if(i === 1) expect(image.dict.get(PDFName.of('SMask'))).toBeTruthy();
    else expect(image.contents).toEqual(new Uint8Array(readFileSync('tests/fixtures/images/orientation-6.jpg')));
  });
  expect(progress.mock.calls.map(c=>c[0])).toEqual(Array.from({length:45},(_,i)=>i+1));
  expect(resources.bitmapsClosed).toBe(45); expect(resources.canvasesCreated).toBe(0);
});
it('uses former count, size and combined-pixel limits only as warnings, not PDF budget refusals', async () => {
  const source = await load('static.jpg');
  const samples = [{...source, file: {size:40*1024**2} as File, width:6000,height:5000}];
  expect(()=>pdfBudget(samples,imagesPdfBudget)).not.toThrow();
  expect(imagesPdfLimits.bytes).toBeGreaterThan(40*1024**2);
  expect(imagesPdfLimits.pixels).toBeGreaterThan(30_000_000);
  expect(heavyImages(samples.map(source=>({file:source.file,source})))).toBe(true);
});
it('reports real decode/embedding failures with the input name and does not produce a stale PDF after cancellation', async () => {
  const source = await load('static.jpg');
  vi.mocked(decodeChecked).mockRejectedValueOnce(new Error('allocation failed'));
  await expect(imagesPdf([source],new ImageResources(),new AbortController().signal,()=>{})).rejects.toThrow('static.jpg');
  const c = new AbortController();
  await expect(imagesPdf([source,source],new ImageResources(),c.signal,()=>c.abort())).rejects.toThrow('changed');
});
