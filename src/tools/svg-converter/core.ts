import { fail, MiB } from '../general/bounds';
import { validateSvg, svgNamespace, type StaticSvg } from './policy';
import { batchTime } from '../file-naming';
import { acceptImage, decodeChecked, prepareQuickOutput, toBlob, validateOutput } from '../image/browser-codec';
import { avifOutputLimits, desktopImageLimits, type ImageLimits } from '../image/limits';
import type { AvifEncoder } from '../image/avif-encoder';
import { qualifyCanvasAvif } from '../image/inspect-avif';
import { ImageResources } from '../image/resources';
import { mime, type ImageFormat, type ImageSource } from '../image/types';

export interface Size { width: number; height: number }
export type RasterFormat = ImageFormat | 'ico';
export const rasterLimits = { ...desktopImageLimits, edge: 16_384 };
export const outputByteLimit = 256 * MiB;
export const icoSizes = [16, 32, 48, 64, 128, 256] as const;
export type IconSize = (typeof icoSizes)[number];
const icoMime = 'image/x-icon';
export const imageAccept = '.png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif';
export const svgMime = 'image/svg+xml';

export function outputSize(width: number, height: number, pixelLimit = rasterLimits.pixels, edge = rasterLimits.edge): Size {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width > edge || height > edge || width * height > pixelLimit)
    fail('请输入有效的整数像素尺寸，且遵守当前格式与设备的尺寸预算。', 'Enter whole-pixel dimensions within this format and device budget.');
  return { width, height };
}

export function previewSize({ width, height }: Size): Size {
  const scale = Math.min(1, 1536 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function sizedSvg(svg: StaticSvg, { width, height }: Size, viewport?: Size) {
  const root = svg.root.cloneNode(true) as Element;
  if (!svg.viewBox) {
    const basisWidth = svg.width ?? viewport?.width ?? width;
    const basisHeight = svg.height ?? viewport?.height ?? height;
    root.setAttribute('viewBox', '0 0 ' + basisWidth + ' ' + basisHeight);
  }
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  const authoredStyle = root.getAttribute('style');
  // Force the isolated image viewport while retaining the author's viewBox and preserveAspectRatio.
  root.setAttribute('style', (authoredStyle ? authoredStyle + ';' : '') + 'width:' + width + 'px!important;height:' + height + 'px!important');
  return new Blob([new XMLSerializer().serializeToString(root)], { type: svgMime });
}

function paintBackground(context: CanvasRenderingContext2D, width: number, height: number, color?: string) {
  if (color !== undefined) {
    if (!/^#[\da-f]{6}$/i.test(color)) fail('背景颜色必须为六位 HEX。', 'Use a six-digit background color.');
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
  }
}

async function drawSvg(
  svg: StaticSvg,
  size: Size,
  canvas: HTMLCanvasElement,
  resources: ImageResources,
  signal: AbortSignal,
  color?: string,
  contain = false,
  viewport?: Size,
) {
  const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
  if (!context || canvas.width !== size.width || canvas.height !== size.height)
    fail('浏览器无法创建此画布。请降低输出尺寸。', 'The browser could not allocate this canvas. Reduce the output size.');
  const { width, height } = size;
  const original = { width: svg.width ?? viewport?.width ?? width, height: svg.height ?? viewport?.height ?? height };
  const scale = Math.min(width / original.width, height / original.height);
  const draw = contain
    ? { width: Math.max(1, Math.round(original.width * scale)), height: Math.max(1, Math.round(original.height * scale)) }
    : size;
  const image = new Image();
  const url = resources.url(sizedSvg(svg, draw, viewport));
  let onAbort: () => void = () => {};
  try {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVG decode'));
      image.src = url;
    });
    signal.throwIfAborted();
    if (image.naturalWidth !== draw.width || image.naturalHeight !== draw.height)
      fail('浏览器未能按目标尺寸解码 SVG。', 'The browser could not decode the SVG at the requested size.');
    paintBackground(context, width, height, color);
    context.drawImage(image, Math.floor((width - draw.width) / 2), Math.floor((height - draw.height) / 2));
    return context;
  } finally {
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    signal.removeEventListener('abort', onAbort);
    resources.revoke(url);
  }
}

export async function renderRaster(
  svg: StaticSvg,
  size: Size,
  format: ImageFormat,
  quality: number,
  background: string | undefined,
  signal: AbortSignal,
  avif?: AvifEncoder,
) {
  size = outputSize(size.width, size.height, format === 'avif' ? avifOutputLimits.pixels : undefined,
    format === 'avif' ? avifOutputLimits.edge : undefined);
  if (svg.hasEffects && size.width * size.height > 16_000_000)
    fail('含滤镜、蒙版或图案的 SVG 最多输出 1600 万像素。', 'SVGs with filters, masks or patterns can render up to 16 megapixels.');
  const resources = new ImageResources();
  const canvas = resources.canvas(size.width, size.height);
  let blob: Blob;
  try {
    const ctx = await drawSvg(svg, size, canvas, resources, signal, background ?? (format === 'jpeg' ? '#ffffff' : undefined));
    if (format === 'avif') {
      if (!avif) fail('此设备的 AVIF 编码不可用。', 'AVIF encoding is unavailable on this device.');
      const rgba = ctx.getImageData(0, 0, size.width, size.height).data.buffer as ArrayBuffer;
      const data = await avif.encode(rgba, size.width, size.height, quality, false, signal);
      blob = await qualifyCanvasAvif(new Blob([data], { type: mime.avif }), rasterLimits);
    } else {
      blob = await toBlob(canvas, mime[format], quality / 100);
    }
  } finally { resources.release(canvas); }
  signal.throwIfAborted();
  if (blob.size > outputByteLimit)
    fail('输出超过 256 MiB。请降低分辨率。', 'Output exceeds 256 MiB. Reduce the resolution.');
  return validateOutput(blob, format, size.width, size.height, resources, rasterLimits);
}

export interface IconImage { size: IconSize; png: Uint8Array<ArrayBuffer> }
export function packIco(images: IconImage[]) {
  const allowed = new Set<number>(icoSizes);
  if (!images.length || images.length > icoSizes.length || new Set(images.map(image => image.size)).size !== images.length)
    fail('请选择不同的图标尺寸。', 'Choose distinct icon sizes.');
  const head = 6 + 16 * images.length;
  let offset = head;
  const bytes = new Uint8Array(head + images.reduce((sum, image) => sum + image.png.length, 0));
  const header = new DataView(bytes.buffer);
  header.setUint16(2, 1, true);
  header.setUint16(4, images.length, true);
  images.forEach(({ size, png }, index) => {
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    if (!allowed.has(size) || png.length < 33 || view.getUint32(0) !== 0x89504e47 ||
      view.getUint32(4) !== 0x0d0a1a0a || view.getUint32(12) !== 0x49484452 ||
      view.getUint32(16) !== size || view.getUint32(20) !== size)
      fail('ICO 内部 PNG 尺寸或签名无效。', 'An ICO frame has an invalid PNG signature or size.');
    const entry = 6 + index * 16;
    bytes[entry] = bytes[entry + 1] = size & 255;
    header.setUint16(entry + 4, 1, true);
    header.setUint16(entry + 6, 32, true);
    header.setUint32(entry + 8, png.length, true);
    header.setUint32(entry + 12, offset, true);
    bytes.set(png, offset);
    offset += png.length;
  });
  return new Blob([bytes], { type: icoMime });
}

export async function renderIco(svg: StaticSvg, sizes: IconSize[], signal: AbortSignal, viewport?: Size) {
  const resources = new ImageResources();
  const images: IconImage[] = [];
  for (const size of sizes) {
    signal.throwIfAborted();
    const canvas = resources.canvas(size, size);
    try {
      await drawSvg(svg, { width: size, height: size }, canvas, resources, signal, undefined, true, viewport);
      const png = await validateOutput(await toBlob(canvas, mime.png), 'png', size, size, resources, rasterLimits);
      images.push({ size, png: new Uint8Array(await png.arrayBuffer()) });
    } finally { resources.release(canvas); }
  }
  signal.throwIfAborted();
  return packIco(images);
}

export async function readBitmap(file: File, limits: ImageLimits) {
  try { return await acceptImage(file, new ImageResources(), limits); }
  catch { return fail('无法导入图片。请选择预算内的有效 PNG、JPEG、WebP 或 AVIF。', 'Could not import the image. Choose a valid PNG, JPEG, WebP or AVIF within the image budget.'); }
}

async function nativePixelData(source: ImageSource, signal: AbortSignal) {
  const type = mime[source.info.format];
  if (source.info.orientation !== 1 || typeof ImageDecoder === 'undefined' || !await ImageDecoder.isTypeSupported(type)) return;
  signal.throwIfAborted();
  const decoder = new ImageDecoder({ type, data: source.blob.stream(), preferAnimation: false });
  let closed = false;
  const stop = () => { if (!closed) { decoder.close(); closed = true; } };
  signal.addEventListener('abort', stop, { once: true });
  try {
    const { image } = await decoder.decode({ frameIndex: 0 });
    try {
      const rect = image.visibleRect;
      if (rect?.width !== source.width || rect.height !== source.height || image.displayWidth !== source.width || image.displayHeight !== source.height) return;
      const data = new Uint8ClampedArray(source.width * source.height * 4);
      await image.copyTo(data, { format: 'RGBA', colorSpace: 'srgb', rect });
      signal.throwIfAborted();
      return new ImageData(data, source.width, source.height);
    } finally { image.close(); }
  } catch {
    signal.throwIfAborted();
    return undefined;
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}

export async function pixelData(source: ImageSource, size: Size, signal: AbortSignal, exact = false) {
  if (exact) {
    const pixels = await nativePixelData(source, signal);
    if (pixels) return pixels;
  }
  const resources = new ImageResources();
  const bitmap = await decodeChecked(source.blob, source.info, resources, desktopImageLimits);
  const canvas = resources.canvas(size.width, size.height);
  try {
    signal.throwIfAborted();
    const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.imageSmoothingEnabled = size.width !== source.width || size.height !== source.height;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return ctx.getImageData(0, 0, size.width, size.height);
  } finally {
    resources.release(canvas);
    resources.close(bitmap);
  }
}

export function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function prepareEmbeddedBitmap(source: ImageSource, signal: AbortSignal) {
  const resources = new ImageResources();
  const limits = { ...desktopImageLimits, pixels: 24_000_000, edge: 8192 };
  if ((source.info.format === 'png' || source.info.format === 'jpeg') && source.info.orientation === 1 && source.blob.size <= 20 * MiB) {
    const { blob } = await prepareQuickOutput(source, resources, limits);
    signal.throwIfAborted();
    return dataUrl(blob);
  }
  const bitmap = await decodeChecked(source.blob, source.info, resources, limits);
  const canvas = resources.canvas(source.width, source.height);
  try {
    signal.throwIfAborted();
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const format = source.info.format === 'jpeg' ? 'jpeg' : 'png';
    const blob = await validateOutput(await toBlob(canvas, mime[format], .95), format, source.width, source.height, resources, limits);
    if (blob.size > 20 * MiB)
      fail('内嵌图片超过 20 MiB。请使用较小的图片。', 'The embedded image exceeds 20 MiB. Choose a smaller image.');
    signal.throwIfAborted();
    return dataUrl(blob);
  } finally {
    resources.release(canvas);
    resources.close(bitmap);
  }
}

export function svgDocument(size: Size, content: string, extras = '') {
  const { width, height } = size;
  return '<svg xmlns="' + svgNamespace + '" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"' + extras + '>\n' + content + '\n</svg>';
}

export function embedSvg(size: Size, data: string, fitting: 'contain' | 'cover', color?: string) {
  outputSize(size.width, size.height);
  if (!/^data:image\/(?:png|jpeg);base64,[a-z\d+/]+={0,2}$/i.test(data) || color && !/^#[\da-f]{6}$/i.test(color))
    throw new Error('Invalid embedded image or color');
  const base = ' width="' + size.width + '" height="' + size.height + '"';
  const background = color ? '<rect' + base + ' fill="' + color + '"/>\n' : '';
  return svgDocument(size, background + '<image' + base + ' preserveAspectRatio="xMidYMid ' + (fitting === 'contain' ? 'meet' : 'slice') + '" href="' + data + '"/>', ' overflow="hidden"');
}

export async function readSvgFile(file: File, signal: AbortSignal) {
  if (file.size > 32 * MiB) fail('SVG 文件超过 32 MiB。', 'SVG file exceeds 32 MiB.');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
  catch { return fail('无法读取文件。请选择 UTF-8 SVG。', 'Could not read the file. Choose a UTF-8 SVG.'); }
  signal.throwIfAborted();
  return { text, svg: await validateSvg(text, signal), name: file.name };
}

export function createSvgNamer() {
  const counts = new Map<string, number>();
  return (original: string, format: RasterFormat | 'svg', now = new Date()) => {
    const stamp = batchTime(now).replace(/(\d{6})(\d{3})$/, '$1-$2');
    const count = (counts.get(stamp) ?? 0) + 1;
    counts.set(stamp, count);
    const clean = original.normalize('NFC').replace(/\.[^.]+$/, '')
      .replace(/[<>:"/\\|?*\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '-').replace(/^[.\s]+|[.\s]+$/g, '');
    const name = Array.from(clean).slice(0, 48).join('').replace(/[.\s]+$/g, '') || 'svg-conversion';
    return name + '-' + stamp + (count > 1 ? '-' + count : '') + '.' + (format === 'jpeg' ? 'jpg' : format);
  };
}
