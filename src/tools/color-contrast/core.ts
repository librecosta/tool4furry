import { fail } from '../general/bounds';
export type RGB = [number, number, number];
type HSL = [hue: number, saturation: number, lightness: number];
const numeric = /^([+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?)(%|deg|grad|rad|turn)?$/i;
const hueCycles = { '': 360, deg: 360, grad: 400, rad: 2 * Math.PI, turn: 1 } as const;
const wrap = (value: number, cycle: number) => ((value % cycle) + cycle) % cycle;

function hslToRgb([h, s, l]: HSL): RGB {
  const hue = h / 60;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(hue % 2 - 1));
  const base = l - chroma / 2;
  const channels = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
    [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ][Math.floor(hue)];
  return channels.map(channel => Math.round((channel + base) * 255)) as RGB;
}

function parseComponent(token: string) {
  const match = token.match(numeric);
  if (!match || !Number.isFinite(Number(match[1]))) return undefined;
  return { value: Number(match[1]), unit: (match[2] ?? '').toLowerCase() };
}

function parseFunction(text: string): RGB | undefined {
  const call = text.match(/^(rgb|hsl)\(([\s\S]*)\)$/i);
  if (!call) return;
  const legacy = call[2].includes(',');
  const tokens = legacy ? call[2].split(',').map(token => token.trim()) : call[2].trim().split(/\s+/);
  if (tokens.length !== 3) return;
  const [first, second, third] = tokens.map(parseComponent);
  if (!first || !second || !third) return;
  if (call[1].toLowerCase() === 'rgb') {
    if (legacy && (first.unit !== second.unit || first.unit !== third.unit)) return;
    const components = [first, second, third];
    if (!components.every(({ value, unit }) =>
      (unit === '' || unit === '%') && value >= 0 && value <= (unit === '%' ? 100 : 255))) return;
    return components.map(({ value, unit }) => Math.round(unit === '%' ? value / 100 * 255 : value)) as RGB;
  }
  if (!Object.hasOwn(hueCycles, first.unit) || second.unit !== '%' || third.unit !== '%' ||
      second.value < 0 || second.value > 100 || third.value < 0 || third.value > 100) return;
  const cycle = hueCycles[first.unit as keyof typeof hueCycles];
  return hslToRgb([wrap(wrap(first.value, cycle) / cycle * 360, 360), second.value / 100, third.value / 100]);
}

export function parseColor(value: string): RGB {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((at) => parseInt(h.slice(at, at + 2), 16)) as RGB;
  }
  const rgb = parseFunction(value.trim());
  if (rgb) return rgb;
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
function rgbToHsl(rgb: RGB): HSL {
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
  return [h, s, l];
}
export function colorValues(rgb: RGB) {
  const [h, s, l] = rgbToHsl(rgb);
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

export const contrastTargets = [3, 4.5, 7] as const;
export type ContrastTarget = typeof contrastTargets[number];
export type ContrastSuggestion = { hex: string; ratio: number };

export function suggestContrast(color: RGB, fixed: RGB, target: ContrastTarget): ContrastSuggestion | undefined {
  if (contrast(color, fixed) >= target) return;
  const [hue, saturation, lightness] = rgbToHsl(color);
  const fixedLuminance = luminance(fixed);
  const candidateAt = (light: number) => {
    const rgb = hslToRgb([hue, saturation, light]);
    const value = luminance(rgb);
    return { rgb, ratio: (Math.max(value, fixedLuminance) + 0.05) / (Math.min(value, fixedLuminance) + 0.05) };
  };
  let nearest: (ContrastSuggestion & { distance: number }) | undefined;
  for (const end of [0, 1]) {
    let passing = end;
    let failing = lightness;
    let candidate = candidateAt(passing);
    if (candidate.ratio < target) continue;
    // RGB channels and luminance are monotonic along this fixed hue and saturation.
    // Starting from a failing color leaves one threshold crossing in either direction.
    for (let step = 0; step < 24; step++) {
      const midpoint = (passing + failing) / 2;
      const sample = candidateAt(midpoint);
      if (sample.ratio >= target) {
        passing = midpoint;
        candidate = sample;
      } else {
        failing = midpoint;
      }
    }
    const distance = Math.abs(passing - lightness);
    if (!nearest || distance < nearest.distance)
      nearest = { hex: toHex(candidate.rgb), ratio: candidate.ratio, distance };
  }
  if (nearest) return { hex: nearest.hex, ratio: nearest.ratio };
}
