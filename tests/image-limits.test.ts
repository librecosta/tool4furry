// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  desktopImageLimits as desktop,
  mobileImageLimits as mobile,
  resolveImageLimits,
} from '../src/tools/image/limits';
import { checkDimensions, type ImageSource } from '../src/tools/image/types';
import {
  acceptImage,
  decodeChecked,
  encodeImage,
  validateOutput,
} from '../src/tools/image/browser-codec';
import { inspectImage } from '../src/tools/image/inspect-image';
import { ImageResources } from '../src/tools/image/resources';
import {
  ConverterSession,
  type ConverterServices,
} from '../src/tools/image-converter/session';
import { getConverterMessages } from '../src/tools/image-converter/messages';
import { imageConverterContent } from '../src/site/image-converter-content';
const tick = async () => {
  for (let i = 0; i < 80; i++) await Promise.resolve();
};
const png = async () =>
  new Blob([await readFile('tests/fixtures/images/transparent.png')], {
    type: 'image/png',
  });

describe('one image limit contract', () => {
  it('selects a conservative fallback without viewport or hardware scoring', () => {
    expect(resolveImageLimits()).toBe(mobile);
    expect(resolveImageLimits({ mobile: false })).toBe(mobile);
    expect(resolveImageLimits({ mobile: true, coarsePointer: false })).toBe(
      mobile,
    );
    expect(resolveImageLimits({ mobile: false, coarsePointer: true })).toBe(
      mobile,
    );
    expect(
      resolveImageLimits({ userAgent: 'iPad Macintosh', coarsePointer: false }),
    ).toBe(mobile);
    expect(resolveImageLimits({ mobile: false, coarsePointer: false })).toBe(
      desktop,
    );
    expect(
      resolveImageLimits({ userAgent: 'Windows NT', coarsePointer: false }),
    ).toBe(desktop);
    expect(
      resolveImageLimits({ userAgent: 'unknown', coarsePointer: false }),
    ).toBe(mobile);
  });
  it('accepts exact pixel/edge bounds and rejects either excess, including swapped dimensions', () => {
    for (const [limits, w, h] of [
      [desktop, 10000, 4000],
      [mobile, 4000, 4000],
    ] as const) {
      expect(() => checkDimensions(w, h, limits)).not.toThrow();
      expect(() => checkDimensions(h, w, limits)).not.toThrow();
      expect(() => checkDimensions(w, h + 1, limits)).toThrow('dimensions');
      expect(() => checkDimensions(limits.edge, 1, limits)).not.toThrow();
      expect(() => checkDimensions(limits.edge + 1, 1, limits)).toThrow(
        'dimensions',
      );
    }
    expect(() => checkDimensions(8000, 6000, desktop)).toThrow('dimensions');
    expect(() => checkDimensions(0, 1, desktop)).toThrow('corrupt');
  });
  it('enforces explicit input bytes but permits verified output larger than input bounds', async () => {
    const blob = await png();
    const limits = { ...desktop, bytes: blob.size - 1 };
    await expect(
      inspectImage(blob, limits.bytes, limits),
    ).rejects.toMatchObject({ code: 'bytes' });
    const resources = new ImageResources();
    vi.spyOn(resources, 'bitmap').mockResolvedValue({
      width: 80,
      height: 48,
      close: vi.fn(),
    } as unknown as ImageBitmap);
    const close = vi.spyOn(resources, 'close');
    await expect(
      acceptImage(new File([blob], 'image.png'), resources, limits),
    ).rejects.toMatchObject({ code: 'bytes' });
    await expect(
      validateOutput(blob, 'png', 80, 48, resources, limits),
    ).resolves.toBe(blob);
    expect(close).toHaveBeenCalledOnce();
  });
  it('checks bounds before allocating native decode or encoding surfaces', async () => {
    const resources = new ImageResources();
    const bitmap = vi.spyOn(resources, 'bitmap');
    const canvas = vi.spyOn(resources, 'canvas');
    const info = {
      format: 'png',
      width: 10000,
      height: 4000,
      orientation: 1,
    } as const;
    await expect(
      decodeChecked(new Blob(), info, resources, mobile),
    ).rejects.toMatchObject({ code: 'dimensions' });
    await expect(
      encodeImage(
        { info, width: info.width, height: info.height } as ImageSource,
        { format: 'png', quality: null, jpegBackground: '#ffffff' },
        resources,
        mobile,
      ),
    ).rejects.toMatchObject({ code: 'dimensions' });
    expect(bitmap).not.toHaveBeenCalled();
    expect(canvas).not.toHaveBeenCalled();
  });
  it.each([desktop, mobile])(
    'freezes and passes the same limits to all workspace services ($files)',
    async (profile) => {
      const limits = { ...profile };
      const accept = vi.fn<ConverterServices['accept']>(
        async (file: File) =>
          ({
            file,
            blob: file,
            info: { format: 'png', width: 1, height: 1, orientation: 1 },
            width: 1,
            height: 1,
          }) as ImageSource,
      );
      const encode = vi.fn<ConverterServices['encode']>(
        async () => new Blob(['webp'], { type: 'image/webp' }),
      );
      const capabilities = vi.fn<ConverterServices['capabilities']>(
        async () => ({
          png: { supported: true },
          jpeg: { supported: true },
          webp: { supported: true },
        }),
      );
      const session = new ConverterSession(
        () => {},
        { accept, encode, capabilities },
        limits,
      );
      limits.pixels = 1;
      session.start();
      await tick();
      session.add([new File(['png'], 'a.png')]);
      await tick();
      expect(Object.isFrozen(session.limits)).toBe(true);
      expect(session.limits).toEqual(profile);
      expect(capabilities.mock.calls[0][1]).toBe(session.limits);
      expect(accept.mock.calls[0][2]).toBe(session.limits);
      expect(encode.mock.calls[0][3]).toBe(session.limits);
      session.mode('advanced');
      const added = session.add(
        Array.from({ length: profile.files }, () => new File(['png'], 'repeat.png')),
      );
      expect(added).toHaveLength(profile.files - 1);
      expect(session.snapshot.tasks).toHaveLength(profile.files);
      expect(session.snapshot.intake?.rejected.count).toBe(1);
      session.dispose();
    },
  );
  it.each(['zh', 'en'] as const)(
    'renders true profile bounds without internal language (%s)',
    (region) => {
      for (const limits of [desktop, mobile]) {
        const t = getConverterMessages(region, limits);
        expect(t.budget).toContain(String(limits.files));
        expect(t.budget).toContain(`${limits.bytes / 1024 ** 2} MiB`);
        expect(t.errors.dimensions).toContain(String(limits.edge));
        expect(t.intakeReasons.total).toContain(
          `${limits.totalBytes / 1024 ** 2} MiB`,
        );
        expect(JSON.stringify(t)).not.toMatch(
          /开发保护|guardrail|全设备兼容承诺|serial lane/i,
        );
      }
      expect(JSON.stringify(imageConverterContent[region])).not.toMatch(
        /开发保护|guardrail|20 MiB|100 MiB|20 files|20 个/,
      );
    },
  );
});
