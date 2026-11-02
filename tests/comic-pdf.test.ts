// @vitest-environment node
import {expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {PDFDocument, PDFName, PDFDict} from 'pdf-lib';
import {comicPdf, pdfBudget, pdfOrientation} from '../src/tools/comic-page-organizer/pdf';
import {inspectComic, comicThumbnail} from '../src/tools/comic-page-organizer/source';
import {desktopComicBudget as budget} from '../src/tools/comic-page-organizer/limits';
import {ImageResources} from '../src/tools/image/resources';
import {decodeChecked} from '../src/tools/image/browser-codec';
vi.mock('../src/tools/image/browser-codec', () => ({orientedSize: (info: {width: number; height: number; orientation: number}) => info.orientation >= 5 ? {width: info.height, height: info.width} : {width: info.width, height: info.height}, decodeChecked: vi.fn(async (_blob, info) => ({width: info.orientation >= 5 ? info.height : info.width, height: info.orientation >= 5 ? info.width : info.height})), toBlob: vi.fn()}));
const load = (name: string) => inspectComic(new File([readFileSync(`tests/fixtures/images/${name}`)], name), budget.input);
it('does not decode on container intake and rejects malformed files', async () => {
  vi.mocked(decodeChecked).mockClear(); await load('static.jpg'); expect(decodeChecked).not.toHaveBeenCalled();
  await expect(load('truncated.png')).rejects.toThrow();
});
it('releases the thumbnail bitmap even if the bounded canvas allocation fails', async () => {
  const source=await load('static.jpg'), resources=new ImageResources();
  resources.close=vi.fn(); resources.canvas=vi.fn(()=>{throw Error('canvas');});
  await expect(comicThumbnail(source,resources,budget.input)).rejects.toThrow('canvas');
  expect(resources.close).toHaveBeenCalledOnce();
});
it('creates real pages in source order, with original JPEG/PNG embedding and oriented dimensions', async () => {
  const sources = await Promise.all(['orientation-6.jpg','transparent.png','orientation-2.jpg'].map(load));
  const resources = new ImageResources(); resources.close = vi.fn(); const progress = vi.fn();
  const blob = await comicPdf(sources, resources, budget.input, budget.pdf, new AbortController().signal, progress);
  expect(blob.type).toBe('application/pdf'); expect(new TextDecoder().decode(await blob.slice(0,5).arrayBuffer())).toBe('%PDF-');
  const pdf = await PDFDocument.load(await blob.arrayBuffer()); expect(pdf.getPageCount()).toBe(3);
  pdf.getPages().forEach((page, i) => {
    expect(page.getSize()).toEqual({width: sources[i].width, height: sources[i].height});
    const images = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    expect(images.keys()).toHaveLength(1);
  });
  expect(resources.close).toHaveBeenCalledTimes(3); expect(resources.canvasesCreated).toBe(0);
  expect(progress.mock.calls.map(c => c[0])).toEqual([1,2,3]);
});
it.each([1,2,3,4,5,6,7,8])('maps EXIF %i corners to the exact complete page bounds', orientation => {
  const w=70,h=40,[a,b,c,d,e,f]=pdfOrientation(orientation,w,h);
  const corners=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f]);
  expect(Math.min(...corners.map(p=>p[0]))).toBe(0); expect(Math.min(...corners.map(p=>p[1]))).toBe(0);
  expect(Math.max(...corners.map(p=>p[0]))).toBe(orientation>=5?h:w); expect(Math.max(...corners.map(p=>p[1]))).toBe(orientation>=5?w:h);
});
it('enforces separate PDF page, input, total-pixel and output budgets and observes cancellation', async () => {
  const source = await load('static.jpg'), resources = new ImageResources(); resources.close = vi.fn();
  expect(()=>pdfBudget([source],{...budget.pdf,pages:0})).toThrow('budget');
  expect(()=>pdfBudget([source],{...budget.pdf,bytes:1})).toThrow('budget');
  expect(()=>pdfBudget([source],{...budget.pdf,pixels:1})).toThrow('budget');
  await expect(comicPdf([source],resources,budget.input,{...budget.pdf,outputBytes:1},new AbortController().signal,()=>{})).rejects.toThrow('budget');
  const controller = new AbortController(); controller.abort();
  await expect(comicPdf([source],resources,budget.input,budget.pdf,controller.signal,()=>{})).rejects.toThrow('changed');
});
