import { inspectImage } from '../image/inspect-image';
import { decodeChecked, orientedSize, toBlob } from '../image/browser-codec';
import { mime, type ImageSource } from '../image/types';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';

/** Bounded container scan only at intake; no full bitmap for hundreds of pages. */
export async function inspectComic(file: File, limits: ImageLimits): Promise<ImageSource> {
  const info = await inspectImage(file, limits.bytes, limits);
  return {file, blob: file.slice(0, file.size, mime[info.format]), info, ...orientedSize(info)};
}
/** Complete decode before delivery, one page at a time. Never changes the File. */
export async function verifyComic(source: ImageSource, resources: ImageResources, limits: ImageLimits) {
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  resources.close(bitmap);
}
export async function comicThumbnail(source: ImageSource, resources: ImageResources, limits: ImageLimits) {
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  const ratio = Math.min(1, 480 / Math.max(source.width, source.height));
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = resources.canvas(Math.max(1, Math.round(source.width * ratio)), Math.max(1, Math.round(source.height * ratio)));
    const context = canvas.getContext('2d'); if (!context) throw new Error('canvas');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await toBlob(canvas, 'image/webp', .75);
  } finally {resources.close(bitmap); if (canvas) resources.release(canvas);}
}
