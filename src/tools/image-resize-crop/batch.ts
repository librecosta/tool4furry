import { checkDimensions, ImageFailure } from '../image/types';
import type { ImageLimits } from '../image/limits';
import { parseDimension, type Size } from './geometry';
import type { Output } from './render';

export type BatchRule = 'width' | 'height' | 'longest' | 'percent';
export type BatchSettings = Readonly<{
  rule: BatchRule;
  value: string;
  noUpscale: boolean;
}> &
  Pick<Output, 'format' | 'quality' | 'background'>;
export const initialBatch = (): BatchSettings => ({
  rule: 'longest',
  value: '1200',
  noUpscale: true,
  format: 'png',
  quality: 85,
  background: '#FFFFFF',
});
export function ruleValue(settings: BatchSettings, limits: ImageLimits) {
  if (!['width', 'height', 'longest', 'percent'].includes(settings.rule))
    throw new ImageFailure('dimensions');
  if (settings.rule !== 'percent') {
    const value = parseDimension(settings.value);
    if (value > limits.edge) throw new ImageFailure('dimensions');
    return value;
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(settings.value))
    throw new ImageFailure('dimensions');
  const value = Number(settings.value);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000)
    throw new ImageFailure('dimensions');
  return value;
}
/** Oriented original dimensions only; never a single-edit crop. */
export function batchSize(
  source: Size,
  settings: BatchSettings,
  limits: ImageLimits,
): Size {
  checkDimensions(source.width, source.height, limits);
  const value = ruleValue(settings, limits);
  let scale =
    settings.rule === 'percent'
      ? value / 100
      : value /
        (settings.rule === 'width'
          ? source.width
          : settings.rule === 'height'
            ? source.height
            : Math.max(source.width, source.height));
  if (settings.noUpscale) scale = Math.min(1, scale);
  const size = {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
  checkDimensions(size.width, size.height, limits);
  return size;
}
