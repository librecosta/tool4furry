import {
  checkDimensions,
  imageBudget,
  ImageFailure,
  type ImageInfo,
} from './types';
import type { ImageLimits } from './limits';
import { inspectAvif } from './inspect-avif';

const bad = (): never => {
  throw new ImageFailure('corrupt');
};
const text = (a: Uint8Array, start = 0, length = a.length - start) =>
  String.fromCharCode(...a.subarray(start, start + length));
const view = (a: Uint8Array) =>
  new DataView(a.buffer, a.byteOffset, a.byteLength);
const u32 = (a: Uint8Array, at = 0, little = false) =>
  view(a).getUint32(at, little);
const u16 = (a: Uint8Array, at = 0, little = false) =>
  view(a).getUint16(at, little);
const u24 = (a: Uint8Array, at: number) =>
  a[at] + a[at + 1] * 256 + a[at + 2] * 65536;

// At most 64 KiB per IO; skip compressed PNG/WebP payloads. JPEG scan data is read
// incrementally to detect actual markers (never search arbitrary text for animation).
export class Reader {
  private start = -1;
  private cache: Uint8Array = new Uint8Array();
  constructor(readonly blob: Blob) {}
  async read(at: number, length: number): Promise<Uint8Array> {
    if (
      !Number.isSafeInteger(at + length) ||
      at < 0 ||
      length < 0 ||
      at + length > this.blob.size ||
      length > 65536
    )
      bad();
    if (at >= this.start && at + length <= this.start + this.cache.length)
      return this.cache.subarray(at - this.start, at - this.start + length);
    this.start = at;
    this.cache = new Uint8Array(
      await this.blob
        .slice(at, Math.min(this.blob.size, at + Math.max(length, 4096)))
        .arrayBuffer(),
    );
    return this.cache.subarray(0, length);
  }
  async byte(at: number) {
    return (await this.read(at, 1))[0];
  }
  async nextMarker(at: number) {
    while (at < this.blob.size) {
      if (at >= this.start && at < this.start + this.cache.length) {
        const index = this.cache.indexOf(255, at - this.start);
        if (index !== -1) return this.start + index;
        at = this.start + this.cache.length;
        if (at === this.blob.size) break;
      }
      const block = await this.read(at, Math.min(65536, this.blob.size - at));
      const index = block.indexOf(255);
      if (index !== -1) return at + index;
      at += block.length;
    }
    return bad();
  }
}

// The metadata pipeline visits only length/CRC-checked container records. Entropy
// scans stay in this parser; callers never search compressed bytes for metadata.
export type ImagePart = Readonly<{
  format: ImageInfo['format'];
  type: string | number;
  start: number;
  end: number;
  data: number;
  length: number;
}>;
type Visitor = (reader: Reader, part: ImagePart) => Promise<void>;

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
async function pngCRC(r: Reader, at: number, length: number) {
  let crc = 0xffffffff;
  for (let p = at; p < at + length;) {
    const a = await r.read(p, Math.min(65536, at + length - p));
    for (const b of a) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
    p += a.length;
  }
  if ((crc ^ 0xffffffff) >>> 0 !== u32(await r.read(at + length, 4))) bad();
}

// TIFF IFD0 only; thumbnails and arbitrary offset chains are not followed.
export function exifOrientation(bytes: Uint8Array): number {
  const a = text(bytes, 0, 6) === 'Exif\0\0' ? bytes.subarray(6) : bytes;
  if (a.length < 8) bad();
  const little = text(a, 0, 2) === 'II';
  if (!little && text(a, 0, 2) !== 'MM') bad();
  if (u16(a, 2, little) !== 42) bad();
  const offset = u32(a, 4, little);
  if (offset < 8 || offset + 2 > a.length) bad();
  const count = u16(a, offset, little);
  if (offset + 2 + count * 12 + 4 > a.length) bad();
  let found: number | undefined;
  for (let i = 0; i < count; i++) {
    const p = offset + 2 + i * 12;
    if (u16(a, p, little) !== 0x112) continue;
    if (
      found !== undefined ||
      u16(a, p + 2, little) !== 3 ||
      u32(a, p + 4, little) !== 1
    )
      bad();
    found = u16(a, p + 8, little);
    if (found < 1 || found > 8) bad();
  }
  return found ?? 1;
}

async function png(r: Reader, limits: ImageLimits, visit?: Visitor): Promise<ImageInfo> {
  let p = 8,
    count = 0,
    width = 0,
    height = 0,
    data = false,
    endedData = false,
    palette = false,
    color = 0,
    orientation = 1,
    exif = false;
  // Chromium can emit thousands of 8 KiB IDAT chunks for a 16MP PNG.
  // Scale the bounded scan budget with bytes; don't confuse large valid output
  // with a malicious stream of tiny/empty chunks.
  const chunkLimit = 4096 + Math.ceil(r.blob.size / 4096);
  while (p < r.blob.size && ++count <= chunkLimit) {
    const h = await r.read(p, 8),
      length = u32(h),
      type = text(h, 4, 4);
    if (
      !/^[A-Za-z]{4}$/.test(type) ||
      length > 0x7fffffff ||
      p + 12 + length > r.blob.size
    )
      bad();
    if (count === 1 && type !== 'IHDR') bad();
    await pngCRC(r, p + 4, length + 4);
    await visit?.(r, { format: 'png', type, start: p, end: p + length + 12, data: p + 8, length });
    if (type === 'IHDR') {
      if (count !== 1 || length !== 13) bad();
      const a = await r.read(p + 8, 13);
      width = u32(a);
      height = u32(a, 4);
      color = a[9];
      const depths: Record<number, number[]> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (!depths[color]?.includes(a[8]) || a[10] || a[11] || a[12] > 1) bad();
      checkDimensions(width, height, limits);
    } else if (type === 'acTL') {
      if (data || length !== 8 || u32(await r.read(p + 8, 8)) === 0) bad();
      throw new ImageFailure('animated');
    } else if (type === 'fcTL' || type === 'fdAT') {
      // Animation chunks without a valid preceding acTL are not a static image.
      bad();
    } else if (type === 'PLTE') {
      if (palette || data || !length || length > 768 || length % 3) bad();
      palette = true;
    } else if (type === 'IDAT') {
      if (endedData || (color === 3 && !palette)) bad();
      data = true;
    } else if (type === 'IEND') {
      if (length || !data || p + 12 !== r.blob.size) bad();
      return { format: 'png', width, height, orientation };
    } else {
      if (data) endedData = true;
      if (type === 'eXIf') {
        if (exif || length > 65536) bad();
        orientation = exifOrientation(await r.read(p + 8, length));
        exif = true;
      }
      if (type[0] === type[0].toUpperCase()) bad();
    }
    p += length + 12;
  }
  if (count > chunkLimit)
    throw new ImageFailure('corrupt', 'PNG chunk budget exceeded');
  return bad();
}

async function jpeg(r: Reader, limits: ImageLimits, visit?: Visitor): Promise<ImageInfo> {
  let p = 2,
    width = 0,
    height = 0,
    orientation = 1,
    exif = false,
    scan = false,
    count = 0;
  while (p < r.blob.size && ++count <= 8192) {
    const start = p;
    if ((await r.byte(p++)) !== 0xff) bad();
    while ((await r.byte(p)) === 0xff) p++;
    const marker = await r.byte(p++);
    if (marker === 0xd9) {
      if (!scan || !width || p !== r.blob.size) bad();
      return { format: 'jpeg', width, height, orientation };
    }
    if (
      !marker ||
      marker === 0xd8 ||
      marker === 1 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      bad();
    const length = u16(await r.read(p, 2));
    if (length < 2 || p + length > r.blob.size) bad();
    await visit?.(r, { format: 'jpeg', type: marker, start, end: p + length, data: p + 2, length: length - 2 });
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (width || length < 8) bad();
      const a = await r.read(p + 2, length - 2);
      if (a[0] !== 8 || ![1, 3, 4].includes(a[5]) || length !== 8 + a[5] * 3)
        bad();
      height = u16(a, 1);
      width = u16(a, 3);
      checkDimensions(width, height, limits);
    } else if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      throw new ImageFailure('unsupported');
    } else if (
      marker === 0xe1 &&
      length >= 8 &&
      text(await r.read(p + 2, 6)) === 'Exif\0\0'
    ) {
      if (exif) bad();
      orientation = exifOrientation(await r.read(p + 2, length - 2));
      exif = true;
    } else if (
      marker === 0xe2 &&
      length >= 6 &&
      text(await r.read(p + 2, 4)) === 'MPF\0'
    ) {
      throw new ImageFailure('unsupported');
    }
    p += length;
    if (marker === 0xda) {
      if (!width || length < 6) bad();
      scan = true;
      // Entropy-coded scans escape FF as FF00. Restart markers stay in the scan.
      while (p < r.blob.size) {
        p = await r.nextMarker(p);
        let q = p + 1;
        while ((await r.byte(q)) === 0xff) q++;
        const next = await r.byte(q);
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) {
          p = q + 1;
          continue;
        }
        break;
      }
    }
  }
  return bad();
}

async function webp(r: Reader, limits: ImageLimits, visit?: Visitor): Promise<ImageInfo> {
  if (u32(await r.read(4, 4), 0, true) + 8 !== r.blob.size) bad();
  let p = 12,
    count = 0,
    width = 0,
    height = 0,
    cw = 0,
    ch = 0,
    extended = false,
    alpha = false,
    orientation = 1,
    exif = false;
  while (p < r.blob.size && ++count <= 4096) {
    const h = await r.read(p, 8),
      type = text(h, 0, 4),
      length = u32(h, 4, true);
    const end = p + 8 + length + (length % 2);
    if (end > r.blob.size || (length % 2 && (await r.byte(end - 1)) !== 0))
      bad();
    await visit?.(r, { format: 'webp', type, start: p, end, data: p + 8, length });
    if (count === 1 && !['VP8X', 'VP8 ', 'VP8L'].includes(type)) bad();
    if (type === 'VP8X') {
      if (count !== 1 || length !== 10) bad();
      const a = await r.read(p + 8, 10);
      if (a[0] & 0x02) throw new ImageFailure('animated');
      if (a[0] & 0xc1 || a[1] || a[2] || a[3]) bad();
      extended = true;
      cw = u24(a, 4) + 1;
      ch = u24(a, 7) + 1;
      checkDimensions(cw, ch, limits);
    } else if (type === 'ANIM' || type === 'ANMF') {
      throw new ImageFailure('animated');
    } else if (type === 'ALPH') {
      if (!extended || width || alpha || !length) bad();
      alpha = true;
    } else if (type === 'VP8 ' || type === 'VP8L') {
      if (width || length < (type === 'VP8 ' ? 10 : 5)) bad();
      const a = await r.read(p + 8, type === 'VP8 ' ? 10 : 5);
      if (type === 'VP8 ') {
        if (a[0] & 1 || a[3] !== 0x9d || a[4] !== 1 || a[5] !== 0x2a) bad();
        width = u16(a, 6, true) & 0x3fff;
        height = u16(a, 8, true) & 0x3fff;
      } else {
        if (alpha || a[0] !== 0x2f || a[4] >> 5) bad();
        const bits = u32(a, 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      checkDimensions(width, height, limits);
      if (extended && (cw !== width || ch !== height)) bad();
    } else if (type === 'EXIF') {
      if (!extended || exif || length > 65536) bad();
      orientation = exifOrientation(await r.read(p + 8, length));
      exif = true;
    } else if (!extended) bad();
    p = end;
  }
  if (!width || p !== r.blob.size || count > 4096) bad();
  return { format: 'webp', width, height, orientation };
}

export async function inspectImage(
  blob: Blob,
  maxBytes: number = imageBudget.bytes,
  limits: ImageLimits = imageBudget,
  visit?: Visitor,
): Promise<ImageInfo> {
  if (!blob.size) throw new ImageFailure('empty');
  if (blob.size > maxBytes) throw new ImageFailure('bytes');
  const r = new Reader(blob),
    header = await r.read(0, Math.min(blob.size, 12));
  if (header.length >= 8 && text(header, 4, 4) === 'ftyp')
    return inspectAvif(blob, limits);
  if (
    header.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => header[i] === b)
  )
    return png(r, limits, visit);
  if (header[0] === 255 && header[1] === 216) return jpeg(r, limits, visit);
  if (
    header.length === 12 &&
    text(header, 0, 4) === 'RIFF' &&
    text(header, 8, 4) === 'WEBP'
  )
    return webp(r, limits, visit);
  throw new ImageFailure('unsupported');
}
