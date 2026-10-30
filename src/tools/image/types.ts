import { mobileImageLimits, type ImageLimits } from './limits';
import type { metadataPolicy } from './metadata';
export const nativeFormats = ['webp', 'jpeg', 'png'] as const;
export type NativeImageFormat = (typeof nativeFormats)[number];
export const formats = [...nativeFormats, 'avif'] as const;
export type ImageOutputFormat = (typeof formats)[number];
export type ImageInputFormat = NativeImageFormat | 'avif';
// Compatibility alias for existing output controls; input metadata uses its own type.
export type ImageFormat = ImageOutputFormat;
export const mime = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
} as const;
export const extension = { png: 'png', jpeg: 'jpg', webp: 'webp', avif: 'avif' } as const;
// Conservative default for isolated callers; Converter passes its fixed workspace limits.
export const imageBudget = mobileImageLimits;
export type ImageErrorCode =
  | 'empty'
  | 'bytes'
  | 'dimensions'
  | 'unsupported'
  | 'corrupt'
  | 'animated'
  | 'decode'
  | 'encode'
  | 'output'
  | 'metadata'
  | 'orientation'
  | 'avifVariant'
  | 'avifBudget'
  | 'avifDevice'
  | 'avifLoad'
  | 'avifTimeout'
  | 'timeout'
  | 'cancelled';
export class ImageFailure extends Error {
  constructor(
    public code: ImageErrorCode,
    public detail = '',
  ) {
    super(code);
  }
}
export const failureCode = (error: unknown): ImageErrorCode =>
  error instanceof ImageFailure ? error.code : 'decode';
export type ImageInfo = Readonly<{
  format: ImageInputFormat;
  width: number;
  height: number;
  orientation: number;
}>;
export type ImageSource = Readonly<{
  file: File;
  info: ImageInfo;
  width: number;
  height: number;
  blob: Blob;
}>;
export type ImageResult = Readonly<{
  kind: 'encoded' | 'passthrough' | 'cleaned';
  metadataPolicy: typeof metadataPolicy;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  suggestedFilename: string;
}>;
export function checkDimensions(
  width: number,
  height: number,
  limits: ImageLimits = imageBudget,
) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new ImageFailure('corrupt');
  if (
    width > limits.edge ||
    height > limits.edge ||
    width * height > limits.pixels
  )
    throw new ImageFailure('dimensions', `${width}×${height}`);
}
