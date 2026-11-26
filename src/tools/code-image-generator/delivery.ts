import { batchTime } from '../file-naming';
import { fail, MiB } from '../general/bounds';
import { inspectImage } from '../image/inspect-image';
import { languageForFile, type OutputFormat } from './settings';

export const maxSourceBytes = 12 * MiB;
const backgroundLimits = { bytes: 24 * MiB, pixels: 24_000_000, edge: 8192, files: 1, totalBytes: 24 * MiB };
const stem = (input: string, extension: boolean) => {
  const basename = extension ? input.replace(/\.[a-z\d]{1,12}$/i, '') : input;
  const cleaned = basename.replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/gu, '');
  const utf8 = new TextEncoder();
  let size = 0, name = '';
  for (const character of cleaned) {
    size += utf8.encode(character).length;
    if (size > 150) break;
    name += character;
  }
  name = name.replace(/[.\s]+$/gu, '');
  return /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name) ? '_' + name : name;
};

export function createCodeNamer() {
  const counts = new Map<string, number>();
  return (title: string, file: string, format: OutputFormat, now = new Date()) => {
    const stamp = batchTime(now).replace(/(\d{6})(\d{3})$/, '$1-$2');
    const count = (counts.get(stamp) ?? 0) + 1;
    counts.set(stamp, count);
    const sourceTitle = title === file || languageForFile(title) !== 'text' || /\.(txt|text)$/i.test(title);
    const base = stem(title, sourceTitle) || stem(file, true) || 'code';
    return `${base}-${stamp}${count > 1 ? '-' + count : ''}.${format === 'jpeg' ? 'jpg' : format}`;
  };
}

export async function readCode(file: File) {
  if (file.size > maxSourceBytes) fail('源码文件超过 12 MiB。可将所需片段粘贴到编辑区。', 'The source file exceeds 12 MiB. Paste a smaller excerpt into the editor.');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()).replace(/\r\n?/g, '\n');
  } catch {
    fail('无法读取文件。请选择 UTF-8 源码。', 'Could not read the file. Choose UTF-8 source code.');
  }
}

export async function readBackground(file: File) {
  try {
    const info = await inspectImage(file, backgroundLimits.bytes, backgroundLimits);
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const width = info.orientation >= 5 ? info.height : info.width;
    const height = info.orientation >= 5 ? info.width : info.height;
    if (bitmap.width === width && bitmap.height === height && (info.format !== 'webp' || info.orientation === 1)) return bitmap;
    bitmap.close();
  } catch {
    // Report one actionable message for unsupported formats, decoding and limits.
  }
  fail('无法读取背景图片。请选择 24 MiB、2400 万像素以内的 PNG、JPEG、WebP 或 AVIF。',
    'Could not read the background. Use a PNG, JPEG, WebP or AVIF within 24 MiB and 24 megapixels.');
}
