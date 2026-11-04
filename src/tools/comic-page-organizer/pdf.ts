import { PDFDocument, PDFDict, PDFName, pushGraphicsState, popGraphicsState, concatTransformationMatrix } from 'pdf-lib';
import { decodeChecked, toBlob } from '../image/browser-codec';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';
import type { ImageSource } from '../image/types';
import { ArchiveFailure } from '../archive/stream-zip';
import type { ComicBudget } from './limits';

export function pdfBudget(sources: readonly ImageSource[], budget: ComicBudget['pdf']) {
  if (!sources.length || sources.length > budget.pages || sources.reduce((n, s) => n + s.file.size, 0) > budget.bytes || sources.reduce((n, s) => n + s.width * s.height, 0) > budget.pixels) throw new ArchiveFailure('budget');
}
// PDF coordinates start at the bottom left; EXIF starts at the top left.
export function pdfOrientation(direction: number, w: number, h: number): [number, number, number, number, number, number] {
  return ([undefined, [1,0,0,1,0,0], [-1,0,0,1,w,0], [-1,0,0,-1,w,h], [1,0,0,-1,0,h], [0,-1,-1,0,h,w], [0,-1,1,0,0,w], [0,1,1,0,0,0], [0,1,-1,0,h,0]][direction] ?? [1,0,0,1,0,0]) as [number,number,number,number,number,number];
}
export async function comicPdf(sources: readonly ImageSource[], resources: ImageResources, limits: ImageLimits, budget: ComicBudget['pdf'], signal: AbortSignal, progress: (count: number) => void, options?: {maxPageEdge: number}) {
  pdfBudget(sources, budget);
  const check = () => {if (signal.aborted) throw new ArchiveFailure('changed');};
  const doc = await PDFDocument.create();
  const placements: {width: number; height: number; ref: string}[] = [];
  for (const [index, source] of sources.entries()) {
    check();
    const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
    let canvas: HTMLCanvasElement | undefined;
    try {
      check(); const direct = source.info.format === 'jpeg' || source.info.format === 'png';
      let bytes: Uint8Array;
      if (direct) bytes = new Uint8Array(await source.blob.arrayBuffer());
      else {
        canvas = resources.canvas(source.width, source.height);
        const context = canvas.getContext('2d'); if (!context) throw new Error('canvas');
        context.drawImage(bitmap, 0, 0);
        bytes = new Uint8Array(await (await toBlob(canvas, 'image/png')).arrayBuffer());
      }
      check(); const image = source.info.format === 'jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
      const scale = options ? Math.min(1, options.maxPageEdge / Math.max(source.width, source.height)) : 1;
      const page = doc.addPage([source.width * scale, source.height * scale]);
      placements.push({width: page.getWidth(), height: page.getHeight(), ref: image.ref.toString()});
      if (scale !== 1) page.pushOperators(concatTransformationMatrix(scale, 0, 0, scale, 0, 0));
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...pdfOrientation(direct ? source.info.orientation : 1, direct ? source.info.width : source.width, direct ? source.info.height : source.height)));
      page.drawImage(image, {x: 0, y: 0, width: image.width, height: image.height});
      page.pushOperators(popGraphicsState());
      await doc.flush(); // Release pending PNG raw alpha/pixel arrays after embedding.
    } finally {resources.close(bitmap); if (canvas) resources.release(canvas);}
    progress(index + 1); await new Promise(resolve => setTimeout(resolve, 0));
  }
  check(); const bytes = await doc.save({objectsPerTick: 20}); check();
  if (!bytes.length || bytes.length > budget.outputBytes) throw new ArchiveFailure('budget');
  const verified = await PDFDocument.load(bytes, {updateMetadata: false});
  if (verified.getPageCount() !== sources.length || verified.getPages().some((page, i) => {
    const expected = placements[i], images = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    return page.getWidth() !== expected.width || page.getHeight() !== expected.height || !images?.values().some(ref => ref.toString() === expected.ref);
  })) throw new ArchiveFailure('failed');
  check(); return new Blob([bytes as Uint8Array<ArrayBuffer>], {type: 'application/pdf'});
}
