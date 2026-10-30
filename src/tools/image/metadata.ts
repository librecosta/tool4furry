import { exifOrientation, inspectImage, type ImagePart, type Reader } from './inspect-image';
import { imageBudget, ImageFailure, mime, type ImageInfo } from './types';
import type { ImageLimits } from './limits';

// Explicit output contracts; no store here. Results carry the effective revision
// through download/ZIP eligibility. The default privacy contract is unchanged.
export const metadataPolicy = 'privacy-v1' as const;
export const authorshipPolicy = 'author-rights-v1' as const;
export type MetadataPolicy = typeof metadataPolicy | typeof authorshipPolicy;
const unsupported = (): never => { throw new ImageFailure('metadata'); };
const assert = (ok: unknown): void => { if (!ok) unsupported(); };
const text = (a: Uint8Array, at = 0, length = a.length - at) =>
  String.fromCharCode(...a.subarray(at, at + length));
const view = (a: Uint8Array) => new DataView(a.buffer, a.byteOffset, a.byteLength);
const u32 = (a: Uint8Array, at = 0) => view(a).getUint32(at);
const u16 = (a: Uint8Array, at = 0) => view(a).getUint16(at);
const maxICC = 1024 * 1024;
type Edit = { start: number; end: number; bytes?: Uint8Array<ArrayBuffer> };

// Only a small, structurally valid RGB/gray ICC is retained; this is not a color
// transform or a promise to remove arbitrary private strings inside profiles.
function validateICC(a: Uint8Array, space: 'RGB ' | 'GRAY') {
  assert(a.length >= 132 && a.length <= maxICC);
  assert(u32(a) === a.length && text(a, 36, 4) === 'acsp');
  assert([2, 4].includes(a[8]) && text(a, 16, 4) === space);
  assert(['mntr', 'scnr', 'prtr', 'spac'].includes(text(a, 12, 4)));
  assert(['XYZ ', 'Lab '].includes(text(a, 20, 4)));
  const count = u32(a, 128), tableEnd = 132 + count * 12;
  assert(count > 0 && count <= 128 && tableEnd <= a.length);
  const tags = new Set<string>();
  for (let p = 132; p < tableEnd; p += 12) {
    const tag = text(a, p, 4), offset = u32(a, p + 4), size = u32(a, p + 8);
    assert(!tags.has(tag) && offset % 4 === 0 && offset >= tableEnd && size >= 8 && offset + size <= a.length);
    tags.add(tag);
  }
}
async function bytes(r: Reader, at: number, length: number) {
  assert(length > 0 && length <= maxICC);
  const out = new Uint8Array(length);
  for (let p = 0; p < length; p += 65536)
    out.set(await r.read(at + p, Math.min(65536, length - p)), p);
  return out;
}
async function inflateICC(a: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') unsupported();
  const reader = new Blob([a as Uint8Array<ArrayBuffer>]).stream()
    .pipeThrough(new DecompressionStream('deflate')).getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      assert(size <= maxICC);
      chunks.push(next.value);
    }
  } catch { unsupported(); }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const out = new Uint8Array(size); let p = 0;
  for (const chunk of chunks) { out.set(chunk, p); p += chunk.length; }
  return out;
}
function orientationTIFF(orientation: number) {
  const a = new Uint8Array(26), v = view(a);
  a.set([73, 73, 42, 0, 8, 0, 0, 0, 1, 0]);
  v.setUint16(10, 274, true); v.setUint16(12, 3, true);
  v.setUint32(14, 1, true); v.setUint16(18, orientation, true);
  return a;
}
export function pngChunk(type: string, data: Uint8Array) {
  const a = new Uint8Array(data.length + 12), v = view(a);
  v.setUint32(0, data.length); a.set([...type].map(c => c.charCodeAt(0)), 4); a.set(data, 8);
  let crc = 0xffffffff;
  for (const b of a.subarray(4, a.length - 4)) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  v.setUint32(a.length - 4, (crc ^ 0xffffffff) >>> 0);
  return a;
}
export function jpegSegment(marker: number, data: Uint8Array) {
  const a = new Uint8Array(data.length + 4);
  a.set([255, marker]); view(a).setUint16(2, data.length + 2); a.set(data, 4);
  return a;
}

async function plan(blob: Blob, maxBytes: number, limits: ImageLimits) {
  const edits: Edit[] = [];
  const remove = (p: ImagePart) => edits.push({ start: p.start, end: p.end });
  const replace = async (r: Reader, p: ImagePart, replacement: Uint8Array<ArrayBuffer>) => {
    // Canonical minimal EXIF is already clean: repeated validation is idempotent.
    const same = p.end - p.start === replacement.length &&
      (await r.read(p.start, replacement.length)).every((b, i) => b === replacement[i]);
    if (!same) edits.push({ start: p.start, end: p.end, bytes: replacement });
  };
  const seen = new Set<string>();
  const once = (type: string) => { assert(!seen.has(type)); seen.add(type); };
  let color = 0, depth = 8, palette = 0, image = false, flags = 0, alpha = false;
  let vp8x: ImagePart | undefined;
  let components = 0, iccCount = 0, iccBytes = 0;
  const iccParts = new Map<number, Uint8Array>();
  const info = await inspectImage(blob, maxBytes, limits, async (r, p) => {
    const { type, data, length } = p;
    if (p.format === 'jpeg') {
      const m = type as number;
      if ([0xc0, 0xc1, 0xc2].includes(m)) {
        components = (await r.read(data, 6))[5];
        assert(components === 1 || components === 3); // CMYK/YCCK needs separate evidence.
      } else if (m === 0xe0) {
        const a = await r.read(data, Math.min(length, 14));
        if (text(a, 0, 5) === 'JFIF\0') {
          assert(length >= 14 && a[5] === 1 && a[6] <= 2 && a[7] <= 2 && length === 14 + a[12] * a[13] * 3);
          if (a[12] || a[13]) { const b = a.slice(0, 14); b[12] = b[13] = 0; await replace(r, p, jpegSegment(m, b)); }
        } else if (text(a, 0, 5) === 'JFXX\0') remove(p); // embedded thumbnail
        else unsupported();
      } else if (m === 0xe1) {
        const a = await r.read(data, Math.min(length, 40));
        if (text(a, 0, 6) === 'Exif\0\0') {
          const orientation = exifOrientation(await r.read(data, length));
          if (orientation === 1) remove(p);
          else {
            const payload = new Uint8Array(32); payload.set([69, 120, 105, 102, 0, 0]); payload.set(orientationTIFF(orientation), 6);
            await replace(r, p, jpegSegment(m, payload));
          }
        } else if (text(a).startsWith('http://ns.adobe.com/xap/1.0/\0') || text(a).startsWith('http://ns.adobe.com/xmp/extension/\0')) remove(p);
        else unsupported();
      } else if (m === 0xe2) {
        const a = await r.read(data, Math.min(length, 14));
        assert(length > 14 && text(a, 0, 12) === 'ICC_PROFILE\0');
        const sequence = a[12], count = a[13];
        assert(count && sequence && sequence <= count && !iccParts.has(sequence) && (!iccCount || iccCount === count));
        iccCount = count; iccBytes += length - 14; assert(iccBytes <= maxICC);
        iccParts.set(sequence, await r.read(data + 14, length - 14));
      } else if (m === 0xed) {
        assert(length >= 14 && text(await r.read(data, 14)) === 'Photoshop 3.0\0'); remove(p);
      } else if (m === 0xfe) remove(p);
      else if (m === 0xee) {
        const a = await r.read(data, length);
        assert(length === 12 && text(a, 0, 5) === 'Adobe' && a[11] <= 1);
      } else if (![0xc4, 0xdb, 0xdd, 0xda].includes(m)) unsupported();
      return;
    }
    const t = type as string;
    if (p.format === 'png') {
      if (['tEXt', 'zTXt', 'iTXt', 'tIME', 'caBX'].includes(t)) { remove(p); return; }
      if (t === 'eXIf') {
        const orientation = exifOrientation(await r.read(data, length));
        if (orientation === 1) remove(p);
        else await replace(r, p, pngChunk(t, orientationTIFF(orientation)));
        return;
      }
      if (t === 'IDAT') { image = true; return; }
      if (t === 'IEND') return;
      once(t);
      if (t === 'IHDR') { const a = await r.read(data, length); depth = a[8]; color = a[9]; return; }
      assert(!image);
      if (t === 'PLTE') { assert(![0, 4].includes(color)); palette = length / 3; assert(color !== 3 || palette <= 2 ** depth); return; }
      if (['gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT'].includes(t)) assert(!palette);
      if (t === 'tRNS') {
        assert(color === 0 ? length === 2 : color === 2 ? length === 6 : color === 3 && palette && length > 0 && length <= palette);
        if (color !== 3) { const a = await r.read(data, length); for (let p = 0; p < length; p += 2) assert(u16(a, p) < 2 ** depth); }
      } else if (t === 'gAMA') assert(length === 4 && u32(await r.read(data, 4)) > 0);
      else if (t === 'cHRM') assert(length === 32);
      else if (t === 'sRGB') assert(!seen.has('iCCP') && length === 1 && (await r.byte(data)) <= 3);
      else if (t === 'iCCP') {
        assert(!seen.has('sRGB') && length <= maxICC);
        const a = await bytes(r, data, length), end = a.indexOf(0), name = a.subarray(0, end);
        assert(end >= 1 && end <= 79 && a[end + 1] === 0 && a.length > end + 3);
        assert(name.every(b => b >= 32 && b <= 126 || b >= 161) && name[0] !== 32 && name.at(-1) !== 32 && !text(name).includes('  '));
        validateICC(await inflateICC(a.subarray(end + 2)), [0, 4].includes(color) ? 'GRAY' : 'RGB ');
      } else if (t === 'sBIT') {
        const expected = [1, 0, 3, 3, 2, 0, 4][color]; assert(length === expected);
        assert((await r.read(data, length)).every(b => b > 0 && b <= (color === 3 ? 8 : depth)));
      } else if (t === 'bKGD') {
        assert(length === (color === 3 ? 1 : [0, 4].includes(color) ? 2 : 6));
        if (color === 3) assert(palette && (await r.byte(data)) < palette);
      } else if (t === 'pHYs') assert(length === 9 && (await r.byte(data + 8)) <= 1);
      else if (t === 'hIST') assert(palette && length === palette * 2);
      else unsupported();
      return;
    }
    // Static WebP: strict feature flags/order, without touching VP8/VP8L/ALPH.
    if (t === 'VP8X') { vp8x = p; flags = await r.byte(data); return; }
    once(t);
    if (t === 'ICCP') { assert(vp8x && !image && !alpha); validateICC(await bytes(r, data, length), 'RGB '); }
    else if (t === 'EXIF' || t === 'XMP ') {
      assert(vp8x && image);
      if (t === 'EXIF' && exifOrientation(await r.read(data, length)) !== 1) throw new ImageFailure('orientation');
      remove(p);
    } else if (t === 'ALPH') { assert(!image && length > 1); const a = await r.byte(data); assert(!(a & 0xc0) && (a & 3) <= 1 && ((a >> 4) & 3) <= 1); alpha = true; }
    else if (t === 'VP8 ' || t === 'VP8L') {
      assert(!image && !seen.has('EXIF') && !seen.has('XMP ')); image = true;
      if (t === 'VP8L') alpha = !!((await r.byte(data + 4)) & 0x10);
    } else unsupported();
  });
  if (info.format === 'avif') unsupported(); // AVIF is always re-encoded, never remuxed here.
  if (info.format === 'jpeg' && iccCount) {
    assert(iccParts.size === iccCount);
    const profile = new Uint8Array(iccBytes); let p = 0;
    for (let i = 1; i <= iccCount; i++) { const part = iccParts.get(i); assert(part); profile.set(part!, p); p += part!.length; }
    validateICC(profile, components === 1 ? 'GRAY' : 'RGB ');
  }
  if (info.format === 'webp' && vp8x) {
    assert(!!(flags & 0x20) === seen.has('ICCP') && !!(flags & 8) === seen.has('EXIF') && !!(flags & 4) === seen.has('XMP ') && !!(flags & 0x10) === alpha);
    if (flags & 12) edits.push({ start: vp8x.data, end: vp8x.data + 1, bytes: new Uint8Array([flags & ~12]) });
  }
  return { info, edits };
}

/** No encoding, no source mutation. Unknown containers fail closed, never fall back. */
export async function cleanImageMetadata(blob: Blob, maxBytes = imageBudget.bytes, limits: ImageLimits = imageBudget) {
  const { info, edits } = await plan(blob, maxBytes, limits);
  if (!edits.length) return { blob, info, changed: false, metadataPolicy };
  edits.sort((a, b) => a.start - b.start);
  const parts: BlobPart[] = []; let p = 0;
  for (const edit of edits) {
    assert(edit.start >= p && edit.end >= edit.start && edit.end <= blob.size);
    parts.push(blob.slice(p, edit.start));
    if (edit.bytes) parts.push(edit.bytes);
    p = edit.end;
  }
  parts.push(blob.slice(p));
  let output = new Blob(parts, { type: mime[info.format] });
  if (info.format === 'webp') {
    const length = new Uint8Array(4); view(length).setUint32(0, output.size - 8, true);
    output = new Blob([output.slice(0, 4), length, output.slice(8)], { type: mime.webp });
  }
  const verified = await plan(output, maxBytes, limits);
  assert(!verified.edits.length && ['format', 'width', 'height', 'orientation'].every(k => verified.info[k as keyof ImageInfo] === info[k as keyof ImageInfo]));
  return { blob: output, info: verified.info, changed: true, metadataPolicy };
}
