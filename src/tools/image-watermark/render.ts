import type { NativeImageFormat, ImageSource } from '../image/types';
import { mime } from '../image/types';
import { decodeChecked, toBlob, validateOutput } from '../image/browser-codec';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';

export type WatermarkSettings = Readonly<{
  kind: 'text' | 'image'; text: string; fontSize: number; imagePercent: number;
  opacity: number; position: number; margin: number; color: string;
  format: NativeImageFormat; quality: number; background: string;
}>;
export const defaults: WatermarkSettings = {kind: 'text', text: '© Your name', fontSize: 48, imagePercent: 20, opacity: 60, position: 8, margin: 24, color: '#FFFFFF', format: 'png', quality: 90, background: '#FFFFFF'};
export const watermarkFont = '"DM Sans Variable", "Noto Sans SC Variable", sans-serif';
export function validSettings(s: WatermarkSettings) {
  return ['text', 'image'].includes(s.kind) && typeof s.text === 'string' && s.text.trim().length > 0 && [...s.text].length <= 160 && !/[\x00-\x1f\x7f]/.test(s.text)
    && Number.isInteger(s.fontSize) && s.fontSize >= 1 && s.fontSize <= 500
    && Number.isInteger(s.imagePercent) && s.imagePercent >= 1 && s.imagePercent <= 100
    && Number.isInteger(s.opacity) && s.opacity >= 0 && s.opacity <= 100
    && Number.isInteger(s.position) && s.position >= 0 && s.position <= 8
    && Number.isInteger(s.margin) && s.margin >= 0 && s.margin <= 1000
    && /^#[a-f\d]{6}$/i.test(s.color) && /^#[a-f\d]{6}$/i.test(s.background)
    && ['png', 'jpeg', 'webp'].includes(s.format) && Number.isInteger(s.quality) && s.quality >= 1 && s.quality <= 100;
}
export function placement(width: number, height: number, markWidth: number, markHeight: number, position: number, margin: number) {
  const gap = Math.min(margin, Math.max(0, (Math.min(width, height) - 1) / 2));
  const scale = Math.min(1, (width - 2 * gap) / markWidth, (height - 2 * gap) / markHeight);
  const w = markWidth * scale, h = markHeight * scale;
  const col = position % 3, row = Math.floor(position / 3);
  return {x: col === 0 ? gap : col === 1 ? (width - w) / 2 : width - gap - w,
    y: row === 0 ? gap : row === 1 ? (height - h) / 2 : height - gap - h, width: w, height: h};
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
    if (settings.kind === 'image') {
      if (!mark) throw new Error('watermark');
      const width = sourceWidth * settings.imagePercent / 100;
      const box = placement(sourceWidth, sourceHeight, width, width * mark.height / mark.width, settings.position, settings.margin);
      ctx.drawImage(mark.image, box.x, box.y, box.width, box.height);
    } else {
      ctx.font = `600 ${settings.fontSize}px ${watermarkFont}`;
      const measured = Math.max(1, ctx.measureText(settings.text).width);
      const box = placement(sourceWidth, sourceHeight, measured, settings.fontSize * 1.25, settings.position, settings.margin);
      ctx.font = `600 ${settings.fontSize * box.width / measured}px ${watermarkFont}`;
      ctx.fillStyle = settings.color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(settings.text, box.x, box.y + box.height / 2);
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
export async function renderWatermark(source: ImageSource, settings: WatermarkSettings, mark: ImageSource | undefined,
  resources: ImageResources, limits: ImageLimits) {
  if (!validSettings(settings) || settings.kind === 'image' && !mark) throw new Error('settings');
  if (settings.kind === 'text') await loadWatermarkFonts(settings.text);
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  let sourceClosed = false;
  let watermark: ImageBitmap | undefined, canvas: HTMLCanvasElement | undefined;
  try {
    if (settings.kind === 'image' && mark) watermark = await decodeChecked(mark.blob, mark.info, resources, limits);
    canvas = resources.canvas(source.width, source.height);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('draw');
    drawComposition(ctx, source.width, source.height, source.width, source.height, bitmap, settings,
      watermark ? {image: watermark, width: watermark.width, height: watermark.height} : undefined);
    resources.close(bitmap); sourceClosed = true;
    if (watermark) { resources.close(watermark); watermark = undefined; }
    const blob = await toBlob(canvas, mime[settings.format], settings.format === 'png' ? undefined : settings.quality / 100);
    return await validateOutput(blob, settings.format, source.width, source.height, resources, limits);
  } finally { if (!sourceClosed) resources.close(bitmap); if (watermark) resources.close(watermark); if (canvas) resources.release(canvas); }
}
