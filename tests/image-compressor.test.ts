import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage, outputSize, quickSettings, recommendedSettings, sameCompressionSettings, validSettings } from '../src/tools/image-compressor/compress';
import { decodeChecked, toBlob, validateOutput } from '../src/tools/image/browser-codec';
import { ImageResources } from '../src/tools/image/resources';
import { desktopImageLimits as limits, mobileImageLimits } from '../src/tools/image/limits';
import { qualifyCanvasAvif } from '../src/tools/image/inspect-avif';
import type { AvifEncoder } from '../src/tools/image/avif-encoder';
import type { ImageSource } from '../src/tools/image/types';

vi.mock('../src/tools/image/browser-codec', () => ({decodeChecked: vi.fn(), toBlob: vi.fn(), validateOutput: vi.fn()}));
vi.mock('../src/tools/image/inspect-avif', () => ({qualifyCanvasAvif: vi.fn(async blob => blob)}));
const source: ImageSource = {file: new File([new Uint8Array(4000)], 'picture.png'), blob: new Blob(['pixels']), width: 100, height: 50, info: {format: 'png', width: 100, height: 50, orientation: 1}};
let resources: ImageResources, canvas: HTMLCanvasElement, context: {drawImage: ReturnType<typeof vi.fn>; fillRect: ReturnType<typeof vi.fn>; fillStyle: string};
beforeEach(() => {
  resources = new ImageResources();
  context = {drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: ''};
  canvas = {width: 100, height: 50, getContext: () => context} as unknown as HTMLCanvasElement;
  vi.spyOn(resources, 'canvas').mockReturnValue(canvas);
  vi.mocked(decodeChecked).mockResolvedValue({width: 100, height: 50, close: vi.fn()} as unknown as ImageBitmap);
  vi.mocked(toBlob).mockImplementation(async (_canvas, mime, quality) => new Blob([new Uint8Array(Math.round((quality ?? 1) * 10000))], {type: mime}));
  vi.mocked(validateOutput).mockImplementation(async blob => blob);
});
describe('bounded compression and original-aspect geometry', () => {
  it('never upscales and rounds even extreme ratios to at least one pixel', () => {
    expect(outputSize({width: 1200, height: 800}, 600)).toEqual({width: 600, height: 400});
    expect(outputSize({width: 100, height: 50}, 600)).toEqual({width: 100, height: 50});
    expect(outputSize({width: 10000, height: 1}, 1)).toEqual({width: 1, height: 1});
    for (const bad of [0, -1, 1.2, Infinity, 10001]) expect(() => outputSize(source, bad)).toThrow();
  });
  it('rejects invalid targets, quality, formats, backgrounds and resource sizes', () => {
    for (const change of [{targetBytes: 0}, {targetBytes: Infinity}, {targetBytes: 129 * 1024 ** 2}, {quality: 0}, {quality: 80.1}, {background: 'transparent'}, {longestEdge: -1}, {format: 'gif'}])
      expect(validSettings({...recommendedSettings, ...change} as typeof recommendedSettings)).toBe(false);
  });
  it('draws the original exactly once then finds a sampled fitting quality in at most eight encodes', async () => {
    const result = await compressImage(source, {...recommendedSettings, mode: 'target', targetBytes: 2048}, resources, limits, () => true);
    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(expect.anything(), 0, 0, 100, 50);
    expect(result.blob.size).toBeLessThanOrEqual(2048);
    expect(result.quality).toBeGreaterThanOrEqual(19);
    expect(result.attempts).toBeLessThanOrEqual(8);
    expect(result.targetMet).toBe(true);
    expect(validateOutput).toHaveBeenCalledExactlyOnceWith(result.blob, 'webp', 100, 50, resources, limits);
    expect(resources.canvasesReleased).toBe(1); expect(resources.bitmapsClosed).toBe(1);
  });
  it('returns actual unmet and larger results without silently resizing or changing format', async () => {
    vi.mocked(toBlob).mockImplementation(async (_canvas, mime) => new Blob([new Uint8Array(9000)], {type: mime}));
    const result = await compressImage(source, {...recommendedSettings, mode: 'target', targetBytes: 1024}, resources, limits, () => true);
    expect(result).toMatchObject({width: 100, height: 50, format: 'webp', targetMet: false, saved: -5000});
    expect(result.attempts).toBe(2);
  });
  it('keeps PNG explicit, encodes once and refuses unsupported target searches', async () => {
    const result = await compressImage(source, {...recommendedSettings, format: 'png'}, resources, limits, () => true);
    expect(result.format).toBe('png'); expect(result.targetMet).toBe(true); expect(result.attempts).toBe(1);
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(canvas, 'image/png', undefined);
    for (const format of ['png', 'avif'] as const) expect(validSettings({...recommendedSettings, format, mode: 'target'})).toBe(false);
  });
  it('composites JPEG transparency using the chosen background and preserves requested dimensions', async () => {
    const result = await compressImage(source, {...recommendedSettings, format: 'jpeg', longestEdge: 40, background: '#123456'}, resources, limits, () => true);
    expect(context.fillStyle).toBe('#123456'); expect(context.fillRect).toHaveBeenCalledWith(0, 0, 40, 20);
    expect(result).toMatchObject({width: 40, height: 20, format: 'jpeg'});
  });
  it('rejects a browser encoder MIME fallback and closes its resources', async () => {
    vi.mocked(toBlob).mockResolvedValue(new Blob(['not webp'], {type: 'image/png'}));
    await expect(compressImage(source, recommendedSettings, resources, limits, () => true)).rejects.toMatchObject({code: 'output'});
    expect(validateOutput).not.toHaveBeenCalled(); expect(resources.canvasesReleased).toBe(1);
  });
  it('waits for noninterruptible native work, then discards a stale result', async () => {
    let finish!: (blob: Blob) => void, current = true;
    vi.mocked(toBlob).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const job = compressImage(source, recommendedSettings, resources, limits, () => current);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    current = false; finish(new Blob(['webp'], {type: 'image/webp'}));
    await expect(job).rejects.toMatchObject({code: 'cancelled'});
    expect(resources.canvasesReleased).toBe(1); expect(validateOutput).not.toHaveBeenCalled();
  });
  it('maps strength per format and treats irrelevant quality/target drafts as non-substantive', () => {
    for (const [format, balanced] of [['jpeg', 88], ['webp', 85], ['avif', 55]] as const) {
      expect(quickSettings(format, 'balanced').quality).toBe(balanced);
      expect(quickSettings(format, 'strong').quality).toBeLessThan(balanced);
      expect(quickSettings(format, 'light').quality).toBeGreaterThan(balanced);
    }
    expect(sameCompressionSettings(recommendedSettings, {...recommendedSettings, targetBytes: 1024})).toBe(true);
    expect(sameCompressionSettings({...recommendedSettings, format: 'png'}, {...recommendedSettings, format: 'png', quality: 1})).toBe(true);
    expect(sameCompressionSettings(recommendedSettings, {...recommendedSettings, quality: 50})).toBe(false);
  });
  it('rejects unsupported devices and AVIF output budgets before native decode', async () => {
    vi.stubGlobal('Worker', class {});
    const settings = quickSettings('avif', 'balanced');
    await expect(compressImage(source, settings, resources, mobileImageLimits, () => true)).rejects.toMatchObject({code: 'avifDevice'});
    for (const size of [{width: 4097, height: 1}, {width: 2048, height: 2049}])
      await expect(compressImage({...source, ...size}, settings, resources, limits, () => true)).rejects.toMatchObject({code: 'avifBudget'});
    expect(decodeChecked).not.toHaveBeenCalled();
  });
  it('draws once with explicit resizing and routes AVIF through qualification and output validation', async () => {
    vi.stubGlobal('Worker', class {});
    const getImageData = vi.fn(() => ({data: new Uint8ClampedArray(16)}));
    Object.assign(context, {getImageData});
    const encode = vi.fn(async () => new ArrayBuffer(64)), operation = {avif: {encode} as unknown as AvifEncoder, signal: new AbortController().signal};
    const result = await compressImage(source, {...quickSettings('avif', 'balanced'), longestEdge: 40}, resources, limits, () => true, operation);
    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(expect.anything(), 0, 0, 40, 20);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 40, 20);
    expect(encode).toHaveBeenCalledWith(expect.any(ArrayBuffer), 40, 20, 55, false, operation.signal);
    expect(qualifyCanvasAvif).toHaveBeenCalledOnce();
    expect(validateOutput).toHaveBeenCalledWith(expect.objectContaining({type: 'image/avif'}), 'avif', 40, 20, resources, limits);
    expect(result).toMatchObject({format: 'avif', attempts: 1, width: 40, height: 20});
    expect(toBlob).not.toHaveBeenCalled();
    expect(resources.canvasesReleased).toBe(1); expect(resources.bitmapsClosed).toBe(1);
  });
});
