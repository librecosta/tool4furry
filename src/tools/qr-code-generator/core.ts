import QRCode from 'qrcode';
import { boundedText, fail } from '../general/bounds';
export function qrMatrix(text: string) {
  boundedText(text, 2000);
  if (!text.trim()) fail('请输入二维码内容。', 'Enter QR code content.');
  try {
    return QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  } catch {
    fail('内容超出二维码容量。', 'Content exceeds QR code capacity.');
  }
}
export function qrSvg(
  text: string,
  size: number,
  foreground: string,
  background: string,
) {
  if (
    !Number.isInteger(size) ||
    size < 128 ||
    size > 2048 ||
    !/^#[a-f\d]{6}$/i.test(foreground) ||
    !/^#[a-f\d]{6}$/i.test(background)
  )
    fail(
      '尺寸须为 128–2048，颜色须为六位 HEX。',
      'Size must be 128–2048; colors must use six-digit HEX.',
    );
  const matrix = qrMatrix(text),
    edge = matrix.size + 8;
  if (Math.floor(size / edge) < 2)
    fail(
      '内容较多，请增加输出尺寸。',
      'Increase output size for this amount of content.',
    );
  let path = '';
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++)
      if (matrix.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
  return {
    matrix,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${edge} ${edge}" shape-rendering="crispEdges"><path fill="${background}" d="M0 0h${edge}v${edge}H0z"/><path fill="${foreground}" d="${path}"/></svg>`,
  };
}
export async function qrPng(
  text: string,
  size: number,
  foreground: string,
  background: string,
) {
  const { matrix, svg } = qrSvg(text, size, foreground, background),
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error();
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = foreground;
    const step = Math.floor(size / (matrix.size + 8)),
      pad = Math.floor((size - step * matrix.size) / 2);
    for (let y = 0; y < matrix.size; y++)
      for (let x = 0; x < matrix.size; x++)
        if (matrix.get(y, x))
          ctx.fillRect(pad + x * step, pad + y * step, step, step);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error())), 'image/png'),
    );
    return { png, svg: new Blob([svg], { type: 'image/svg+xml' }) };
  } finally {
    canvas.width = canvas.height = 1;
  }
}
