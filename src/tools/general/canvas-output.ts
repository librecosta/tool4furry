import { toBlob, validateOutput } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { mobileImageLimits } from '../image/limits';
import { fail } from './bounds';
export const canvasLimits = { ...mobileImageLimits, pixels: 8_000_000 };
export function canvasSize(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > canvasLimits.pixels
  )
    fail(
      '输出须为正整数、最长 8192px、最多 800 万像素。',
      'Output must use positive integers, at most 8,192px per side and eight million pixels.',
    );
  return { width, height };
}
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.9,
) {
  canvasSize(canvas.width, canvas.height);
  const blob = await toBlob(
    canvas,
    format === 'png' ? 'image/png' : 'image/jpeg',
    quality,
  );
  if (blob.size > 32 * 1024 ** 2)
    fail('单张输出超过 32 MiB。', 'Image output exceeds 32 MiB.');
  return validateOutput(
    blob,
    format,
    canvas.width,
    canvas.height,
    new ImageResources(),
    canvasLimits,
  );
}
