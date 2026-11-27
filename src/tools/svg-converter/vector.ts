export type Fit = 'curves' | 'polygon';
export type Preset = 'logo' | 'illustration' | 'photo' | 'line' | 'pixel';
export interface TraceSettings {
  preset: Preset;
  color: 'color' | 'mono';
  colors: number;
  detail: number;
  smooth: number;
  threshold: number;
  fit: Fit;
}
export const tracePresets: Record<Preset, TraceSettings> = {
  logo: { preset: 'logo', color: 'color', colors: 6, detail: 70, smooth: 24, threshold: 128, fit: 'polygon' },
  illustration: { preset: 'illustration', color: 'color', colors: 12, detail: 76, smooth: 52, threshold: 128, fit: 'curves' },
  photo: { preset: 'photo', color: 'color', colors: 20, detail: 50, smooth: 62, threshold: 128, fit: 'curves' },
  line: { preset: 'line', color: 'mono', colors: 2, detail: 95, smooth: 34, threshold: 146, fit: 'curves' },
  pixel: { preset: 'pixel', color: 'color', colors: 256, detail: 100, smooth: 0, threshold: 128, fit: 'polygon' },
};
export const tracePixels = 4_000_000;
export const traceEdge = 4096;
export const geometryBudget = 1_800_000;
export const maxRegions = 12_000;
export interface RasterPixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface VectorResult {
  xml: string;
  width: number;
  height: number;
  count: number;
  elapsed: number;
}

export function tracingSize(width: number, height: number, preset: Preset) {
  const scale = Math.min(1, Math.sqrt(tracePixels / (width * height)), traceEdge / Math.max(width, height));
  if (scale < 1 && preset === 'pixel') return undefined;
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

export function vectorDocument(width: number, height: number, contents: string, crisp = false) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
    '" viewBox="0 0 ' + width + ' ' + height + '"' + (crisp ? ' shape-rendering="crispEdges"' : '') + '>\n' + contents + '\n</svg>';
}

interface Rectangle { x: number; y: number; width: number; height: number; color: number }

export function mergePixelRegions({ width, height, data }: RasterPixels) {
  const rectangles: Rectangle[] = [];
  let previous = new Map<string, Rectangle>();
  for (let y = 0; y < height; y++) {
    const row = new Map<string, Rectangle>();
    for (let x = 0; x < width;) {
      let index = (y * width + x) * 4;
      const color = ((data[index] << 24) | (data[index + 1] << 16) | (data[index + 2] << 8) | data[index + 3]) >>> 0;
      let end = x + 1;
      for (; end < width; end++) {
        index += 4;
        const next = ((data[index] << 24) | (data[index + 1] << 16) | (data[index + 2] << 8) | data[index + 3]) >>> 0;
        if (next !== color) break;
      }
      if ((color & 255) !== 0) {
        const key = x + '/' + end + '/' + color;
        let rect = previous.get(key);
        if (rect) {
          rect.height++;
        } else {
          if (rectangles.length >= maxRegions) throw new Error('geometry-budget');
          rect = { x, y, width: end - x, height: 1, color };
          rectangles.push(rect);
        }
        row.set(key, rect);
      }
      x = end;
    }
    previous = row;
  }
  return rectangles;
}

export function tracePixelArt(source: RasterPixels) {
  const groups = new Map<number, string[]>();
  const rectangles = mergePixelRegions(source);
  for (const rect of rectangles) {
    const parts = groups.get(rect.color) ?? [];
    parts.push('M' + rect.x + ' ' + rect.y + 'h' + rect.width + 'v' + rect.height + 'h-' + rect.width + 'z');
    groups.set(rect.color, parts);
  }
  const contents = [...groups].map(([color, parts]) => {
    const alpha = color & 255;
    return '<path fill="#' + (color >>> 8).toString(16).padStart(6, '0') + '"' +
      (alpha === 255 ? '' : ' fill-opacity="' + (alpha / 255).toFixed(8) + '"') + ' d="' + parts.join('') + '"/>';
  }).join('\n');
  if (contents.length > geometryBudget) throw new Error('geometry-budget');
  return { xml: vectorDocument(source.width, source.height, contents, true), count: groups.size };
}
