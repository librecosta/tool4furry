import { decodeChecked, toBlob, validateOutput } from '../image/browser-codec';
import { checkDimensions, ImageFailure, mime, type ImageSource, type NativeImageFormat } from '../image/types';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';

export type CompressionSettings = Readonly<{
  mode: 'recommended' | 'quality' | 'target';
  format: NativeImageFormat;
  quality: number;
  targetBytes: number;
  longestEdge?: number;
  background: string;
}>;
export const recommendedSettings: CompressionSettings = {
  mode: 'recommended', format: 'webp', quality: 82, targetBytes: 200 * 1024, background: '#FFFFFF',
};
export function validSettings(s: CompressionSettings) {
  return ['recommended', 'quality', 'target'].includes(s.mode) && ['png', 'jpeg', 'webp'].includes(s.format) &&
    Number.isInteger(s.quality) && s.quality >= 1 && s.quality <= 100 &&
    Number.isSafeInteger(s.targetBytes) && s.targetBytes >= 1024 && s.targetBytes <= 128 * 1024 ** 2 &&
    (s.longestEdge === undefined || Number.isSafeInteger(s.longestEdge) && s.longestEdge >= 1 && s.longestEdge <= 10000) &&
    /^#[0-9a-f]{6}$/i.test(s.background);
}
export function outputSize(source: {width: number; height: number}, edge?: number) {
  if (edge !== undefined && (!Number.isSafeInteger(edge) || edge < 1 || edge > 10000)) throw new ImageFailure('dimensions');
  const scale = edge === undefined ? 1 : Math.min(1, edge / Math.max(source.width, source.height));
  return {width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale))};
}

/** One source draw, at most eight serial encodes. The result is never inferred from the requested MIME. */
export async function compressImage(source: ImageSource, settings: CompressionSettings, resources: ImageResources, limits: ImageLimits, current: () => boolean) {
  if (!validSettings(settings)) throw new ImageFailure('encode');
  const size = outputSize(source, settings.longestEdge);
  checkDimensions(size.width, size.height, limits);
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (!current()) throw new ImageFailure('cancelled');
    canvas = resources.canvas(size.width, size.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageFailure('encode');
    if (settings.format === 'jpeg') { ctx.fillStyle = settings.background; ctx.fillRect(0, 0, size.width, size.height); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  } catch (error) {
    if (canvas) resources.release(canvas);
    throw error;
  } finally { resources.close(bitmap); }
  try {
    let attempts = 0;
    const encode = async (quality: number) => {
      if (!current()) throw new ImageFailure('cancelled');
      attempts++;
      const blob = await toBlob(canvas!, mime[settings.format], settings.format === 'png' ? undefined : quality / 100);
      if (!current()) throw new ImageFailure('cancelled');
      // A browser falling back to PNG is a failure, never a renamed JPEG/WebP.
      if (blob.type !== mime[settings.format]) throw new ImageFailure('output');
      return blob;
    };
    let quality = settings.mode === 'recommended' ? 82 : settings.quality;
    let best = await encode(quality);
    if (settings.mode === 'target' && settings.format !== 'png' && best.size > settings.targetBytes) {
      let low = 1, high = quality - 1, fitting: {blob: Blob; quality: number} | undefined;
      const smallest = await encode(1);
      if (smallest.size < best.size) { best = smallest; quality = 1; }
      if (smallest.size <= settings.targetBytes) {
        fitting = {blob: smallest, quality: 1}; low = 2;
        // Canvas encoders are not required to be perfectly monotonic. Retain the
        // actual smallest candidate and highest sampled fitting quality.
        while (low <= high && attempts < 8) {
          const candidateQuality = Math.floor((low + high) / 2), blob = await encode(candidateQuality);
          if (blob.size < best.size) { best = blob; quality = candidateQuality; }
          if (blob.size <= settings.targetBytes) { fitting = {blob, quality: candidateQuality}; low = candidateQuality + 1; }
          else high = candidateQuality - 1;
        }
      }
      if (fitting) { best = fitting.blob; quality = fitting.quality; }
    }
    // Release the drawing surface before full decode verification allocates a Bitmap.
    resources.release(canvas!); canvas = undefined;
    const blob = await validateOutput(best, settings.format, size.width, size.height, resources, limits);
    if (!current()) throw new ImageFailure('cancelled');
    return {blob, ...size, format: settings.format, quality, attempts,
      targetMet: settings.mode !== 'target' || blob.size <= settings.targetBytes,
      saved: source.file.size - blob.size};
  } finally { if (canvas) resources.release(canvas); }
}
