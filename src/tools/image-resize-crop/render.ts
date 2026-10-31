import {
  acceptImage,
  decodeChecked,
  toBlob,
  validateOutput,
} from '../image/browser-codec';
import {
  checkDimensions,
  ImageFailure,
  mime,
  type ImageSource,
  type NativeImageFormat,
} from '../image/types';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';
import { assertCrop, type CropRect, type Size } from './geometry';

export type Output = Size &
  Readonly<{ format: NativeImageFormat; quality: number; background: string }>;
export async function loadSource(
  file: File,
  resources: ImageResources,
  limits: ImageLimits,
) {
  const source = await acceptImage(file, resources, limits);
  return { source, preview: await previewSource(source, resources, limits) };
}
export async function previewSource(
  source: ImageSource,
  resources: ImageResources,
  limits: ImageLimits,
) {
  const bitmap = await decodeChecked(
    source.blob,
    source.info,
    resources,
    limits,
  );
  let canvas: HTMLCanvasElement | undefined;
  try {
    // Import-only bounded, oriented preview. No full-size encoding on pointer moves.
    const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
    canvas = resources.canvas(
      Math.max(1, Math.round(source.width * scale)),
      Math.max(1, Math.round(source.height * scale)),
    );
    const context = canvas.getContext('2d');
    if (!context) throw new ImageFailure('decode');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await toBlob(canvas, mime.png);
  } finally {
    resources.close(bitmap);
    if (canvas) resources.release(canvas);
  }
}
export async function renderCrop(
  source: ImageSource,
  crop: CropRect,
  output: Output,
  resources: ImageResources,
  limits: ImageLimits,
) {
  assertCrop(crop, source);
  checkDimensions(output.width, output.height, limits);
  if (
    !['png', 'jpeg', 'webp'].includes(output.format) ||
    !Number.isInteger(output.quality) ||
    output.quality < 1 ||
    output.quality > 100 ||
    !/^#[0-9a-f]{6}$/i.test(output.background)
  )
    throw new ImageFailure('encode');
  // Rounding can approximate either a source crop edge (unlocked dimensions)
  // or an output edge (locked dimensions/percentage, including tiny thumbnails).
  if (
    output.height !== Math.round((output.width * crop.height) / crop.width) &&
    output.width !== Math.round((output.height * crop.width) / crop.height) &&
    Math.abs(crop.width - (crop.height * output.width) / output.height) > 1 &&
    Math.abs(crop.height - (crop.width * output.height) / output.width) > 1
  )
    throw new ImageFailure('dimensions');
  const bitmap = await decodeChecked(
    source.blob,
    source.info,
    resources,
    limits,
  );
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = resources.canvas(output.width, output.height);
    const context = canvas.getContext('2d');
    if (!context) throw new ImageFailure('encode');
    if (output.format === 'jpeg') {
      context.fillStyle = output.background;
      context.fillRect(0, 0, output.width, output.height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      output.width,
      output.height,
    );
    // Canvas owns the pixels now; close the decode before serialization.
  } catch (error) {
    if (canvas) resources.release(canvas);
    throw error;
  } finally {
    resources.close(bitmap);
  }
  try {
    const blob = await toBlob(
      canvas!,
      mime[output.format],
      output.format === 'png' ? undefined : output.quality / 100,
    );
    resources.release(canvas!);
    canvas = undefined;
    // privacy-v1 cleanup + actual header/MIME/size + full oriented re-decode.
    return await validateOutput(
      blob,
      output.format,
      output.width,
      output.height,
      resources,
      limits,
    );
  } finally {
    if (canvas) resources.release(canvas);
  }
}
