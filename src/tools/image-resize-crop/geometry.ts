import { checkDimensions, ImageFailure } from '../image/types';
import type { ImageLimits } from '../image/limits';

export type Size = Readonly<{ width: number; height: number }>;
// All persisted geometry is integer, oriented SOURCE pixels, never CSS pixels.
export type CropRect = Size & Readonly<{ x: number; y: number }>;
export const aspects = {
  free: undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
} as const;
export type Aspect = keyof typeof aspects;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const finite = (values: readonly number[]) => {
  if (values.some((n) => !Number.isFinite(n)))
    throw new ImageFailure('dimensions');
};
export const fullCrop = (size: Size): CropRect => ({
  x: 0,
  y: 0,
  width: size.width,
  height: size.height,
});

// One rounding policy: nearest pixel (halves up), then constrain within source.
export function constrainCrop(rect: CropRect, size: Size): CropRect {
  finite([rect.x, rect.y, rect.width, rect.height, size.width, size.height]);
  if (rect.width <= 0 || rect.height <= 0 || size.width < 1 || size.height < 1)
    throw new ImageFailure('dimensions');
  const width = clamp(Math.round(rect.width), 1, size.width);
  const height = clamp(Math.round(rect.height), 1, size.height);
  return {
    x: clamp(Math.round(rect.x), 0, size.width - width),
    y: clamp(Math.round(rect.y), 0, size.height - height),
    width,
    height,
  };
}
export function assertCrop(rect: CropRect, size: Size) {
  const valid = constrainCrop(rect, size);
  if (
    Object.keys(valid).some(
      (key) => valid[key as keyof CropRect] !== rect[key as keyof CropRect],
    )
  )
    throw new ImageFailure('dimensions');
}
export function fitAspect(rect: CropRect, ratio: number, size: Size): CropRect {
  finite([ratio]);
  // A ratio that needs a subpixel edge cannot be represented by this contract.
  if (ratio <= 0 || ratio > size.width || ratio < 1 / size.height)
    throw new ImageFailure('dimensions');
  const current = constrainCrop(rect, size);
  // Preserve area where possible. Repeated ratio switches must not repeatedly
  // shrink the selection to the intersection of all previous aspect boxes.
  const proposedWidth = Math.sqrt(current.width * current.height * ratio);
  const proposedHeight = proposedWidth / ratio;
  const scale = Math.min(
    1,
    size.width / proposedWidth,
    size.height / proposedHeight,
  );
  const width = Math.max(1, Math.round(proposedWidth * scale));
  const height = Math.max(1, Math.round(proposedHeight * scale));
  return constrainCrop(
    {
      // Anchor the center to a stable half-pixel lattice. Re-rounding a center
      // after every odd/even edge change would accumulate +0.5px translations.
      x: Math.floor(current.x + current.width / 2) - Math.floor(width / 2),
      y: Math.floor(current.y + current.height / 2) - Math.floor(height / 2),
      width,
      height,
    },
    size,
  );
}
export function toPercent(rect: CropRect, size: Size) {
  return {
    unit: '%' as const,
    x: (100 * rect.x) / size.width,
    y: (100 * rect.y) / size.height,
    width: (100 * rect.width) / size.width,
    height: (100 * rect.height) / size.height,
  };
}
export function fromPercent(rect: CropRect, size: Size): CropRect {
  return constrainCrop(
    {
      x: (rect.x * size.width) / 100,
      y: (rect.y * size.height) / 100,
      width: (rect.width * size.width) / 100,
      height: (rect.height * size.height) / 100,
    },
    size,
  );
}
export function outputForCrop(
  rect: CropRect,
  customWidth: number | undefined,
  limits: ImageLimits,
): Size {
  const width = customWidth ?? rect.width;
  const height =
    customWidth === undefined
      ? rect.height
      : Math.round((width * rect.height) / rect.width);
  checkDimensions(width, height, limits);
  return { width, height };
}
export function parseDimension(value: string) {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    throw new ImageFailure('dimensions');
  return Number(value);
}
export function scaleCrop(
  rect: CropRect,
  value: string,
  limits: ImageLimits,
): Size {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new ImageFailure('dimensions');
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0)
    throw new ImageFailure('dimensions');
  const width = Math.round((rect.width * percent) / 100),
    height = Math.round((rect.height * percent) / 100);
  checkDimensions(width, height, limits);
  return { width, height };
}
