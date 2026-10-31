import { getPaletteSync } from 'colorthief';

export const modes = [
  'balanced',
  'colorful',
  'bright',
  'muted',
  'deep',
  'dark',
] as const;
export type Mode = (typeof modes)[number];
export type RGB = readonly [number, number, number];
export type Candidate = {
  hex: string;
  l: number;
  c: number;
  a: number;
  b: number;
  population: number;
};
export type Swatch = { id: string; hex: string };
export const normalizeHex = (value: string) => {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  return match
    ? '#' +
        (match[1].length === 3
          ? [...match[1]].map((c) => c + c).join('')
          : match[1]
        ).toUpperCase()
    : undefined;
};
export const rgb = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as RGB;
export const hexColor = (values: RGB) =>
  '#' +
  values
    .map((n) => Math.round(n).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
export const rgbText = (hex: string) => `rgb(${rgb(hex).join(', ')})`;
export function foreground(hex: string) {
  const linear = rgb(hex).map((v) =>
    v / 255 <= 0.04045 ? v / 3294.6 : ((v / 255 + 0.055) / 1.055) ** 2.4,
  );
  const y = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return (y + 0.05) / 0.05 >= 1.05 / (y + 0.05) ? '#000000' : '#FFFFFF';
}
/** Pre-filter BEFORE the library: no alpha=0 RGB can enter its fallback path. */
export function eligiblePixels(
  image: Pick<ImageData, 'data' | 'width' | 'height'>,
) {
  if (
    image.width * image.height > 640 ** 2 ||
    image.data.length !== image.width * image.height * 4
  )
    throw new Error('analysis');
  let max = 0,
    solid = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    max = Math.max(max, image.data[i]);
    if (image.data[i] >= 192) solid++;
  }
  if (!max) throw new Error('transparent');
  const threshold = solid ? 192 : Math.max(1, Math.min(96, max));
  let count = solid;
  if (!count)
    for (let i = 3; i < image.data.length; i += 4)
      if (image.data[i] >= threshold) count++;
  const stride = Math.max(1, Math.ceil(count / 32768));
  const output: number[] = [];
  let seen = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] < threshold || seen++ % stride) continue;
    output.push(image.data[i], image.data[i + 1], image.data[i + 2], 255);
  }
  return new Uint8ClampedArray(output);
}
export function candidates(
  image: Pick<ImageData, 'data' | 'width' | 'height'>,
): Candidate[] {
  const pixels = eligiblePixels(image);
  const colors =
    getPaletteSync(new ImageData(pixels, pixels.length / 4, 1), {
      colorCount: 20,
      quality: 1,
      colorSpace: 'oklch',
      gamut: 'srgb',
      ignoreWhite: false,
      alphaThreshold: 1,
    }) ?? [];
  if (!colors.length) throw new Error('transparent');
  const total = colors.reduce((n, c) => n + c.population, 0) || 1;
  return colors.map((color) => {
    const { l, c, h } = color.oklch();
    return {
      hex: color.hex().toUpperCase(),
      l,
      c,
      a: c * Math.cos((h * Math.PI) / 180),
      b: c * Math.sin((h * Math.PI) / 180),
      population: color.population / total,
    };
  });
}
export const distance = (a: Candidate, b: Candidate) =>
  Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
export function selectPalette(
  input: readonly Candidate[],
  mode: Mode,
  count: number,
): string[] {
  if (
    !modes.includes(mode) ||
    !Number.isInteger(count) ||
    count < 3 ||
    count > 10
  )
    throw new Error('settings');
  const sorted = [...input].sort(
    (a, b) => b.population - a.population || a.hex.localeCompare(b.hex),
  );
  const pool = sorted.filter(
    (v, i) =>
      (v.population >= 0.005 || i === 0) &&
      !sorted.slice(0, i).some((other) => distance(v, other) < 0.035),
  );
  const chosen: Candidate[] = [];
  while (pool.length && chosen.length < count) {
    const score = (v: Candidate) => {
      const area = Math.sqrt(v.population),
        chroma = Math.min(1, v.c / 0.25);
      const distinct = chosen.length
        ? Math.min(...chosen.map((x) => distance(v, x)))
        : 0;
      const preference = {
        balanced: area,
        colorful: chroma,
        bright: v.l,
        muted: 1 - chroma,
        deep: chroma * (1 - Math.abs(v.l - 0.42)),
        dark: 1 - v.l,
      }[mode];
      return 0.45 * area + 0.45 * preference + 0.25 * distinct;
    };
    pool.sort((a, b) => score(b) - score(a) || a.hex.localeCompare(b.hex));
    chosen.push(pool.shift()!);
  }
  return chosen.map((c) => c.hex);
}
/** CSS contain projection: neither letterbox space nor transparent pixels count. */
export function samplePoint(
  data: ImageData,
  x: number,
  y: number,
  box: { width: number; height: number },
) {
  const scale = Math.min(box.width / data.width, box.height / data.height);
  const px = Math.floor((x - (box.width - data.width * scale) / 2) / scale);
  const py = Math.floor((y - (box.height - data.height * scale) / 2) / scale);
  if (px < 0 || py < 0 || px >= data.width || py >= data.height) return;
  const i = (py * data.width + px) * 4;
  if (!data.data[i + 3]) return;
  return {
    x: px,
    y: py,
    hex: hexColor([data.data[i], data.data[i + 1], data.data[i + 2]]),
  };
}
