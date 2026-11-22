import { fail } from '../../general/bounds';
import { QrDensityError, renderQrSvg, type QrArtwork, type QrRenderMode } from './render';
import type { QrMatrixData } from '../matrix/qr-matrix';

export type QrFiles = { svg: Blob; png: Blob };
export type ScanFallback = { reason: 'density'; minimum: number } | { reason: 'decode' };
export type VerifiedQr = QrFiles & { size: number; fallback?: ScanFallback };

function loadImage(image: HTMLImageElement, url: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const stop = () => finish(() => reject(signal.reason));
    const finish = (result: () => void) => {
      signal.removeEventListener('abort', stop);
      image.onload = image.onerror = null;
      result();
    };
    signal.throwIfAborted();
    signal.addEventListener('abort', stop, { once: true });
    image.onload = () => finish(resolve);
    image.onerror = () => finish(() => reject(new Error('Could not rasterize QR SVG')));
    image.src = url;
  });
}

/** A rejected scan never gets a deliverable PNG. */
export async function rasterizeQr(
  artwork: QrArtwork,
  signal: AbortSignal,
  verify?: (pixels: ImageData) => boolean,
): Promise<QrFiles | null> {
  signal.throwIfAborted();
  const svg = new Blob([artwork.svg], { type: 'image/svg+xml' });
  const image = new Image();
  const canvas = document.createElement('canvas');
  const url = URL.createObjectURL(svg);
  try {
    await loadImage(image, url, signal);
    signal.throwIfAborted();
    const { size } = artwork;
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: !!verify });
    if (!context) throw new Error('2D canvas is unavailable');
    context.drawImage(image, 0, 0, size, size);
    if (verify && !verify(context.getImageData(0, 0, size, size))) return null;
    signal.throwIfAborted();
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => blob?.type === 'image/png'
        ? resolve(blob) : reject(new Error('Could not encode QR PNG')), 'image/png'));
    signal.throwIfAborted();
    return { png, svg };
  } finally {
    URL.revokeObjectURL(url);
    image.removeAttribute('src');
    canvas.width = canvas.height = 1;
  }
}

export async function generateVerifiedQr(
  matrix: QrMatrixData,
  content: string,
  size: number,
  mode: QrRenderMode,
  signal: AbortSignal,
): Promise<VerifiedQr> {
  let fallback: ScanFallback | undefined;
  const renderStandard = (colors?: Extract<QrRenderMode, { kind: 'standard' }>['colors']) => {
    try {
      return renderQrSvg(matrix, size, { kind: 'standard', colors });
    } catch (error) {
      if (!(error instanceof QrDensityError)) throw error;
      fail(`二维码过密。请把导出尺寸增至至少 ${error.minimum} px，或缩短内容。`,
        `This QR code is too dense. Export at ${error.minimum} px or larger, or shorten the content.`);
    }
  };
  const render = () => {
    if (mode.kind === 'standard') return renderStandard(mode.colors);
    try {
      return renderQrSvg(matrix, size, mode);
    } catch (error) {
      if (!(error instanceof QrDensityError)) throw error;
      fallback = { reason: 'density', minimum: error.minimum };
      return renderStandard();
    }
  };
  signal.throwIfAborted();
  const artwork = render();
  const expectedBytes = new TextEncoder().encode(content);
  const scan = await import('jsqr').then(module => module.default).catch(() =>
    fail('无法加载扫码验证器。请刷新页面后重试。', 'The scan verifier could not load. Refresh the page and try again.'));
  signal.throwIfAborted();
  const verify = ({ data, width, height }: ImageData) => {
    try {
      const decoded = scan(data, width, height, { inversionAttempts: 'dontInvert' });
      return decoded?.data === content && decoded.binaryData.length === expectedBytes.length &&
        decoded.binaryData.every((byte, i) => byte === expectedBytes[i]);
    } catch {
      fail('扫码验证中断。请重试或减小导出尺寸。', 'Scan verification was interrupted. Try again or use a smaller export size.');
    }
  };
  let files = await rasterizeQr(artwork, signal, verify);
  if (!files && mode.kind === 'artistic' && !fallback) {
    fallback = { reason: 'decode' };
    files = await rasterizeQr(renderStandard(), signal, verify);
  }
  if (!files) fail(
    '未能读回原文。请增大导出尺寸、缩短内容或提高颜色对比度。',
    'The original text could not be read back. Try a larger size, shorter content or higher contrast.');
  return { ...files, size, fallback };
}
