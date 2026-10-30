import { inspectImage, Reader } from './inspect-image';
import { cleanImageMetadata, jpegSegment, pngChunk } from './metadata';
import { ImageFailure, mime, type NativeImageFormat } from './types';
import type { ImageLimits } from './limits';

export type Authorship = Readonly<{ artist?: string; copyright?: string }>;
const require = (ok: unknown): void => { if (!ok) throw new ImageFailure('metadataFields'); };
const view = (a: Uint8Array) => new DataView(a.buffer, a.byteOffset, a.byteLength);
const ascii = (a: Uint8Array) => String.fromCharCode(...a);

/** IFD0 only, two ASCII fields, <=1 KiB each. Never follow Exif/GPS/IFD1 pointers.
 * Nonstandard text, duplicates and overlapping/invalid offsets fail explicitly. */
export function readAuthorshipTIFF(a: Uint8Array): Authorship {
  require(a.length >= 8 && a.length <= 65536);
  const little = ascii(a.subarray(0, 2)) === 'II', v = view(a);
  require(little || ascii(a.subarray(0, 2)) === 'MM');
  const u16 = (p: number) => v.getUint16(p, little), u32 = (p: number) => v.getUint32(p, little);
  require(u16(2) === 42); const at = u32(4);
  require(at >= 8 && at + 2 <= a.length); const count = u16(at), end = at + 2 + 12 * count + 4;
  require(count <= 256 && end <= a.length);
  const fields: { artist?: string; copyright?: string } = {}, ranges: [number, number][] = [];
  for (let p = at + 2; p < end - 4; p += 12) {
    const tag = u16(p), key = tag === 0x13b ? 'artist' : tag === 0x8298 ? 'copyright' : undefined;
    if (!key) continue;
    require(fields[key] === undefined && u16(p + 2) === 2);
    const n = u32(p + 4), offset = n <= 4 ? p + 8 : u32(p + 8);
    require(n >= 1 && n <= 1024 && offset + n <= a.length);
    if (n > 4) {
      require(offset >= end && ranges.every(([start, finish]) => offset >= finish || offset + n <= start));
      ranges.push([offset, offset + n]);
    }
    const value = a.subarray(offset, offset + n);
    require(value.at(-1) === 0 && value.every(b => b === 0 || b >= 32 && b <= 126));
    const parts = ascii(value.subarray(0, n - 1)).split('\0');
    require(parts.length <= (key === 'copyright' ? 2 : 1));
    fields[key] = parts.join('\0');
  }
  return fields;
}

export async function sourceAuthorship(blob: Blob, limits: ImageLimits): Promise<Authorship> {
  let fields: Authorship = {}, seen = false;
  const info = await inspectImage(blob, limits.bytes, limits, async (r, p) => {
    if (p.format !== 'jpeg' || p.type !== 0xe1 || p.length < 6) return;
    if (ascii(await r.read(p.data, 6)) !== 'Exif\0\0') return;
    require(!seen); seen = true;
    fields = readAuthorshipTIFF(await r.read(p.data + 6, p.length - 6));
  });
  if (info.format !== 'jpeg') throw new ImageFailure('metadataSource');
  return fields;
}

function tiff(fields: Authorship) {
  const entries = [[0x13b, fields.artist], [0x8298, fields.copyright]]
    .filter((e): e is [number, string] => typeof e[1] === 'string' && e[1].length > 0);
  entries.forEach(([, value]) => require(value.length < 1024 && /^[\x20-\x7e\0]*$/.test(value)));
  // Roundtrip the same restricted reader; callers cannot pass arbitrary bytes.
  const base = 8 + 2 + entries.length * 12 + 4;
  const a = new Uint8Array(base + entries.reduce((n, [, value]) => n + value.length + 1, 0)), v = view(a);
  a.set([73, 73, 42, 0, 8, 0, 0, 0]); v.setUint16(8, entries.length, true);
  let offset = base;
  entries.forEach(([tag, value], i) => {
    const p = 10 + i * 12, data = new TextEncoder().encode(value + '\0');
    require(data.length <= 1024); v.setUint16(p, tag, true); v.setUint16(p + 2, 2, true); v.setUint32(p + 4, data.length, true);
    if (data.length <= 4) a.set(data, p + 8);
    else { v.setUint32(p + 8, offset, true); a.set(data, offset); offset += data.length; }
  });
  readAuthorshipTIFF(a); return entries.length ? a : undefined;
}

/** Called only after normal encoding and default privacy validation. No old EXIF
 * or Orientation is copied. Only a freshly built IFD0 can be attached. */
export async function attachAuthorship(blob: Blob, format: NativeImageFormat, fields: Authorship, width: number, height: number) {
  const data = tiff(fields); if (!data) return blob;
  if (format === 'jpeg') {
    const exif = new Uint8Array(data.length + 6); exif.set([69, 120, 105, 102, 0, 0]); exif.set(data, 6);
    // Keep an existing leading JFIF APP0 first. The base has already passed the
    // bounded JPEG parser; its length/offset cannot come from unchecked input.
    const head = await new Reader(blob).read(2, 4);
    const at = head[0] === 255 && head[1] === 224 ? 4 + view(head).getUint16(2) : 2;
    return new Blob([blob.slice(0, at), jpegSegment(0xe1, exif), blob.slice(at)], { type: mime.jpeg });
  }
  if (format === 'png') return new Blob([blob.slice(0, 33), pngChunk('eXIf', data), blob.slice(33)], { type: mime.png });
  const r = new Reader(blob), first = ascii(await r.read(12, 4));
  let body: BlobPart[];
  if (first === 'VP8X') body = [blob.slice(12, 20), new Uint8Array([(await r.byte(20)) | 8]), blob.slice(21)];
  else {
    require(first === 'VP8 ' || first === 'VP8L');
    const ext = new Uint8Array(18); ext.set([86, 80, 56, 88, 10]);
    ext[8] = 8 | (first === 'VP8L' && ((await r.byte(24)) & 16) ? 16 : 0);
    for (let i = 0; i < 3; i++) { ext[12 + i] = (width - 1) >>> (8 * i); ext[15 + i] = (height - 1) >>> (8 * i); }
    body = [ext, blob.slice(12)];
  }
  const chunk = new Uint8Array(8 + data.length + data.length % 2); chunk.set([69, 88, 73, 70]); view(chunk).setUint32(4, data.length, true); chunk.set(data, 8);
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const payload = new Blob([...body, chunk]); view(header).setUint32(4, payload.size + 4, true);
  return new Blob([header, payload], { type: mime.webp });
}

async function equal(a: Blob, b: Blob) {
  if (a.size !== b.size) return false;
  for (let p = 0; p < a.size; p += 65536) {
    const x = new Uint8Array(await a.slice(p, p + 65536).arrayBuffer()), y = new Uint8Array(await b.slice(p, p + 65536).arrayBuffer());
    if (!x.every((v, i) => v === y[i])) return false;
  }
  return true;
}

/** Independent container/CRC/flags audit by the default cleaner, then compare
 * canonical reconstruction byte-for-byte. Extra EXIF/XMP/text/unknown fields,
 * altered whitelist values or stale Orientation cannot pass this policy. */
export async function verifyAuthorshipOutput(blob: Blob, format: NativeImageFormat, fields: Authorship, limits: ImageLimits) {
  const clean = await cleanImageMetadata(blob, limits.pixels * 5 + 1024 ** 2, limits);
  require(clean.info.format === format && clean.info.orientation === 1);
  const expected = await attachAuthorship(clean.blob, format, fields, clean.info.width, clean.info.height);
  require(await equal(blob, expected));
  return { blob, info: clean.info };
}
