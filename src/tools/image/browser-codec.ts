import { inspectImage } from './inspect-image';
import { ImageResources } from './resources';
import {
  ImageFailure,
  checkDimensions,
  imageBudget,
  mime,
  nativeFormats,
  type ImageInfo,
  type ImageSource,
  type ImageFormat,
} from './types';
import { allowsAvifOutput, avifOutputLimits, type ImageLimits } from './limits';
import { cleanImageMetadata } from './metadata';
import { inspectAvif, qualifyCanvasAvif } from './inspect-avif';
import { AvifEncoder } from './avif-encoder';

export function orientedSize(info: ImageInfo) {
  return info.orientation >= 5
    ? { width: info.height, height: info.width }
    : { width: info.width, height: info.height };
}
export async function decodeChecked(
  blob: Blob,
  info: ImageInfo,
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
) {
  checkDimensions(info.width, info.height, limits);
  // Chromium can ignore WebP EXIF mirrors as well as rotations; dimensions alone
  // cannot detect orientations 2–4. Do not return a silently misoriented image.
  if (info.format === 'webp' && info.orientation !== 1)
    throw new ImageFailure('orientation');
  let bitmap: ImageBitmap;
  try {
    bitmap = await resources.bitmap(blob);
  } catch {
    throw new ImageFailure('decode');
  }
  const size = orientedSize(info);
  if (bitmap.width !== size.width || bitmap.height !== size.height) {
    resources.close(bitmap);
    throw new ImageFailure('decode');
  }
  return bitmap;
}
export async function acceptImage(
  file: File,
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
): Promise<ImageSource> {
  const info = await inspectImage(file, limits.bytes, limits);
  const blob = file.slice(0, file.size, mime[info.format]);
  const bitmap = await decodeChecked(blob, info, resources, limits);
  resources.close(bitmap);
  return { file, info, blob, ...orientedSize(info) };
}

export function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) =>
          blob?.size ? resolve(blob) : reject(new ImageFailure('encode')),
        type,
        quality,
      );
    } catch {
      reject(new ImageFailure('encode'));
    }
  });
}
export async function validateOutput(
  blob: Blob,
  format: ImageFormat,
  width: number,
  height: number,
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
) {
  if (!blob.size || blob.size > limits.pixels * 5 + 1024 ** 2 || blob.type !== mime[format])
    throw new ImageFailure('output');
  try {
    // Source byte guard is not an output size promise: a JPEG can become a larger PNG.
    const cleaned = format === 'avif' ? {
      blob,
      info: await inspectAvif(blob, { ...limits, ...avifOutputLimits }, true),
    } : await cleanImageMetadata(
      blob,
      limits.pixels * 5 + 1024 * 1024,
      limits,
    );
    const info = cleaned.info;
    if (
      info.format !== format ||
      info.orientation !== 1 ||
      info.width !== width ||
      info.height !== height
    )
      throw new ImageFailure('output');
    const bitmap = await decodeChecked(cleaned.blob, info, resources, limits);
    resources.close(bitmap);
    return cleaned.blob;
  } catch (error) {
    throw new ImageFailure(
      'output',
      error instanceof ImageFailure
        ? `${error.code}: ${error.detail}`
        : String(error),
    );
  }
}

// Unlike re-encoding, lossless cleanup keeps the source's stored dimensions and
// minimum EXIF direction. Both metadata policy and actual decode are rechecked.
export async function prepareQuickOutput(
  source: ImageSource,
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
) {
  const cleaned = await cleanImageMetadata(source.blob, limits.bytes, limits);
  if (['format', 'width', 'height', 'orientation'].some(
    k => cleaned.info[k as keyof ImageInfo] !== source.info[k as keyof ImageInfo],
  )) throw new ImageFailure('output');
  const bitmap = await decodeChecked(cleaned.blob, cleaned.info, resources, limits);
  resources.close(bitmap);
  return { ...cleaned, kind: cleaned.changed ? 'cleaned' as const : 'passthrough' as const };
}
export async function encodeImage(
  source: ImageSource,
  settings: {
    format: ImageFormat;
    quality: number | null;
    jpegBackground: string;
    avif444?: boolean;
  },
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
  operation?: { signal?: AbortSignal; avif: AvifEncoder },
) {
  const { format, quality, jpegBackground } = settings;
  if (format === 'avif') {
    if (!allowsAvifOutput(limits)) throw new ImageFailure('avifDevice');
    if (source.width > avifOutputLimits.edge || source.height > avifOutputLimits.edge || source.width * source.height > avifOutputLimits.pixels)
      throw new ImageFailure('avifBudget');
    if (!Number.isInteger(quality) || quality! < 1 || quality! > 100) throw new ImageFailure('encode');
    if (!operation) throw new ImageFailure('avifLoad');
    const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
    let canvas: HTMLCanvasElement | undefined;
    let pixels: ImageData;
    try {
      if (operation.signal?.aborted) throw new ImageFailure('cancelled');
      canvas = resources.canvas(source.width, source.height);
      const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      if (!context) throw new ImageFailure('encode');
      context.drawImage(bitmap, 0, 0);
      pixels = context.getImageData(0, 0, source.width, source.height);
    } finally { resources.close(bitmap); if (canvas) resources.release(canvas); }
    const buffer = await operation.avif.encode(pixels.data.buffer as ArrayBuffer, source.width, source.height, quality!, !!settings.avif444, operation.signal);
    if (operation.signal?.aborted) throw new ImageFailure('cancelled');
    const blob = await qualifyCanvasAvif(new Blob([buffer], { type: mime.avif }), limits);
    return validateOutput(blob, 'avif', source.width, source.height, resources, limits);
  }
  if (
    format !== 'png' &&
    (!Number.isInteger(quality) || quality! < 1 || quality! > 100)
  )
    throw new ImageFailure('encode');
  if (format === 'jpeg' && !/^#[0-9a-f]{6}$/i.test(jpegBackground))
    throw new ImageFailure('encode');
  checkDimensions(source.width, source.height, limits);
  const bitmap = await decodeChecked(
    source.blob,
    source.info,
    resources,
    limits,
  );
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = resources.canvas(source.width, source.height);
    const context = canvas.getContext('2d');
    if (!context) throw new ImageFailure('encode');
    if (format === 'jpeg') {
      context.fillStyle = jpegBackground;
      context.fillRect(0, 0, source.width, source.height);
    }
    context.drawImage(bitmap, 0, 0);
  } catch (error) {
    if (canvas) resources.release(canvas);
    throw error;
  } finally {
    resources.close(bitmap);
  }
  try {
    const blob = await toBlob(
      canvas!,
      mime[format],
      format === 'png' ? undefined : quality! / 100,
    );
    resources.release(canvas!);
    canvas = undefined;
    return await validateOutput(
      blob,
      format,
      source.width,
      source.height,
      resources,
      limits,
    );
  } finally {
    if (canvas) resources.release(canvas);
  }
}

export type Capabilities = Record<
  ImageFormat,
  { supported: boolean; reason?: string }
>;
export async function detectCapabilities(
  resources: ImageResources,
  limits: ImageLimits = imageBudget,
): Promise<Capabilities> {
  const result = {} as Capabilities;
  for (const format of nativeFormats) {
    const canvas = resources.canvas(2, 2);
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new ImageFailure('encode');
      context.fillStyle = '#A6532C';
      context.fillRect(0, 0, 1, 2);
      const blob = await toBlob(canvas, mime[format], 0.85);
      await validateOutput(blob, format, 2, 2, resources, limits);
      result[format] = { supported: true };
    } catch (error) {
      result[format] = {
        supported: false,
        reason: error instanceof ImageFailure ? error.code : 'encode',
      };
    } finally {
      resources.release(canvas);
    }
  }
  // Canvas serialization cannot express fixed S6/420/444/Alpha100 semantics, so
  // an unverified native AVIF encoder never silently substitutes for this preset.
  result.avif = { supported: allowsAvifOutput(limits) && typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined', reason: 'avifDevice' };
  return result;
}
