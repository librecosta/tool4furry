import { sanitizeSvg } from '../image-watermark/svg';
import { decodeWatermark } from '../image-watermark/asset';
import { mobileImageLimits } from '../image/limits';
import { ImageResources } from '../image/resources';
import { canvasSize, encodeCanvas } from '../general/canvas-output';
import { fail } from '../general/bounds';
export function readSvg(input: string) {
  try {
    const svg = sanitizeSvg(input, mobileImageLimits);
    const root = new DOMParser().parseFromString(
      svg.xml,
      'image/svg+xml',
    ).documentElement;
    return { ...svg, viewBox: root.getAttribute('viewBox') ?? '' };
  } catch {
    fail(
      'SVG 无效或包含不支持的元素、外部资源或超限尺寸。支持静态形状、路径、渐变与裁切。',
      'Invalid SVG, unsupported elements, external resources or excessive dimensions. Static shapes, paths, gradients and clipping are supported.',
    );
  }
}
export function svgOutputSize(
  source: { width: number; height: number },
  width: string,
  height: string,
) {
  if (!/^\d+$/.test(width) || !/^\d+$/.test(height))
    fail('请输入整数像素尺寸。', 'Enter integer pixel dimensions.');
  const w = Number(width),
    h = Number(height);
  canvasSize(w, h);
  if (Math.abs(h - Math.round((w * source.height) / source.width)) > 1)
    fail('请保持原始宽高比例。', 'Keep the original aspect ratio.');
  return { width: w, height: h };
}
export async function rasterizeSvg(
  svg: ReturnType<typeof readSvg>,
  width: number,
  height: number,
  background: string | undefined,
  signal: AbortSignal,
) {
  canvasSize(width, height);
  if (background && !/^#[a-f\d]{6}$/i.test(background))
    fail('背景须为六位 HEX。', 'Background must use six-digit HEX.');
  if (signal.aborted) throw new Error('Cancelled');
  const resources = new ImageResources();
  const file = new File([svg.xml], 'source.svg', { type: 'image/svg+xml' });
  // Reuse the existing detached SVG image decoder: Chromium may reject
  // Blob -> ImageBitmap for SVG even when the same image renders correctly.
  const decoded = await decodeWatermark(
    { kind: 'svg', file, blob: file, width: svg.width, height: svg.height },
    resources,
    mobileImageLimits,
  );
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (signal.aborted) throw new Error('Cancelled');
    canvas = resources.canvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error();
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(decoded.image, 0, 0, width, height);
    return await encodeCanvas(canvas);
  } finally {
    decoded.close();
    if (canvas) resources.release(canvas);
  }
}
