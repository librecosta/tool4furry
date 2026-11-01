import { toBlob, validateOutput } from '../image/browser-codec';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';
import { foreground } from './palette';

export const ratios = {
  '1:1': [1200, 1200], '4:5': [1080, 1350], '3:4': [1200, 1600],
  '9:16': [1080, 1920], '3:2': [1500, 1000], '16:9': [1600, 900],
} as const;
export type ShareOptions = {
  direction: 'top' | 'bottom' | 'left' | 'right';
  ratio: 'original' | keyof typeof ratios;
  count: number;
  frame: Framing;
};
export type Framing = { zoom: number; x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export function shareDefaults(): ShareOptions {
  return {direction: 'top', ratio: 'original', count: 10, frame: {zoom: 1, x: 0, y: 0}};
}
export function visibleColors(colors: readonly string[], options: ShareOptions) {
  return colors.slice(0, Math.max(1, Math.min(10, options.count)));
}
/** Bounded poster output, also capped by the workspace's actual device budget. */
export function shareLayout(source: {width: number; height: number}, count: number, options: ShareOptions, limits?: ImageLimits) {
  if (!Number.isInteger(count) || count < 1 || count > 10 || source.width < 1 || source.height < 1) throw new Error('share-layout');
  const horizontal = options.direction === 'top' || options.direction === 'bottom';
  let width: number, height: number, band: number;
  if (options.ratio === 'original') {
    // Preserve the complete image. Grow small images only as far as readable HEX
    // and a useful image short edge require; reject extreme shapes, never crop them.
    const scale = Math.max(Math.min(1, 1600 / Math.max(source.width, source.height)),
      (horizontal ? count * 108 : count * 52) / (horizontal ? source.width : source.height),
      64 / Math.min(source.width, source.height));
    width = Math.round(source.width * scale); height = Math.round(source.height * scale);
    band = horizontal ? Math.max(80, Math.min(160, Math.round(width * .09))) : Math.max(144, Math.min(180, Math.round(height * .12)));
    if (horizontal) height += band; else width += band;
  } else {
    [width, height] = ratios[options.ratio];
    band = horizontal ? Math.max(90, Math.min(152, Math.round(height * .105))) : Math.max(144, Math.min(180, Math.round(width * .12)));
  }
  if (Math.max(width, height) > Math.min(4096, limits?.edge ?? 4096) || width * height > Math.min(4194304, limits?.pixels ?? 4194304)) throw new Error('share-layout');
  const image: Rect = horizontal
    ? {x: 0, y: options.direction === 'bottom' ? band : 0, w: width, h: height - band}
    : {x: options.direction === 'right' ? band : 0, y: 0, w: width - band, h: height};
  const strip: Rect = horizontal
    ? {x: 0, y: options.direction === 'bottom' ? 0 : image.h, w: width, h: band}
    : {x: options.direction === 'right' ? 0 : image.w, y: 0, w: band, h: height};
  const colors = Array.from({length: count}, (_, i) => horizontal
    ? {x: i * width / count, y: strip.y, w: width / count, h: band}
    : {x: strip.x, y: i * height / count, w: band, h: height / count});
  return {width, height, image, strip, colors};
}
export type ShareLayout = ReturnType<typeof shareLayout>;
/** Offsets are fractions of the template image box, independent of CSS/DPR. */
export function constrainFraming(source: {width: number; height: number}, box: Rect, frame: Framing): Framing {
  const zoom = Math.max(1, Math.min(4, Number.isFinite(frame.zoom) ? frame.zoom : 1));
  const scale = Math.max(box.w / source.width, box.h / source.height) * zoom;
  const maxX = Math.max(0, (source.width * scale - box.w) / (2 * box.w));
  const maxY = Math.max(0, (source.height * scale - box.h) / (2 * box.h));
  return { zoom, x: Math.max(-maxX, Math.min(maxX, frame.x || 0)), y: Math.max(-maxY, Math.min(maxY, frame.y || 0)) };
}
export function cover(source: {width: number; height: number}, box: Rect, frame: Framing): Rect {
  const f = constrainFraming(source, box, frame);
  const scale = Math.max(box.w / source.width, box.h / source.height) * f.zoom;
  const w = source.width * scale, h = source.height * scale;
  return { x: box.x + (box.w - w) / 2 + f.x * box.w, y: box.y + (box.h - h) / 2 + f.y * box.h, w, h };
}
export function zoomFraming(source: {width: number; height: number}, box: Rect, frame: Framing, zoom: number) {
  const previous = constrainFraming(source, box, frame), ratio = Math.max(1, Math.min(4, zoom)) / previous.zoom;
  return constrainFraming(source, box, { zoom, x: previous.x * ratio, y: previous.y * ratio });
}
export const fontFamily = '"DM Sans Variable", sans-serif';
let fontPromise: Promise<void> | undefined;
export function loadShareAssets() {
  if (!fontPromise) fontPromise = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const faces = await Promise.race([
        document.fonts.load('600 24px "DM Sans Variable"', '#0123456789ABCDEF'),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('fonts')), 10000); }),
      ]);
      if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error('fonts');
    } finally { clearTimeout(timer); }
  })().catch(error => { fontPromise = undefined; throw error; });
  return fontPromise;
}
export function hexFont(ctx: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>, text: string, box: Rect) {
  let size = Math.min(26, Math.floor(box.h * .36));
  while (size >= 18) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= box.w - 16 && size * 1.4 <= box.h) return size;
    size--;
  }
  throw new Error('share-layout');
}
/** Full output coordinates for both the live canvas and verified PNG. */
export function drawShare(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, colors: readonly string[], options: ShareOptions, layout = shareLayout(image, visibleColors(colors, options).length, options)) {
  ctx.save();
  try {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const target = options.ratio === 'original' ? layout.image : cover(image, layout.image, options.frame);
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(layout.image.x, layout.image.y, layout.image.w, layout.image.h); ctx.clip();
      ctx.drawImage(image, target.x, target.y, target.w, target.h);
    } finally { ctx.restore(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    visibleColors(colors, options).forEach((hex, i) => {
      const box = layout.colors[i];
      ctx.fillStyle = hex;
      // Round shared boundaries, avoiding hairline seams between adjacent cells.
      const x = Math.round(box.x), y = Math.round(box.y);
      ctx.fillRect(x, y, Math.round(box.x + box.w) - x, Math.round(box.y + box.h) - y);
      hexFont(ctx, hex, box); ctx.fillStyle = foreground(hex);
      ctx.fillText(hex, box.x + box.w / 2, box.y + box.h / 2);
    });
  } finally { ctx.restore(); }
  return layout;
}
export async function renderPalette(image: HTMLCanvasElement | undefined, colors: readonly string[], options: ShareOptions | undefined,
  resources: ImageResources, limits: ImageLimits, valid: () => boolean = () => true) {
  if (colors.length < 1 || colors.length > 10) throw new Error('palette');
  const layout = options && image ? shareLayout(image, visibleColors(colors, options).length, options, limits) : undefined;
  if (options && !layout) throw new Error('draw');
  await loadShareAssets();
  if (!valid()) throw new Error('stale');
  const width = layout?.width ?? colors.length * 180, height = layout?.height ?? 240;
  const canvas = resources.canvas(width, height);
  try {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('draw');
    if (options && image && layout) drawShare(ctx, image, colors, options, layout);
    else {
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      colors.forEach((hex, i) => {
        ctx.fillStyle = hex; ctx.fillRect(i * 180, 0, 180, 240);
        ctx.fillStyle = foreground(hex); ctx.font = `600 23px ${fontFamily}`;
        ctx.fillText(hex, i * 180 + 90, 205);
      });
    }
    const blob = await toBlob(canvas, 'image/png');
    if (!valid()) throw new Error('stale');
    const checked = await validateOutput(blob, 'png', width, height, resources, limits);
    if (!valid()) throw new Error('stale');
    return checked;
  } finally { resources.release(canvas); }
}
