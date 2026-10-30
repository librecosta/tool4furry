// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { inspectImage, type ImagePart } from '../src/tools/image/inspect-image';
import { cleanImageMetadata, metadataPolicy } from '../src/tools/image/metadata';
import { decodeChecked, prepareQuickOutput, validateOutput, orientedSize } from '../src/tools/image/browser-codec';
import { ImageResources } from '../src/tools/image/resources';
import { imageBudget } from '../src/tools/image/types';

const sample = async (name: string) => new Blob([await readFile(new URL(`./fixtures/images/${name}`, import.meta.url))]);
async function parts(blob: Blob) {
  const entries: ImagePart[] = [];
  await inspectImage(blob, imageBudget.bytes, imageBudget, async (_, p) => { entries.push(p); });
  return entries;
}
const raw = async (b: Blob, p: ImagePart) => new Uint8Array(await b.slice(p.data, p.data + p.length).arrayBuffer());
async function payload(blob: Blob) {
  const spans = await parts(blob), out: BlobPart[] = [];
  let previous = 2;
  for (const p of spans) {
    if (p.format === 'jpeg') {
      out.push(blob.slice(previous, p.start)); // entropy, including FF00/restarts
      if (!(typeof p.type === 'number' && (p.type >= 0xe0 && p.type <= 0xef || p.type === 0xfe))) out.push(blob.slice(p.start, p.end));
      previous = p.end;
    } else if (['IHDR', 'IDAT', 'PLTE', 'tRNS', 'VP8 ', 'VP8L', 'ALPH'].includes(p.type as string)) out.push(blob.slice(p.start, p.end));
  }
  if (spans[0].format === 'jpeg') out.push(blob.slice(previous));
  return new Uint8Array(await new Blob(out).arrayBuffer());
}
async function icc(blob: Blob) {
  const spans = (await parts(blob)).filter(p => ['iCCP', 'ICCP', 0xe2].includes(p.type));
  return new Uint8Array(await new Blob(spans.map(p => blob.slice(p.data, p.data + p.length))).arrayBuffer());
}
async function withOrientation(blob: Blob, orientation: number) {
  let p: ImagePart | undefined;
  for (const part of await parts(blob)) {
    if (part.type === 'eXIf' || part.type === 'EXIF' || part.type === 0xe1 && Buffer.from(await raw(blob, part)).subarray(0, 6).toString() === 'Exif\0\0') { p = part; break; }
  }
  if (!p) throw new Error('fixture has no EXIF');
  const data = await raw(blob, p), off = data[0] === 69 ? 6 : 0;
  const v = new DataView(data.buffer), little = data[off] === 73;
  const start = off + v.getUint32(off + 4, little);
  for (let n = v.getUint16(start, little), t = start + 2; n--; t += 12) {
    if (v.getUint16(t, little) === 274) v.setUint16(t + 8, orientation, little);
  }
  const wrapped = p.format === 'png' ? pngChunk('eXIf', data) : p.format === 'webp' ? webpChunk('EXIF', data) : jpegSegment(0xe1, data);
  return new Blob([blob.slice(0, p.start), wrapped, blob.slice(p.end)]);
}
function pngChunk(type: string, data: Uint8Array) {
  const b = new Uint8Array(data.length + 12), v = new DataView(b.buffer);
  v.setUint32(0, data.length); b.set(Buffer.from(type), 4); b.set(data, 8);
  let crc = -1;
  for (const x of b.subarray(4, b.length - 4)) { crc ^= x; for (let i = 0; i < 8; i++) crc = crc & 1 ? crc >>> 1 ^ 0xedb88320 : crc >>> 1; }
  v.setUint32(b.length - 4, (crc ^ -1) >>> 0); return b;
}
function jpegSegment(marker: number, data: Uint8Array) {
  const b = new Uint8Array(data.length + 4); b.set([255, marker]); new DataView(b.buffer).setUint16(2, data.length + 2); b.set(data, 4); return b;
}
function webpChunk(type: string, data: Uint8Array) {
  const b = new Uint8Array(8 + data.length + data.length % 2); b.set(Buffer.from(type)); new DataView(b.buffer).setUint32(4, data.length, true); b.set(data, 8); return b;
}
async function insert(blob: Blob, p: number, bytes: Uint8Array) { return new Blob([blob.slice(0, p), bytes as Uint8Array<ArrayBuffer>, blob.slice(p)]); }

describe('privacy-v1 lossless containers', () => {
  it.each(['jpg', 'png', 'webp'] as const)('strips private %s fields, preserves coding/ICC, is immutable and idempotent', async ext => {
    const input = await sample(`metadata/private.${ext}`), before = new Uint8Array(await input.arrayBuffer());
    const result = await cleanImageMetadata(input);
    expect(result.changed).toBe(true); expect(result.metadataPolicy).toBe(metadataPolicy);
    expect(await payload(result.blob)).toEqual(await payload(input));
    expect(await icc(result.blob)).toEqual(await icc(input));
    expect(new Uint8Array(await input.arrayBuffer())).toEqual(before);
    expect(await result.blob.text()).not.toContain('C2A_TEST_');
    const ps = await parts(result.blob);
    expect(ps.some(p => ['tEXt', 'zTXt', 'iTXt', 'XMP ', 0xed, 0xfe].includes(p.type))).toBe(false);
    const exif = ps.find(p => ['eXIf', 'EXIF', 0xe1].includes(p.type));
    if (ext === 'webp') expect(exif).toBeUndefined();
    else expect(exif!.length).toBe(ext === 'jpg' ? 32 : 26); // only Orientation; no GPS/IFD chains
    const again = await cleanImageMetadata(result.blob);
    expect(again.changed).toBe(false); expect(again.blob).toBe(result.blob);
  });
  it.each(['static.jpg', 'progressive.jpg', 'transparent.png', 'static.webp'])('permits audited byte passthrough: %s', async name => {
    const b = await sample(name), result = await cleanImageMetadata(b);
    expect(result.blob).toBe(b); expect(result.changed).toBe(false);
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('keeps JPEG direction %i for baseline and progressive/multiple scans', async orientation => {
    const privateJPEG = await sample('metadata/private.jpg');
    const metadata = (await parts(privateJPEG)).filter(p => [0xe1, 0xe2, 0xed, 0xfe].includes(p.type as number));
    for (const b of [privateJPEG, new Blob([(await sample('progressive.jpg')).slice(0, 2), ...metadata.map(p => privateJPEG.slice(p.start, p.end)), (await sample('progressive.jpg')).slice(2)])]) {
      const src = await withOrientation(b, orientation), result = await cleanImageMetadata(src);
      expect(result.info.orientation).toBe(orientation);
      expect(await payload(result.blob)).toEqual(await payload(src));
      expect(await icc(result.blob)).toEqual(await icc(src));
      const exif = (await parts(result.blob)).filter(p => p.type === 0xe1);
      expect(exif.length).toBe(orientation === 1 ? 0 : 1);
      if (exif.length) expect(exif[0].length).toBe(32);
    }
  });
  it('cleans metadata between progressive scans without interpreting entropy as markers', async () => {
    const b = await sample('progressive.jpg'), spans = await parts(b);
    expect(spans.filter(p => p.type === 0xda).length).toBeGreaterThan(1);
    const between = spans.find(p => p.start > spans.find(x => x.type === 0xda)!.end)!;
    const src = await insert(b, between.start, jpegSegment(0xfe, Buffer.from('C2A_TEST_between_scans')));
    const out = await cleanImageMetadata(src);
    expect(await payload(out.blob)).toEqual(await payload(b));
    expect(await out.blob.text()).not.toContain('C2A_TEST_');
  });
  it('removes JFIF thumbnails, recognizes Photoshop IPTC, and refuses unknown APP/C2PA carriers', async () => {
    const b = await sample('static.jpg'), jfif = (await parts(b)).find(p => p.type === 0xe0)!;
    const data = await raw(b, jfif); data[12] = data[13] = 1;
    const src = new Blob([b.slice(0, jfif.start), jpegSegment(0xe0, Buffer.concat([data, Buffer.from([13, 24, 35])])), b.slice(jfif.end)]);
    const result = await cleanImageMetadata(src);
    expect(await payload(result.blob)).toEqual(await payload(b));
    expect(result.blob.size).toBe(b.size);
    for (const marker of [0xe3, 0xeb, 0xef]) await expect(cleanImageMetadata(await insert(b, 2, jpegSegment(marker, Buffer.from('unreviewed'))))).rejects.toMatchObject({ code: 'metadata' });
  });
  it('refuses broken ICC sequences, invalid profiles and truncated segments', async () => {
    const b = await sample('metadata/private.jpg'), p = (await parts(b)).find(p => p.type === 0xe2)!;
    const data = await raw(b, p); data[13] = 2;
    await expect(cleanImageMetadata(new Blob([b.slice(0, p.start), jpegSegment(0xe2, data), b.slice(p.end)]))).rejects.toMatchObject({ code: 'metadata' });
    data[13] = 1; data[14 + 36] ^= 1;
    await expect(cleanImageMetadata(new Blob([b.slice(0, p.start), jpegSegment(0xe2, data), b.slice(p.end)]))).rejects.toMatchObject({ code: 'metadata' });
    await expect(cleanImageMetadata(b.slice(0, b.size - 1))).rejects.toBeDefined();
  });
  it('keeps PNG palette/transparency and rejects bad CRC, duplicate color chunks, unknown chunks and inflate bombs', async () => {
    const b = await sample('transparent.png'), damaged = new Uint8Array(await b.arrayBuffer()); damaged[29] ^= 1;
    await expect(cleanImageMetadata(new Blob([damaged]))).rejects.toMatchObject({ code: 'corrupt' });
    const gamma = pngChunk('gAMA', new Uint8Array([0, 0, 177, 143]));
    await expect(cleanImageMetadata(await insert(b, 33, Buffer.concat([gamma, gamma])))).rejects.toMatchObject({ code: 'metadata' });
    const unknown = await insert(b, 33, pngChunk('vpAg', Buffer.from('C2A_TEST_opaque')));
    await expect(cleanImageMetadata(unknown)).rejects.toMatchObject({ code: 'metadata' });
    const compressed = deflateSync(new Uint8Array(2 * 1024 * 1024));
    const bomb = await insert(b, 33, pngChunk('iCCP', Buffer.concat([Buffer.from('sRGB\0\0'), compressed])));
    await expect(cleanImageMetadata(bomb)).rejects.toMatchObject({ code: 'metadata' });
    const text = pngChunk('tEXt', Buffer.from('Author\0C2A_TEST_author'));
    const palette = await sample('metadata/palette.png');
    const result = await cleanImageMetadata(await insert(palette, 33, text));
    expect(await payload(result.blob)).toEqual(await payload(palette));
    expect((await parts(result.blob)).some(p => p.type === 'tRNS')).toBe(true);
  });
  it('preserves lossy/lossless WebP transparency and updates RIFF flags/length', async () => {
    for (const name of ['alpha-lossy.webp', 'alpha-lossless.webp']) {
      const src = await sample('metadata/' + name), result = await cleanImageMetadata(src);
      expect(result.changed).toBe(true);
      expect(await payload(result.blob)).toEqual(await payload(src));
      expect(await icc(result.blob)).toEqual(await icc(src));
      const b = new Uint8Array(await result.blob.arrayBuffer());
      expect(new DataView(b.buffer).getUint32(4, true)).toBe(b.length - 8);
      expect(b[20] & 0x1c).toBe(0x10); // alpha remains, EXIF/XMP gone
    }
  });
  it.each([2, 3, 4, 5, 6, 7, 8])('refuses WebP direction %i before decode (including dimension-preserving mirrors)', async o => {
    const src = await withOrientation(await sample('metadata/private.webp'), o);
    await expect(cleanImageMetadata(src)).rejects.toMatchObject({ code: 'orientation' });
    const info = await inspectImage(src), resources = new ImageResources();
    await expect(decodeChecked(src, info, resources)).rejects.toMatchObject({ code: 'orientation' });
    expect(resources.bitmapsCreated).toBe(0);
  });
  it('rejects WebP mismatched feature bits, non-zero padding and unknown chunks', async () => {
    const src = await sample('metadata/private.webp'), b = new Uint8Array(await src.arrayBuffer()); b[20] &= ~8;
    await expect(cleanImageMetadata(new Blob([b]))).rejects.toMatchObject({ code: 'metadata' });
    const chunk = webpChunk('ZZZZ', Buffer.from([1])); chunk[chunk.length - 1] = 1;
    const body = new Blob([src.slice(8), chunk]), size = new Uint8Array(4); new DataView(size.buffer).setUint32(0, body.size, true);
    await expect(cleanImageMetadata(new Blob([Buffer.from('RIFF'), size, body]))).rejects.toMatchObject({ code: 'corrupt' });
    chunk[chunk.length - 1] = 0;
    await expect(cleanImageMetadata(new Blob([src.slice(0, 4), size, src.slice(8), chunk]))).rejects.toMatchObject({ code: 'metadata' });
  });
  it('bounds all input reads; source/output byte and structure budgets still apply', async () => {
    const src = await sample('metadata/private.png'), reads: number[] = [];
    const counted = { size: src.size, slice(start: number, end?: number) { const part = src.slice(start, end), read = part.arrayBuffer.bind(part); part.arrayBuffer = () => { reads.push(part.size); return read(); }; return part; } } as Blob;
    await cleanImageMetadata(counted);
    expect(Math.max(...reads)).toBeLessThanOrEqual(65536);
    await expect(cleanImageMetadata(src, src.size - 1)).rejects.toMatchObject({ code: 'bytes' });
    await expect(cleanImageMetadata(await sample('animated.webp'))).rejects.toBeDefined();
  });
  it('validates lossless orientation separately from encoded output and closes decode resources', async () => {
    const blob = (await sample('metadata/private.jpg')).slice(0, undefined, 'image/jpeg'), info = await inspectImage(blob);
    const resources = new ImageResources();
    const bitmap = { ...orientedSize(info), close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    const quick = await prepareQuickOutput({ file: new File([blob], 'private.jpg'), blob, info, ...orientedSize(info) }, resources);
    expect(quick.kind).toBe('cleaned'); expect(quick.info.orientation).toBe(6);
    expect(resources.bitmapsCreated).toBe(resources.bitmapsClosed);
    await expect(validateOutput(quick.blob, 'jpeg', 160, 256, resources)).rejects.toMatchObject({ code: 'output' });
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});
