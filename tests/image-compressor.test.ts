import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage, outputSize, recommendedSettings, validSettings } from '../src/tools/image-compressor/compress';
import { decodeChecked, toBlob, validateOutput } from '../src/tools/image/browser-codec';
import { ImageResources } from '../src/tools/image/resources';
import { desktopImageLimits as limits } from '../src/tools/image/limits';
import type { ImageSource } from '../src/tools/image/types';

vi.mock('../src/tools/image/browser-codec', () => ({decodeChecked: vi.fn(), toBlob: vi.fn(), validateOutput: vi.fn()}));
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
    for (const change of [{targetBytes: 0}, {targetBytes: Infinity}, {targetBytes: 129 * 1024 ** 2}, {quality: 0}, {quality: 80.1}, {background: 'transparent'}, {longestEdge: -1}, {format: 'avif'}])
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
  it('keeps PNG explicit, encodes once, and does not pretend quality can reach the target', async () => {
    const result = await compressImage(source, {...recommendedSettings, format: 'png', mode: 'target', targetBytes: 1024}, resources, limits, () => true);
    expect(result.format).toBe('png'); expect(result.targetMet).toBe(false); expect(result.attempts).toBe(1);
    expect(toBlob).toHaveBeenCalledExactlyOnceWith(canvas, 'image/png', undefined);
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
});
