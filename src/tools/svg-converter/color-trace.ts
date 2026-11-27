import imageTracer from 'imagetracerjs';
import { geometryBudget, maxRegions, vectorDocument, type RasterPixels, type TraceSettings } from './vector';

interface Color { r: number; g: number; b: number; a: number }
interface Bin extends Color { count: number }
const transparent: Color = { r: 0, g: 0, b: 0, a: 0 };
const black: Color = { ...transparent, a: 255 };
const white: Color = { r: 255, g: 255, b: 255, a: 255 };
const channels = ['r', 'g', 'b', 'a'] as const;

function average(bins: Bin[]) {
  const sum = { r: 0, g: 0, b: 0, a: 0 };
  let count = 0;
  for (const bin of bins) {
    count += bin.count;
    for (const channel of channels) sum[channel] += bin[channel] * bin.count;
  }
  for (const channel of channels) sum[channel] = Math.round(sum[channel] / count);
  return sum;
}

function splitPalette(bins: Bin[], count: number): Color[] {
  const stacks = [bins];
  while (stacks.length < count) {
    let best = -1, spread = 0;
    let axis: typeof channels[number] = 'r';
    stacks.forEach((bucket, index) => {
      if (bucket.length < 2) return;
      for (const channel of channels) {
        let lo = 255, hi = 0;
        for (const color of bucket) { lo = Math.min(lo, color[channel]); hi = Math.max(hi, color[channel]); }
        if (hi - lo > spread) { best = index; axis = channel; spread = hi - lo; }
      }
    });
    if (best < 0) break;
    const bucket = stacks[best].sort((a, b) => a[axis] - b[axis]);
    const midpoint = bucket.reduce((total, color) => total + color.count, 0) / 2;
    let weight = 0, cut = 0;
    while (cut < bucket.length - 1 && weight < midpoint) weight += bucket[cut++].count;
    stacks.splice(best, 1, bucket.slice(0, cut), bucket.slice(cut));
  }
  return stacks.filter(bucket => bucket.length).map(average);
}

function quantize(data: Uint8ClampedArray, settings: TraceSettings) {
  const bins = new Map<number, Bin>();
  const keyOf = (i: number) => (data[i] >> 3) * 16384 + (data[i + 1] >> 3) * 512 + (data[i + 2] >> 3) * 16 + (data[i + 3] >> 4);
  const mono = settings.color === 'mono';
  if (!mono) for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const key = keyOf(i);
    let bin = bins.get(key);
    if (!bin) { bin = { ...transparent, count: 0 }; bins.set(key, bin); }
    bin.count++;
    bin.r += data[i]; bin.g += data[i + 1]; bin.b += data[i + 2]; bin.a += data[i + 3];
  }
  for (const bin of bins.values()) for (const c of channels) bin[c] = Math.round(bin[c] / bin.count);
  const palette = mono ? [black, white] : splitPalette([...bins.values()], settings.colors);
  const colors = new Map<number, Color>();
  for (const [key, bin] of bins) {
    let best = palette[0], distance = Infinity;
    for (const color of palette) {
      const diff = Math.abs(bin.r - color.r) + Math.abs(bin.g - color.g) + Math.abs(bin.b - color.b) + Math.abs(bin.a - color.a);
      if (diff < distance) { best = color; distance = diff; }
    }
    colors.set(key, best);
  }
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const c = mono
      ? (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722 < settings.threshold ? black : white)
      : colors.get(keyOf(i))!;
    output[i] = c.r; output[i + 1] = c.g; output[i + 2] = c.b; output[i + 3] = c.a;
  }
  return { palette: [transparent, ...palette], data: output };
}

const num = (n: number) => String(+n.toFixed(2));

export function traceColor({ width, height, data }: RasterPixels, settings: TraceSettings) {
  const quantized = quantize(data, settings);
  const packed = new Uint32Array(quantized.data.buffer);
  let edges = 0;
  for (let i = 0; i < packed.length; i++) {
    if (i % width > 0 && packed[i] !== packed[i - 1]) edges++;
    if (i >= width && packed[i] !== packed[i - width]) edges++;
    if (edges > 1_800_000) throw new Error('geometry-budget');
  }
  const polygon = settings.fit === 'polygon';
  const tolerance = .15 + (100 - settings.detail) / 60 + settings.smooth / 60;
  const traced = imageTracer.imagedataToTracedata({ width, height, data: quantized.data }, {
    // Exact quantized palette labels, including a dedicated transparent label.
    // One pass keeps transparent pixels out of visible layers.
    pal: quantized.palette, colorquantcycles: 1, mincolorratio: 0, layering: 0,
    pathomit: Math.max(1, Math.round((100 - settings.detail) / 5)),
    ltres: tolerance, qtres: polygon ? -1 : .15 + settings.smooth / 30,
    rightangleenhance: polygon || settings.preset === 'logo',
  });
  type Outline = (typeof traced.layers)[number][number];
  const pathFor = (outline: Outline) => {
    const start = outline.segments[0];
    if (!start) return '';
    return 'M' + num(start.x1) + ' ' + num(start.y1) + outline.segments.map(segment =>
      !polygon && segment.type === 'Q' && segment.x3 !== undefined && segment.y3 !== undefined
        ? 'Q' + num(segment.x2) + ' ' + num(segment.y2) + ' ' + num(segment.x3) + ' ' + num(segment.y3)
        : 'L' + num(segment.x3 ?? segment.x2) + ' ' + num(segment.y3 ?? segment.y2)).join('') + 'Z';
  };
  const paths: string[] = [];
  let bytes = 0;
  traced.layers.forEach((layer, index) => {
    const { r, g, b, a } = traced.palette[index];
    if (!a) return;
    for (const outline of layer) {
      if (outline.isholepath || !outline.segments.length) continue;
      const geometry = pathFor(outline) + outline.holechildren.map(hole => pathFor(layer[hole])).join('');
      const color = '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
      const path = '<path fill="' + color + '" fill-rule="evenodd"' +
        (a === 255 ? '' : ' fill-opacity="' + (a / 255).toFixed(6) + '"') + ' d="' + geometry + '"/>';
      bytes += path.length;
      if (bytes > geometryBudget || paths.length >= maxRegions) throw new Error('geometry-budget');
      paths.push(path);
    }
  });
  return { xml: vectorDocument(width, height, paths.join('\n')), count: paths.length };
}
