// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, it, expect, vi } from 'vitest';
import { readMetadata } from '../src/tools/exif-metadata/read-metadata';
import { MetadataSession } from '../src/tools/exif-metadata/session';
import { desktopImageLimits as limits } from '../src/tools/image/limits';
import { cleanImageMetadata } from '../src/tools/image/metadata';
import { ImageResources } from '../src/tools/image/resources';
import { inspectImage } from '../src/tools/image/inspect-image';

const fixture = async (name: string) => new Blob([await readFile(new URL(`./fixtures/images/${name}`, import.meta.url))]);
describe('EXIF read and lossless clean integration', () => {
  it.each(['jpg', 'png', 'webp'])('reads bounded TIFF fields from the validated %s container and verifies cleanup', async ext => {
    const input = await fixture(`metadata/private.${ext}`), beforeBytes = new Uint8Array(await input.arrayBuffer());
    const before = await readMetadata(input, limits);
    expect(before.blocks).toContain('EXIF');
    expect(before.fields.some(field => field.key === 'Orientation')).toBe(true);
    expect(before.fields.find(field => field.key === 'Make')?.value).toBe('C2A_TEST_CAMERA');
    expect(before.fields.find(field => field.key === 'GPSLatitude')).toMatchObject({value: '1, 2, 3', private: true});
    const clean = await cleanImageMetadata(input, limits.bytes, limits);
    const after = await readMetadata(clean.blob, limits);
    expect(after.fields.every(field => field.key === 'Orientation')).toBe(true);
    expect(after.fields.some(field => field.private)).toBe(false);
    expect(new Uint8Array(await input.arrayBuffer())).toEqual(beforeBytes);
    const info = await inspectImage(clean.blob, limits.bytes, limits);
    expect([info.format, info.width, info.height, info.orientation]).toEqual([clean.info.format, clean.info.width, clean.info.height, clean.info.orientation]);
  });
  it('does not manufacture camera or GPS fields for a plain image', async () => {
    const metadata = await readMetadata(await fixture('transparent.png'), limits);
    expect(metadata.fields).toEqual([]); expect(metadata.blocks).toEqual([]);
  });
  it('rejects invalid files before parsing untrusted payloads', async () => {
    await expect(readMetadata(await fixture('truncated.png'), limits)).rejects.toThrow();
  });
  it('releases late decodes and never restores a removed source', async () => {
    let resolve!: (bitmap: ImageBitmap) => void;
    const close = vi.fn(), bitmap = {width: 80, height: 48, close} as unknown as ImageBitmap;
    vi.spyOn(ImageResources.prototype, 'bitmap').mockImplementation(() => new Promise(r => {resolve = r;}));
    const source = new File([await fixture('transparent.png')], 'image.png');
    const session = new MetadataSession(limits);
    session.import(source);
    while (!resolve) await new Promise(r => setTimeout(r, 1));
    session.clear(); resolve(bitmap);
    while (session.jobs.active) await new Promise(r => setTimeout(r, 1));
    expect(session.snapshot().source).toBeUndefined(); expect(close).toHaveBeenCalledOnce();
    expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
    session.dispose();
  });
});
