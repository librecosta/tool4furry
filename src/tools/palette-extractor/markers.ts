import { rgb, type Swatch } from './palette';

/** Cached once per oriented preview. Ignore invisible RGB and favor solid pixels,
 * with a translucent-only fallback. Never retain another RGBA buffer. */
export function markerPixels({ data, width, height }: ImageData): number[] {
  let maximum = 0, solid = 0;
  for (let i = 3; i < data.length; i += 4) {
    maximum = Math.max(maximum, data[i]);
    if (data[i] >= 192) solid++;
  }
  if (!maximum) return [];
  const threshold = solid ? 192 : Math.max(1, Math.min(96, maximum));
  let count = solid;
  if (!count) for (let i = 3; i < data.length; i += 4) if (data[i] >= threshold) count++;
  const stride = Math.max(1, Math.ceil(count / 65536)), samples: number[] = [];
  let seen = 0;
  for (let i = 0; i < width * height; i++) if (data[i * 4 + 3] >= threshold && seen++ % stride === 0) samples.push(i);
  return samples;
}

/** Bounded location search per extraction, never per render/pointer move. Locations
 * are real preview pixels; this does not alter the quantized palette. */
export function locateColors(pixels: ImageData, colors: readonly Swatch[], samples = markerPixels(pixels)): Swatch[] {
  const { width, height, data } = pixels;
  const result: Swatch[] = [];
  for (const color of colors) {
    const [r, g, b] = rgb(color.hex);
    let best = Infinity, point: Swatch['point'];
    for (const index of samples) {
      const offset = index * 4;
      const x = index % width, y = Math.floor(index / width);
      const difference = (data[offset] - r) ** 2 + (data[offset + 1] - g) ** 2 + (data[offset + 2] - b) ** 2;
      // Small tie-breakers favor the interior and separate nearly equal matches.
      const center = ((x - width / 2) / width) ** 2 + ((y - height / 2) / height) ** 2;
      const overlap = result.some(other => other.point && Math.hypot((x - other.point.x) / width, (y - other.point.y) / height) < 0.055) ? 4 : 0;
      const score = difference + center + overlap;
      if (score < best) { best = score; point = { x, y }; }
    }
    result.push({ ...color, point });
  }
  return result;
}
