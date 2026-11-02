import { acceptImage, decodeChecked } from '../image/browser-codec';
import { checkDimensions, type ImageSource } from '../image/types';
import type { ImageLimits } from '../image/limits';
import type { ImageResources } from '../image/resources';
import { sanitizeSvg, svgLimits } from './svg';

export type SvgWatermark = Readonly<{kind: 'svg'; file: File; blob: Blob; width: number; height: number}>;
export type WatermarkSource = ImageSource | SvgWatermark;
export type DecodedWatermark = {image: CanvasImageSource; width: number; height: number; close: () => void};
export async function acceptWatermark(file: File, resources: ImageResources, limits: ImageLimits): Promise<WatermarkSource> {
  if (file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name)) return acceptImage(file, resources, limits);
  if (!file.size || file.size > Math.min(svgLimits.bytes, limits.bytes)) throw new Error('svg');
  const {xml, width, height} = sanitizeSvg(await file.text(), limits);
  return {kind: 'svg', file, blob: new Blob([xml], {type: 'image/svg+xml'}), width, height};
}
export async function decodeWatermark(source: WatermarkSource, resources: ImageResources, limits: ImageLimits): Promise<DecodedWatermark> {
  if (!('kind' in source)) {
    const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
    return {image: bitmap, width: bitmap.width, height: bitmap.height, close: () => resources.close(bitmap)};
  }
  checkDimensions(source.width, source.height, limits);
  // Chromium's Blob→ImageBitmap path does not reliably accept SVG. A detached
  // image may load only the reconstructed, reference-checked local document.
  const image = new Image(), url = resources.url(source.blob);
  const close = () => { image.removeAttribute('src'); resources.revoke(url); };
  try {
    image.src = url; await image.decode();
    if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) throw new Error('watermark');
    return {image, width: source.width, height: source.height, close};
  } catch (error) { close(); throw error; }
}
