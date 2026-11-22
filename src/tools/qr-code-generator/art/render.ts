import type { QrMatrixData } from '../matrix/qr-matrix';
import type { QrRecipeV1 } from '../recipe/types';
import { aeolianFrame, windPhase } from './aeolian';
import { contourFrame, elevation } from './contour';
import { bedding, strataFrame } from './strata';

export type QrColors = { dark: string; light: string };
export type QrRenderMode =
  | { kind: 'artistic'; recipe: Pick<QrRecipeV1, 'content' | 'artwork'> }
  | { kind: 'standard'; colors?: QrColors };

export type QrArtwork = {
  svg: string;
  size: number;
  modulePixels: number;
  matrixStart: number;
  quietZoneStart: number;
};

export const qrMinPixels = 128;
export const qrMaxPixels = 2048;
export const artisticModulePixels = 4;
export const standardModulePixels = 2;
const standardColors = { dark: '#000000', light: '#ffffff' };
const frameFraction = 0.68;

export class QrDensityError extends Error {
  constructor(readonly minimum: number) {
    super('QR modules need a larger output size');
    this.name = 'QrDensityError';
  }
}

type ArtStyle = {
  dark: string;
  light: string;
  tints: string[];
  band: (x: number, y: number, seed: number) => number;
  frame: (seed: number) => string;
};

export const artStyles = {
  aeolian: {
    dark: '#453526',
    light: '#F7EBDD',
    tints: ['#533d29', '#624a32', '#6b5137', '#57402d'],
    band: (x, y, seed) => Math.floor(8 * (1 + Math.sin(10 * windPhase(x, y, seed)))) % 4,
    frame: aeolianFrame,
  },
  contour: {
    dark: '#244639',
    light: '#F2F5E9',
    tints: ['#254538', '#355548', '#42614e', '#4e674f'],
    band: (x, y, seed) => Math.max(0, Math.min(3, Math.floor(4 * elevation(x, y, seed)))),
    frame: contourFrame,
  },
  strata: {
    dark: '#422D2E',
    light: '#F9F0E8',
    tints: ['#543938', '#694641', '#4d3436', '#6b4f49'],
    band: (x, y, seed) => Math.floor(12 * bedding(x, y, seed) + 24) % 4,
    frame: strataFrame,
  },
} satisfies Record<QrRecipeV1['artwork']['id'], ArtStyle>;

function artPhase({ content, artwork }: Pick<QrRecipeV1, 'content' | 'artwork'>) {
  const bytes = new TextEncoder().encode(`t4f-qr-art\0${artwork.id}\0${artwork.revision}\0${content}`);
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
  return (hash >>> 0) / 0x100000000 * 12;
}

const square = (x: number, width: number, fill: string) =>
  `<rect x="${x}" y="${x}" width="${width}" height="${width}" fill="${fill}"/>`;

/** Render one pixel-aligned source for preview, SVG delivery, and PNG rasterization. */
export function renderQrSvg(matrix: QrMatrixData, size: number, mode: QrRenderMode): QrArtwork {
  if (!Number.isInteger(size) || size < qrMinPixels || size > qrMaxPixels) throw new RangeError('QR output size');
  const edge = matrix.size + 2 * matrix.quietZoneModules;
  const style = mode.kind === 'artistic' ? artStyles[mode.recipe.artwork.id] : undefined;
  const fraction = style ? frameFraction : 1;
  const minimum = Math.ceil(edge * (style ? artisticModulePixels : standardModulePixels) / fraction);
  if (size < minimum) throw new QrDensityError(minimum);
  const modulePixels = Math.floor(size * fraction / edge);
  const quietWidth = edge * modulePixels;
  const quietZoneStart = Math.floor((size - quietWidth) / 2);
  const matrixStart = quietZoneStart + matrix.quietZoneModules * modulePixels;
  const colors = style ?? (mode.kind === 'standard' ? mode.colors ?? standardColors : standardColors);
  if (![colors.dark, colors.light].every(color => /^#[\da-f]{6}$/i.test(color))) throw new Error('Invalid QR colors');
  const phase = mode.kind === 'artistic' ? artPhase(mode.recipe) : 0;
  const palette = [colors.dark, ...(style?.tints ?? [])];
  const paths = palette.map(() => '');

  for (let y = 0; y < matrix.size; y++) {
    const band = (x: number) => {
      const index = y * matrix.size + x;
      if (!matrix.cells[index]) return -1;
      return style && !matrix.functionalMask[index]
        ? 1 + style.band((x + 0.5) / matrix.size, (y + 0.5) / matrix.size, phase) : 0;
    };
    let x = 0;
    while (x < matrix.size) {
      const color = band(x);
      const from = x++;
      while (x < matrix.size && band(x) === color) x++;
      if (color < 0) continue;
      const left = matrixStart + from * modulePixels;
      const top = matrixStart + y * modulePixels;
      const width = (x - from) * modulePixels;
      paths[color] += `M${left} ${top}h${width}v${modulePixels}h-${width}z`;
    }
  }

  const frame = style
    ? `<svg width="${size}" height="${size}" viewBox="0 0 1000 1000" overflow="hidden">${style.frame(phase)}</svg>`
    : square(0, size, colors.light);
  // Draw an opaque guard one module beyond the four-module quiet zone over the frame.
  const guard = style ? square(quietZoneStart - modulePixels, quietWidth + 2 * modulePixels, colors.light) : '';
  const modules = paths.map((d, i) => d ? `<path fill="${palette[i]}" d="${d}"/>` : '').join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${frame}<g shape-rendering="crispEdges">${guard}${square(quietZoneStart, quietWidth, colors.light)}${modules}</g></svg>`;
  return { svg, size, modulePixels, matrixStart, quietZoneStart };
}
