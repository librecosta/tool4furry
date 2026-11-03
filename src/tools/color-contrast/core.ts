import { fail } from '../general/bounds';
export type RGB = [number, number, number];
const byte = (n: number) => Math.round(n);
export function parseColor(value: string): RGB {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((at) => parseInt(h.slice(at, at + 2), 16)) as RGB;
  }
  const rgb = value
    .trim()
    .match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    const a = rgb.slice(1).map(Number);
    if (a.every((n) => n <= 255)) return a as RGB;
  }
  const hsl = value
    .trim()
    .match(
      /^hsl\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i,
    );
  if (hsl) {
    const [h, s, l] = hsl.slice(1).map(Number);
    if (Number.isFinite(h) && s <= 100 && l <= 100) {
      const hue = (((h % 360) + 360) % 360) / 60,
        chroma = ((1 - Math.abs((2 * l) / 100 - 1)) * s) / 100,
        x = chroma * (1 - Math.abs((hue % 2) - 1)),
        m = l / 100 - chroma / 2;
      const c = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x],
      ][Math.floor(hue)];
      return c.map((n) => byte((n + m) * 255)) as RGB;
    }
  }
  fail(
    '请输入不透明的 HEX、rgb(r,g,b) 或 hsl(h,s%,l%) 颜色。',
    'Enter an opaque HEX, rgb(r,g,b) or hsl(h,s%,l%) color.',
  );
}
export const toHex = (rgb: RGB) =>
  '#' +
  rgb
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
export function colorValues(rgb: RGB) {
  const [r, g, b] = rgb.map((n) => n / 255),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h =
      (max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4) * 60;
    if (h < 0) h += 360;
  }
  return {
    hex: toHex(rgb),
    rgb: `rgb(${rgb.join(', ')})`,
    hsl: `hsl(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`,
  };
}
export function luminance(rgb: RGB) {
  return rgb
    .map((n) => {
      const c = n / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contrast(a: RGB, b: RGB) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
