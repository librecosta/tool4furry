import { createQrMatrix, QrMatrixError } from '../../tools/qr-code-generator/matrix/qr-matrix';
import { FusionError, limits, makeLayout, methods, outputSizes, prepareTones, renderFusion,
  type Issue, type Method, type Parameters } from './fusion';

export const conditions = ['native', 'half', 'quarter', 'blur07', 'blur12', 'jpeg70'] as const;
type Condition = (typeof conditions)[number];
type ScanStatus = 'pass' | 'fail' | 'error' | 'skipped';
export type Scan = { condition: Condition; status: ScanStatus; milliseconds: number };
export type RunRequest = { source: Blob; sourceName: string; options: Parameters };
export type FusionResult = {
  method: Method;
  png: Blob;
  detail: Blob;
  mae: number;
  renderMs: number;
  scans: Scan[];
};
export type RunResult = {
  image: { name: string; width: number; height: number };
  source: Blob;
  options: Parameters;
  matrix: { size: number; version: number; modulePx: number; quietZone: number };
  detail: { start: number; size: number };
  results: FusionResult[];
  processingMs: number;
};
export type RunMessage = { result: RunResult } | { issue: Issue };

function canvas(size: number) {
  const surface = new OffscreenCanvas(size, size);
  const ctx = surface.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!ctx) throw new FusionError('browser');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  return { surface, ctx };
}

async function load(source: Blob) {
  if (source.size > limits.fileBytes) throw new FusionError('fileSize');
  const signature = new Uint8Array(await source.slice(0, 12).arrayBuffer());
  const matches = (prefix: number[], offset = 0) => prefix.every((byte, i) => signature[offset + i] === byte);
  if (!matches([137, 80, 78, 71, 13, 10, 26, 10]) && !matches([255, 216, 255]) &&
      !(matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8))) throw new FusionError('fileType');
  try {
    return await createImageBitmap(source);
  } catch {
    throw new FusionError('image');
  }
}

const roundMs = (value: number) => Math.round(value * 10) / 10;
async function scanVariants(surface: OffscreenCanvas, original: ImageData, text: string, decoder: typeof import('jsqr').default) {
  const expected = new TextEncoder().encode(text);
  const reports: Scan[] = [];
  for (const condition of conditions) {
    const start = performance.now();
    let status: ScanStatus = 'error';
    let bitmap: ImageBitmap | undefined;
    try {
      let frame = original;
      if (condition !== 'native') {
        const divisor = condition === 'half' ? 2 : condition === 'quarter' ? 4 : 1;
        const size = Math.max(1, Math.round(surface.width / divisor));
        const { surface: copy, ctx } = canvas(size);
        if (condition === 'blur07' || condition === 'blur12') {
          if (!('filter' in ctx)) {
            reports.push({ condition, status: 'skipped', milliseconds: 0 });
            continue;
          }
          ctx.filter = condition === 'blur07' ? 'blur(0.7px)' : 'blur(1.2px)';
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(surface, 0, 0, size, size);
        if (condition === 'jpeg70') {
          const blob = await copy.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
          if (blob.type !== 'image/jpeg') {
            reports.push({ condition, status: 'skipped', milliseconds: roundMs(performance.now() - start) });
            continue;
          }
          bitmap = await createImageBitmap(blob);
          ctx.drawImage(bitmap, 0, 0);
        }
        frame = ctx.getImageData(0, 0, size, size);
      }
      const decoded = decoder(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
      status = decoded?.data === text && decoded.binaryData.length === expected.length &&
        decoded.binaryData.every((byte, index) => byte === expected[index]) ? 'pass' : 'fail';
    } catch {
      status = 'error';
    } finally {
      bitmap?.close();
    }
    reports.push({ condition, status, milliseconds: roundMs(performance.now() - start) });
  }
  return reports;
}

async function run({ source, sourceName, options }: RunRequest): Promise<RunResult> {
  const start = performance.now();
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new FusionError('browser');
  if (!options.content.trim() || options.content.length > limits.contentLength) throw new FusionError('content');
  if (!outputSizes.some(size => size === options.size)) throw new FusionError('density');
  const matrix = createQrMatrix({ content: options.content, qr: { errorCorrectionLevel: options.ecc } });
  const layout = makeLayout(options.size, matrix);
  const bitmap = await load(source);
  const image = { name: sourceName, width: bitmap.width, height: bitmap.height };
  const sourceSurface = canvas(layout.symbolPx);
  try {
    if (bitmap.width * bitmap.height > limits.imagePixels) throw new FusionError('imageSize');
    const crop = Math.min(bitmap.width, bitmap.height);
    const ctx = sourceSurface.ctx;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, Math.floor((bitmap.width - crop) / 2), Math.floor((bitmap.height - crop) / 2),
      crop, crop, 0, 0, layout.symbolPx, layout.symbolPx);
  } finally {
    bitmap.close();
  }
  const pixels = { size: layout.symbolPx, data: sourceSurface.ctx.getImageData(0, 0, layout.symbolPx, layout.symbolPx).data };
  const toneSize = matrix.size * layout.sub;
  const toneCanvas = canvas(toneSize);
  toneCanvas.ctx.imageSmoothingQuality = 'high';
  toneCanvas.ctx.drawImage(sourceSurface.surface, 0, 0, toneSize, toneSize);
  const tones = prepareTones({ size: toneSize, data: toneCanvas.ctx.getImageData(0, 0, toneSize, toneSize).data }, options);
  const jsQR = (await import('jsqr')).default;
  const { surface, ctx } = canvas(options.size);
  const detailSize = layout.modulePx * 7;
  const detailStart = layout.start + Math.floor((matrix.size - 7) / 2) * layout.modulePx;
  const detail = canvas(detailSize);
  const results: FusionResult[] = [];
  for (const method of methods) {
    const renderStart = performance.now();
    const output = renderFusion(pixels, tones, matrix, layout, options, method);
    const frame = new ImageData(output.data, output.size);
    ctx.putImageData(frame, 0, 0);
    const renderMs = roundMs(performance.now() - renderStart);
    const scans = await scanVariants(surface, frame, options.content, jsQR);
    detail.ctx.drawImage(surface, detailStart, detailStart, detailSize, detailSize, 0, 0, detailSize, detailSize);
    results.push({ method, renderMs, scans, mae: Math.round(output.mae * 100) / 100,
      png: await surface.convertToBlob({ type: 'image/png' }), detail: await detail.surface.convertToBlob({ type: 'image/png' }) });
  }
  return {
    image, source, options,
    matrix: { size: matrix.size, version: (matrix.size - 17) / 4, modulePx: layout.modulePx, quietZone: matrix.quietZoneModules },
    detail: { start: detailStart, size: detailSize },
    results, processingMs: roundMs(performance.now() - start),
  };
}

self.addEventListener('message', (event: MessageEvent<RunRequest>) => {
  const send = (message: RunMessage) => self.postMessage(message);
  void run(event.data).then(result => send({ result }), error => {
    const issue = error instanceof FusionError ? error.issue : error instanceof QrMatrixError &&
      (error.code === 'capacity' || error.code === 'content') ? error.code : 'processing';
    send({ issue });
  });
});
