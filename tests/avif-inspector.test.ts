// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { inspectImage } from '../src/tools/image/inspect-image';
import { inspectAvif, qualifyCanvasAvif } from '../src/tools/image/inspect-avif';
import { desktopImageLimits, mobileImageLimits } from '../src/tools/image/limits';

const fixture = async (name: string) => new Blob([await readFile(new URL(`./fixtures/images/avif/${name}.avif`, import.meta.url))]);
const modify = async (blob: Blob, fn: (a: Buffer) => void) => { const a = Buffer.from(await blob.arrayBuffer()); fn(a); return new Blob([a]); };
describe('restricted static SDR AVIF containers + real reduced-still AV1 sequence', () => {
  it.each(['encoder-sdr', 'encoder-alpha'])('qualifies known Canvas sRGB %s without encoding or changing AV1 bytes', async name => {
    const raw = await fixture(name);
    await expect(inspectImage(raw)).rejects.toMatchObject({ code: 'avifVariant' });
    const blob = await qualifyCanvasAvif(raw, desktopImageLimits);
    const info = await inspectImage(blob, desktopImageLimits.bytes, desktopImageLimits);
    expect(info.format).toBe('avif'); expect(info.orientation).toBe(1);
    expect((await blob.arrayBuffer()).byteLength).toBe(raw.size);
    const a = Buffer.from(await raw.arrayBuffer()), b = Buffer.from(await blob.arrayBuffer());
    expect(a.subarray(a.indexOf('mdat') + 4)).toEqual(b.subarray(b.indexOf('mdat') + 4));
    await expect(inspectAvif(blob, desktopImageLimits, true)).resolves.toEqual(info);
  });
  it('accepts bounded EXIF/XMP source items; rejects them as an output privacy proof', async () => {
    const b = await fixture('private');
    expect(await inspectImage(b)).toMatchObject({ format: 'avif', width: 256, height: 160, orientation: 1 });
    await expect(inspectAvif(b, desktopImageLimits, true)).rejects.toMatchObject({ code: 'avifVariant' });
  });
  it('reads container rotation exactly once and refuses output transforms', async () => {
    const b = await fixture('rotated');
    expect(await inspectImage(b)).toMatchObject({ width: 256, height: 160, orientation: 6 });
    await expect(inspectAvif(b, desktopImageLimits, true)).rejects.toBeDefined();
  });
  it('refuses real multi-frame AVIF instead of decoding only its first frame', async () => {
    await expect(inspectImage(await fixture('animated'))).rejects.toMatchObject({ code: 'animated' });
  });
  it.each(['truncated', 'huge-box', 'zero-box', 'unknown-property', 'high-depth', 'hdr', 'unknown-color', 'no-still-sequence', 'unknown-obu', 'bad-extent'])(
    'fails closed for %s', async kind => {
      const source = await qualifyCanvasAvif(await fixture('encoder-sdr'), desktopImageLimits);
      const bad = await modify(source, a => {
        if (kind === 'truncated') a.writeUInt32BE(a.length + 50, a.indexOf('mdat') - 4);
        if (kind === 'huge-box') a.writeUInt32BE(0xffffffff, 0);
        if (kind === 'zero-box') a.writeUInt32BE(0, 0);
        if (kind === 'unknown-property') a.write('clap', a.indexOf('ispe'));
        if (kind === 'high-depth') a[a.indexOf('av1C') + 6] |= 0x40;
        if (kind === 'hdr') a.writeUInt16BE(16, a.indexOf('nclx') + 6);
        if (kind === 'unknown-color') a.writeUInt16BE(9, a.indexOf('nclx') + 4);
        if (kind === 'no-still-sequence') a[a.indexOf('mdat') + 8] &= ~8;
        if (kind === 'unknown-obu') a[a.indexOf('mdat') + 4] = 0x2a;
        if (kind === 'bad-extent') a.writeUInt32BE(1, a.indexOf('iloc') + 18);
      });
      await expect(inspectImage(bad)).rejects.toBeDefined();
    },
  );
  it('uses the caller budget before decoding or allocating RGBA', async () => {
    const blob = await qualifyCanvasAvif(await fixture('encoder-alpha'), desktopImageLimits);
    await expect(inspectImage(blob, desktopImageLimits.bytes, { ...mobileImageLimits, edge: 512 })).rejects.toMatchObject({ code: 'dimensions' });
    await expect(inspectImage(blob, 20)).rejects.toMatchObject({ code: 'bytes' });
  });
});
