import type { ImageOutputFormat, ImageSource } from '../image/types';
import { ImageFailure, mime } from '../image/types';
import { decodeChecked, toBlob, validateOutput } from '../image/browser-codec';
import type { ImageResources } from '../image/resources';
import { allowsAvifOutput, avifOutputLimits, type ImageLimits } from '../image/limits';
import { qualifyCanvasAvif } from '../image/inspect-avif';
import type { AvifEncoder } from '../image/avif-encoder';
import { decodeWatermark, type DecodedWatermark, type WatermarkSource } from './asset';

export type WatermarkSettings = Readonly<{
  kind: 'text' | 'image'; text: string; fontSize: number; imagePercent: number;
  opacity: number; position: number; margin: number; color: string;
  layout: 'single' | 'tile'; angle: number; density: 'sparse' | 'standard' | 'dense';
  format: ImageOutputFormat; quality: number; background: string;
}>;
export const defaults: WatermarkSettings = {kind: 'text', text: '© Your name', fontSize: 48, imagePercent: 20, opacity: 60, position: 8, margin: 24, color: '#FFFFFF', layout: 'single', angle: 0, density: 'standard', format: 'png', quality: 90, background: '#FFFFFF'};
export const watermarkFont = '"DM Sans Variable", "Noto Sans SC Variable", sans-serif';
export function validSettings(s: WatermarkSettings) {
  return ['text', 'image'].includes(s.kind) && typeof s.text === 'string' && s.text.trim().length > 0 && [...s.text].length <= 160 && !/[\x00-\x1f\x7f]/.test(s.text)
    && Number.isInteger(s.fontSize) && s.fontSize >= 1 && s.fontSize <= 500
    && Number.isInteger(s.imagePercent) && s.imagePercent >= 1 && s.imagePercent <= 100
    && Number.isInteger(s.opacity) && s.opacity >= 0 && s.opacity <= 100
    && Number.isInteger(s.position) && s.position >= 0 && s.position <= 8
    && Number.isInteger(s.margin) && s.margin >= 0 && s.margin <= 1000
    && /^#[a-f\d]{6}$/i.test(s.color) && /^#[a-f\d]{6}$/i.test(s.background)
    && ['single', 'tile'].includes(s.layout) && ['sparse', 'standard', 'dense'].includes(s.density)
    && Number.isInteger(s.angle) && s.angle >= -45 && s.angle <= 45
    && ['png', 'jpeg', 'webp', 'avif'].includes(s.format) && Number.isInteger(s.quality) && s.quality >= 1 && s.quality <= 100;
}
export function placement(width: number, height: number, markWidth: number, markHeight: number, position: number, margin: number, angle = 0) {
  const gap = Math.min(margin, Math.max(0, (Math.min(width, height) - 1) / 2));
  const radians = angle * Math.PI / 180, c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
  const scale = Math.min(1, (width - 2 * gap) / (markWidth * c + markHeight * s), (height - 2 * gap) / (markWidth * s + markHeight * c));
  const w = markWidth * scale, h = markHeight * scale;
  const boundWidth = w * c + h * s, boundHeight = w * s + h * c;
  const col = position % 3, row = Math.floor(position / 3);
  return {x: (col === 0 ? gap : col === 1 ? (width - boundWidth) / 2 : width - gap - boundWidth) + (boundWidth - w) / 2,
    y: (row === 0 ? gap : row === 1 ? (height - boundHeight) / 2 : height - gap - boundHeight) + (boundHeight - h) / 2, width: w, height: h};
}
export const maxTileDraws = 1024;
/** Grid in rotated source coordinates; cover all four inverse-transformed corners.
 * The draw cap increases spacing, never changes the watermark's requested size. */
export function tileGrid(width: number, height: number, markWidth: number, markHeight: number, angle: number, density: WatermarkSettings['density']) {
  const radians = angle * Math.PI / 180, c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
  const spanX = width * c + height * s, spanY = width * s + height * c;
  let gap = Math.max(markWidth, markHeight) * {sparse: 1.8, standard: .9, dense: .35}[density];
  const count = (spacing: number) => ({columns: Math.ceil((spanX + markWidth) / (markWidth + spacing)) + 1, rows: Math.ceil((spanY + markHeight) / (markHeight + spacing)) + 1});
  let grid = count(gap);
  if (grid.columns * grid.rows > maxTileDraws) {
    let low = gap, high = Math.max(spanX + markWidth, spanY + markHeight);
    for (let i = 0; i < 32; i++) { const middle = (low + high) / 2, test = count(middle); if (test.columns * test.rows > maxTileDraws) low = middle; else high = middle; }
    gap = high; grid = count(gap);
  }
  const stepX = markWidth + gap, stepY = markHeight + gap;
  return {...grid, stepX, stepY, startX: -(grid.columns - 1) * stepX / 2, startY: -(grid.rows - 1) * stepY / 2, radians};
}
/** Same original-pixel composition for a bounded live canvas and the final export. */
export function drawComposition(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, sourceWidth: number, sourceHeight: number,
  source: CanvasImageSource, settings: WatermarkSettings, mark?: {image: CanvasImageSource; width: number; height: number}) {
  ctx.save();
  try {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (settings.format === 'jpeg') { ctx.fillStyle = settings.background; ctx.fillRect(0, 0, canvasWidth, canvasHeight); }
    ctx.drawImage(source, 0, 0, canvasWidth, canvasHeight);
    ctx.scale(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
    ctx.globalAlpha = settings.opacity / 100;
    if (settings.kind === 'image' && !mark) throw new Error('watermark');
    ctx.font = `600 ${settings.fontSize}px ${watermarkFont}`;
    const markWidth = settings.kind === 'image' ? sourceWidth * settings.imagePercent / 100 : Math.max(1, ctx.measureText(settings.text).width);
    const markHeight = settings.kind === 'image' ? markWidth * mark!.height / mark!.width : settings.fontSize * 1.25;
    const draw = (x: number, y: number, width: number, height: number) => {
      if (settings.kind === 'image') ctx.drawImage(mark!.image, x, y, width, height);
      else { ctx.font = `600 ${settings.fontSize * width / markWidth}px ${watermarkFont}`; ctx.fillStyle = settings.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(settings.text, x, y + height / 2); }
    };
    if (settings.layout === 'tile') {
      const grid = tileGrid(sourceWidth, sourceHeight, markWidth, markHeight, settings.angle, settings.density);
      ctx.translate(sourceWidth / 2, sourceHeight / 2); ctx.rotate(grid.radians);
      for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.columns; col++)
        draw(grid.startX + col * grid.stepX - markWidth / 2, grid.startY + row * grid.stepY - markHeight / 2, markWidth, markHeight);
    } else {
      const box = placement(sourceWidth, sourceHeight, markWidth, markHeight, settings.position, settings.margin, settings.angle);
      if (settings.angle) { ctx.translate(box.x + box.width / 2, box.y + box.height / 2); ctx.rotate(settings.angle * Math.PI / 180); draw(-box.width / 2, -box.height / 2, box.width, box.height); }
      else draw(box.x, box.y, box.width, box.height);
    }
  } finally { ctx.restore(); }
}
export async function loadWatermarkFonts(text: string) {
  if (!document.fonts) throw new Error('fonts');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(['DM Sans Variable', 'Noto Sans SC Variable'].map(name => document.fonts.load(`600 48px "${name}"`, text))).then(groups => {
        if (!groups.some(faces => faces.length)) throw new Error('fonts');
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('fonts')), 10000); }),
    ]);
  } finally { clearTimeout(timer); }
}
export async function renderWatermark(source: ImageSource, settings: WatermarkSettings, mark: WatermarkSource | undefined,
  resources: ImageResources, limits: ImageLimits, operation?: {avif: AvifEncoder; signal: AbortSignal}) {
  if (!validSettings(settings) || settings.kind === 'image' && !mark) throw new Error('settings');
  if (settings.kind === 'image' && mark && source.width * source.height * 2 + mark.width * mark.height > limits.pixels * 2) throw new Error('budget');
  if (settings.format === 'avif') {
    if (!allowsAvifOutput(limits) || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new ImageFailure('avifDevice');
    if (source.width > avifOutputLimits.edge || source.height > avifOutputLimits.edge || source.width * source.height > avifOutputLimits.pixels) throw new ImageFailure('avifBudget');
    if (!operation) throw new ImageFailure('avifLoad');
  }
  const current = () => { if (operation?.signal.aborted) throw new ImageFailure('cancelled'); };
  current();
  if (settings.kind === 'text') await loadWatermarkFonts(settings.text);
  current();
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  let sourceClosed = false;
  let watermark: DecodedWatermark | undefined, canvas: HTMLCanvasElement | undefined;
  try {
    current();
    if (settings.kind === 'image' && mark) watermark = await decodeWatermark(mark, resources, limits);
    current();
    canvas = resources.canvas(source.width, source.height);
    const ctx = canvas.getContext('2d', settings.format === 'avif' ? {colorSpace: 'srgb', willReadFrequently: true} : undefined); if (!ctx) throw new Error('draw');
    drawComposition(ctx, source.width, source.height, source.width, source.height, bitmap, settings,
      watermark ? {image: watermark.image, width: watermark.width, height: watermark.height} : undefined);
    resources.close(bitmap); sourceClosed = true;
    if (watermark) { watermark.close(); watermark = undefined; }
    current();
    if (settings.format === 'avif') {
      const pixels = ctx.getImageData(0, 0, source.width, source.height);
      resources.release(canvas); canvas = undefined;
      const buffer = await operation!.avif.encode(pixels.data.buffer as ArrayBuffer, source.width, source.height, settings.quality, false, operation!.signal);
      current();
      const blob = await qualifyCanvasAvif(new Blob([buffer], {type: mime.avif}), {...limits, ...avifOutputLimits});
      current();
      const result = await validateOutput(blob, 'avif', source.width, source.height, resources, limits);
      current(); return result;
    }
    const blob = await toBlob(canvas, mime[settings.format], settings.format === 'png' ? undefined : settings.quality / 100);
    resources.release(canvas); canvas = undefined;
    current();
    const result = await validateOutput(blob, settings.format, source.width, source.height, resources, limits);
    current(); return result;
  } finally { if (!sourceClosed) resources.close(bitmap); if (watermark) watermark.close(); if (canvas) resources.release(canvas); }
}
