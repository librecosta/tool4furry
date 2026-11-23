import type { QrMatrixData } from '../../tools/qr-code-generator/matrix/qr-matrix';
import type { QrErrorCorrectionLevel } from '../../tools/qr-code-generator/recipe/types';

export const methods = ['blend', 'halftone', 'hybrid'] as const;
export const dithers = ['none', 'ordered', 'floyd'] as const;
export const outputSizes = [128, 256, 384, 512, 592, 768, 1024, 1536, 2048] as const;
export type Method = (typeof methods)[number];
export type Parameters = {
  content: string;
  anchor: number;
  strength: number;
  contrast: number;
  dither: (typeof dithers)[number];
  adaptive: boolean;
  ecc: QrErrorCorrectionLevel;
  size: number;
};

export const defaultParameters: Parameters = {
  content: 'https://example.com', anchor: 72, strength: 100, contrast: 100,
  dither: 'floyd', adaptive: false, ecc: 'H', size: 592,
};

export const limits = {
  fileBytes: 20 * 1024 ** 2, imagePixels: 40_000_000, contentLength: 2000,
  anchor: [25, 100], strength: [0, 100], contrast: [0, 100],
} as const;

export type Raster = { size: number; data: Uint8ClampedArray<ArrayBuffer> };
export type Layout = { size: number; modulePx: number; symbolPx: number; start: number; sub: number };
export function makeLayout(size: number, matrix: QrMatrixData): Layout {
  const total = matrix.size + matrix.quietZoneModules * 2;
  const modulePx = Math.floor(size / total);
  if (modulePx < 2) throw new FusionError('density');
  return {
    size, modulePx, symbolPx: modulePx * matrix.size, sub: Math.min(4, modulePx),
    start: Math.floor((size - total * modulePx) / 2) + matrix.quietZoneModules * modulePx,
  };
}

export type Issue = 'fileType' | 'fileSize' | 'imageSize' | 'image' | 'content' | 'capacity' | 'density' | 'browser' | 'processing';
export class FusionError extends Error {
  constructor(readonly issue: Issue) { super(issue); }
}

const luma = (r: number, g: number, b: number) => (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function getLuminance(raster: Raster) {
  return Float32Array.from({ length: raster.size ** 2 }, (_, i) => {
    const p = i * 4;
    return luma(raster.data[p], raster.data[p + 1], raster.data[p + 2]);
  });
}

export function quantize(luminance: Float32Array, width: number, mode: Parameters['dither']) {
  const levels = mode === 'floyd' ? luminance.slice() : luminance;
  const bits = new Uint8Array(levels.length);
  for (let i = 0; i < levels.length; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const threshold = mode === 'ordered' ? (bayer[(y % 4) * 4 + x % 4] + 0.5) / 16 : 0.5;
    const bit = bits[i] = levels[i] >= threshold ? 1 : 0;
    if (mode !== 'floyd') continue;
    const error = (levels[i] - bit) / 16;
    if (x + 1 < width) levels[i + 1] += 7 * error;
    if (i + width >= levels.length) continue;
    if (x > 0) levels[i + width - 1] += 3 * error;
    levels[i + width] += 5 * error;
    if (x + 1 < width) levels[i + width + 1] += error;
  }
  return bits;
}

const baseTargets = { blend: [0.18, 0.85], halftone: [0.08, 0.96], hybrid: [0.06, 0.95] } as const;

function localTargets(grid: Float32Array, width: number, sub: number, options: Parameters, method: Method) {
  const [dark, light] = baseTargets[method];
  const scale = 0.65 + 0.35 * options.contrast / 100;
  const core = width / sub;
  const targets = new Float32Array(core ** 2 * 2);
  for (let row = 0; row < core; row++) {
    for (let col = 0; col < core; col++) {
      let midpoint = 0.5, edgeBoost = 0;
      if (options.adaptive) {
        let sum = 0, min = 1, max = 0;
        for (let dy = 0; dy < sub; dy++) for (let dx = 0; dx < sub; dx++) {
          const value = grid[(row * sub + dy) * width + col * sub + dx];
          sum += value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
        // Nudge the midpoint toward the tile's average and widen the gap on mixed-tone tiles.
        midpoint += (sum / (sub ** 2) - 0.5) * 0.28;
        edgeBoost = (max - min) * 0.12;
      }
      const i = (row * core + col) * 2;
      targets[i] = Math.max(0.02, Math.min(0.32, midpoint - (0.5 - dark) * scale - edgeBoost));
      targets[i + 1] = Math.min(0.98, Math.max(0.68, midpoint + (light - 0.5) * scale + edgeBoost));
    }
  }
  return targets;
}

export function prepareTones(tiny: Raster, options: Parameters) {
  const luminance = getLuminance(tiny);
  return { ...tiny, luminance, bits: quantize(luminance, tiny.size, options.dither) };
}

export function renderFusion(source: Raster, tones: ReturnType<typeof prepareTones>, matrix: QrMatrixData,
  layout: Layout, options: Parameters, method: Method) {
  const { size, symbolPx, start, modulePx, sub } = layout;
  const data = new Uint8ClampedArray(size ** 2 * 4).fill(255);
  const targets = localTargets(tones.luminance, tones.size, sub, options, method);
  const anchor = options.anchor / 100;
  const strength = options.strength / 100;
  const distance = Float32Array.from({ length: modulePx }, (_, i) => Math.abs((i + 0.5) / modulePx * 2 - 1));
  const subcell = Uint8Array.from({ length: modulePx }, (_, i) => Math.floor((i + 0.5) * sub / modulePx));
  let absoluteError = 0;
  for (let y = 0; y < symbolPx; y++) {
    const row = Math.floor(y / modulePx);
    const dy = y % modulePx;
    for (let x = 0; x < symbolPx; x++) {
      const col = Math.floor(x / modulePx);
      const dx = x % modulePx;
      const module = row * matrix.size + col;
      const dark = matrix.cells[module] === 1;
      const pixel = ((y + start) * size + x + start) * 4;
      const original = (y * symbolPx + x) * 4;
      if (matrix.functionalMask[module]) {
        data[pixel] = dark ? 15 : 255;
        data[pixel + 1] = dark ? 23 : 255;
        data[pixel + 2] = dark ? 28 : 255;
      } else {
        const tone = (row * sub + subcell[dy]) * tones.size + col * sub + subcell[dx];
        const radius = Math.max(distance[dx], distance[dy]);
        const soft = clamp((anchor + 0.14 - radius) / 0.18);
        const weight = strength * (method === 'blend' ? 1 : method === 'halftone' ? Number(radius <= anchor) : soft * soft * (3 - 2 * soft));
        const ySrc = luma(source.data[original], source.data[original + 1], source.data[original + 2]);
        const threshold = targets[module * 2 + Number(!dark)];
        const amount = dark
          ? -Math.max(0, ySrc - threshold) / Math.max(ySrc, 0.0001)
          : Math.max(0, threshold - ySrc) / Math.max(1 - ySrc, 0.0001);
        for (let c = 0; c < 3; c++) {
          const value = source.data[original + c];
          const target = value + amount * (dark ? value : 255 - value);
          let art = value;
          if (method === 'halftone') {
            const ink = tones.data[tone * 4 + c];
            art = tones.bits[tone] ? ink * 0.13 + 222 : ink * 0.37;
          } else if (method === 'hybrid' && options.dither !== 'none') {
            art = Math.max(0, Math.min(255, value + (tones.bits[tone] ? 9.56 : -9.56)));
          }
          data[pixel + c] = art + (target - art) * weight;
        }
      }
      absoluteError += Math.abs(data[pixel] - source.data[original]) +
        Math.abs(data[pixel + 1] - source.data[original + 1]) + Math.abs(data[pixel + 2] - source.data[original + 2]);
    }
  }
  return { size, data, mae: absoluteError / (symbolPx ** 2 * 3) };
}
