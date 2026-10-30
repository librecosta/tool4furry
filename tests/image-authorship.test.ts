// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { sourceAuthorship, readAuthorshipTIFF, attachAuthorship, verifyAuthorshipOutput } from '../src/tools/image/authorship';
import { cleanImageMetadata, jpegSegment, pngChunk } from '../src/tools/image/metadata';
import { inspectImage, type ImagePart } from '../src/tools/image/inspect-image';
import { validateOutput, orientedSize } from '../src/tools/image/browser-codec';
import { ImageResources } from '../src/tools/image/resources';
import { imageBudget, mime } from '../src/tools/image/types';

const sample = async (name: string) => new Blob([await readFile(new URL(`./fixtures/images/${name}`, import.meta.url))]);
async function parts(blob: Blob) {
  const all: ImagePart[] = [];
  await inspectImage(blob, imageBudget.bytes, imageBudget, async (_, p) => { all.push(p); }); return all;
}
async function fields(blob: Blob) {
  for (const p of await parts(blob)) {
    if (p.type === 0xe1 || p.type === 'eXIf' || p.type === 'EXIF') {
      const a = new Uint8Array(await blob.slice(p.data, p.data + p.length).arrayBuffer());
      return readAuthorshipTIFF(a.subarray(p.type === 0xe1 ? 6 : 0));
    }
  } return {};
}
async function payloads(blob: Blob) {
  const spans = await parts(blob);
  return Promise.all(spans.filter(p => ['IDAT', 'VP8 ', 'VP8L', 'ALPH', 'iCCP', 'ICCP', 0xe2].includes(p.type))
    .map(async p => new Uint8Array(await blob.slice(p.start, p.end).arrayBuffer())));
}

describe('bounded author-rights-v1 (fresh IFD0, never copy source EXIF)', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('writes and independently audits %s; coding/color bytes and source remain intact', async format => {
    const source = await sample('metadata/private.jpg'), original = await source.arrayBuffer();
    const expected = await sourceAuthorship(source, imageBudget);
    expect(expected.artist).toContain('C2A_TEST_'); expect(expected.copyright).toContain('C2A_TEST_');
    let base = (await cleanImageMetadata(await sample(format === 'jpeg' ? 'static.jpg' : format === 'png' ? 'metadata/private.png' : 'metadata/private.webp'))).blob;
    if (format === 'png') {
      const old = (await parts(base)).find(p => p.type === 'eXIf');
      if (old) base = new Blob([base.slice(0, old.start), base.slice(old.end)]);
    }
    // Native re-encoding has applied Orientation already; no old Orientation is written.
    const info = await inspectImage(base);
    const out = await attachAuthorship(base, format, expected, info.width, info.height);
    expect(await fields(out)).toEqual(expected);
    expect(await payloads(out)).toEqual(await payloads(base));
    if (format === 'jpeg') {
      const exif = (await parts(out)).find(p => p.type === 0xe1)!;
      expect(await new Blob([out.slice(0, exif.start), out.slice(exif.end)]).arrayBuffer()).toEqual(await base.arrayBuffer());
    }
    await verifyAuthorshipOutput(out, format, expected, imageBudget);
    vi.stubGlobal('createImageBitmap', vi.fn(async (blob: Blob) => ({ ...orientedSize(await inspectImage(blob)), close() {} })));
    const resources = new ImageResources();
    const typed = new Blob([out], { type: mime[format] });
    expect(await validateOutput(typed, format, info.width, info.height, resources, imageBudget, expected)).toBe(typed);
    const text = await out.text();
    for (const secret of ['C2A_TEST_DEVICE', 'C2A_TEST_TIME', 'C2A_TEST_GPS', 'C2A_TEST_XMP', 'C2A_TEST_IPTC']) expect(text).not.toContain(secret);
    expect(await source.arrayBuffer()).toEqual(original);
    expect((await inspectImage(out)).orientation).toBe(1);
  });
  it.each(['jpeg', 'png', 'webp'] as const)('rejects extra fields, wrong whitelist, and corrupt %s containers', async format => {
    const base = (await cleanImageMetadata(await sample(format === 'jpeg' ? 'static.jpg' : format === 'png' ? 'transparent.png' : 'static.webp'))).blob;
    const info = await inspectImage(base), expected = { artist: 'Allowed Artist', copyright: 'Allowed Copyright' };
    const out = await attachAuthorship(base, format, expected, info.width, info.height);
    await expect(verifyAuthorshipOutput(out, format, { artist: 'different' }, imageBudget)).rejects.toThrow();
    const corrupt = new Uint8Array(await out.arrayBuffer()); corrupt[format === 'png' ? 41 : 4] ^= 1;
    await expect(verifyAuthorshipOutput(new Blob([corrupt]), format, expected, imageBudget)).rejects.toThrow();
    let extra: Blob;
    if (format === 'jpeg') extra = new Blob([out.slice(0, 2), jpegSegment(0xfe, new TextEncoder().encode('GPS_PRIVATE')), out.slice(2)]);
    else if (format === 'png') extra = new Blob([out.slice(0, 33), pngChunk('tEXt', new TextEncoder().encode('Author\0PRIVATE')), out.slice(33)]);
    else {
      const bytes = new Uint8Array(await out.arrayBuffer()), added = new Uint8Array([88,77,80,32,2,0,0,0,65,66]);
      bytes[20] |= 4; new DataView(bytes.buffer).setUint32(4, bytes.length + added.length - 8, true); extra = new Blob([bytes, added]);
    }
    await expect(verifyAuthorshipOutput(extra, format, expected, imageBudget)).rejects.toThrow();
  });
  it('retains only the two fields for JPEG Orientation 1–8 and baseline/progressive containers', async () => {
    const original = await sample('metadata/private.jpg');
    const expected = await sourceAuthorship(original, imageBudget);
    const exif = (await parts(original)).filter(p => p.type === 0xe1).at(-1)!;
    const a = new Uint8Array(await original.slice(exif.data, exif.data + exif.length).arrayBuffer()), v = new DataView(a.buffer);
    const little = a[6] === 73, at = 6 + v.getUint32(10, little);
    for (const name of ['static.jpg', 'progressive.jpg']) for (let direction = 1; direction <= 8; direction++) {
      for (let n = v.getUint16(at, little), p = at + 2; n--; p += 12) if (v.getUint16(p, little) === 274) v.setUint16(p + 8, direction, little);
      const base = await sample(name), source = new Blob([base.slice(0, 2), jpegSegment(0xe1, a), base.slice(2)]);
      expect(await sourceAuthorship(source, imageBudget)).toEqual(expected);
    }
  });
  it('bounds TIFF offsets/counts/duplicates/text; empty JPEG fields are honest no-ops', async () => {
    const base = await sample('static.jpg'); expect(await sourceAuthorship(base, imageBudget)).toEqual({});
    await expect(sourceAuthorship(await sample('transparent.png'), imageBudget)).rejects.toMatchObject({ code: 'metadataSource' });
    for (const value of ['中文', 'a'.repeat(1024), 'line\nfeed', 'hidden\0artist']) await expect(attachAuthorship(base, 'jpeg', { artist: value }, 4, 3)).rejects.toMatchObject({ code: 'metadataFields' });
    const out = await attachAuthorship(base, 'jpeg', { artist: 'A', copyright: 'Copyright' }, 4, 3);
    const p = (await parts(out)).find(p => p.type === 0xe1)!, good = new Uint8Array(await out.slice(p.data + 6, p.data + p.length).arrayBuffer());
    for (const mutate of [(v: DataView) => v.setUint32(4, 0xfffffff0, true), (v: DataView) => v.setUint16(8, 257, true), (v: DataView) => v.setUint16(22, 0x13b, true), (v: DataView) => v.setUint32(30, 0xfffffff0, true)]) {
      const a = good.slice(); mutate(new DataView(a.buffer)); expect(() => readAuthorshipTIFF(a)).toThrow();
    }
    expect(await attachAuthorship(base, 'jpeg', {}, 4, 3)).toBe(base);
  });
  it.each(['metadata/alpha-lossy.webp', 'metadata/alpha-lossless.webp', 'metadata/palette.png'])('preserves Alpha/palette/color chunks and validates flags/CRC: %s', async name => {
    const base = (await cleanImageMetadata(await sample(name))).blob, info = await inspectImage(base);
    if (info.format === 'avif') throw Error('native fixture');
    const expected = { artist: 'Artist', copyright: 'Photographer\0Editor' };
    const out = await attachAuthorship(base, info.format, expected, info.width, info.height);
    expect(await payloads(out)).toEqual(await payloads(base));
    expect(await fields(out)).toEqual(expected);
    await verifyAuthorshipOutput(out, info.format, expected, imageBudget);
    if (info.format === 'webp') {
      const bytes = new Uint8Array(await out.arrayBuffer());
      expect(bytes[20] & 0x18).toBe(0x18); // EXIF plus unchanged Alpha
      expect(new DataView(bytes.buffer).getUint32(4, true)).toBe(bytes.length - 8);
    }
  });
});
