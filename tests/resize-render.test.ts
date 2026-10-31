// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  loadSource,
  renderCrop,
  type Output,
} from '../src/tools/image-resize-crop/render';
import { ImageResources } from '../src/tools/image/resources';
import { mobileImageLimits as limits } from '../src/tools/image/limits';
import type { ImageSource } from '../src/tools/image/types';

const crop = { x: 2, y: 3, width: 40, height: 24 };
const output: Output = {
  width: 20,
  height: 12,
  format: 'png',
  quality: 85,
  background: '#123456',
};
async function setup(failure?: string) {
  const png = new Blob(
    [await readFile('tests/fixtures/images/transparent.png')],
    { type: 'image/png' },
  );
  const source: ImageSource = {
    file: new File([png], 'transparent.png'),
    blob: png,
    width: 80,
    height: 48,
    info: { format: 'png', width: 80, height: 48, orientation: 1 },
  };
  const resources = new ImageResources();
  const draw = vi.fn((..._args: unknown[]) => {
    if (failure === 'draw') throw new Error('draw');
  });
  const fill = vi.fn();
  const context = { drawImage: draw, fillRect: fill, fillStyle: '' };
  const close = vi.fn();
  vi.spyOn(resources, 'bitmap').mockImplementation(
    async () => ({ width: 80, height: 48, close }) as unknown as ImageBitmap,
  );
  const canvas = {
    width: 20,
    height: 12,
    getContext: () => (failure === 'context' ? null : context),
    toBlob: (callback: BlobCallback) => {
      if (failure === 'throw') throw new Error('native');
      callback(failure === 'empty' ? null : png);
    },
  } as unknown as HTMLCanvasElement;
  vi.spyOn(resources, 'canvas').mockReturnValue(canvas);
  return { source, resources, draw, fill, close, canvas, context, png };
}
describe('single-pass crop rendering with real output inspection, mocked native boundaries', () => {
  it('allows nearest-output-pixel rounding for tiny thumbnails and still verifies actual output', async () => {
    const { source, resources, draw } = await setup();
    await expect(
      renderCrop(
        source,
        { x: 0, y: 0, width: 80, height: 48 },
        { ...output, width: 2, height: 1 },
        resources,
        limits,
      ),
    ).rejects.toMatchObject({ code: 'output' });
    expect(draw.mock.calls[0]?.slice(1)).toEqual([0, 0, 80, 48, 0, 0, 2, 1]);
  });
  it('draws directly from the oriented source in one crop+scale call and rejects wrong output dimensions', async () => {
    const { source, resources, draw, close, canvas } = await setup();
    await expect(
      renderCrop(source, crop, output, resources, limits),
    ).rejects.toMatchObject({ code: 'output' });
    expect(draw.mock.calls[0]?.slice(1)).toEqual([2, 3, 40, 24, 0, 0, 20, 12]);
    expect(close).toHaveBeenCalledOnce();
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });
  it('performs actual PNG header, dimensions and complete decode verification', async () => {
    const { source, resources, png, draw, close } = await setup();
    const result = await renderCrop(
      source,
      { x: 0, y: 0, width: 80, height: 48 },
      { ...output, width: 80, height: 48 },
      resources,
      limits,
    );
    expect(result.type).toBe('image/png');
    expect(result.size).toBe(png.size);
    expect(draw).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledTimes(2);
  });
  it('composites the chosen JPEG background before drawing and rejects PNG fallback', async () => {
    const { source, resources, fill, draw, context } = await setup();
    await expect(
      renderCrop(
        source,
        crop,
        { ...output, format: 'jpeg' },
        resources,
        limits,
      ),
    ).rejects.toMatchObject({ code: 'output' });
    expect(context.fillStyle).toBe('#123456');
    expect(fill).toHaveBeenCalledWith(0, 0, 20, 12);
    expect(fill.mock.invocationCallOrder[0]).toBeLessThan(
      draw.mock.invocationCallOrder[0]!,
    );
  });
  it.each(['context', 'draw', 'empty', 'throw'])(
    'releases owned native resources after %s failure',
    async (failure) => {
      const { source, resources, close, canvas } = await setup(failure);
      await expect(
        renderCrop(source, crop, output, resources, limits),
      ).rejects.toBeDefined();
      expect(close).toHaveBeenCalledOnce();
      expect(resources.canvasesReleased).toBe(1);
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
    },
  );
  it('validates oriented dimensions before using crop coordinates', async () => {
    const { source, resources, draw, close } = await setup();
    const oriented = {
      ...source,
      info: { format: 'jpeg' as const, width: 48, height: 80, orientation: 6 },
    };
    // Native bitmap is already oriented to 80x48. No second rotation is applied.
    await renderCrop(
      oriented,
      { x: 0, y: 0, width: 80, height: 48 },
      { ...output, width: 80, height: 48 },
      resources,
      limits,
    );
    expect(draw.mock.calls[0]?.slice(1)).toEqual([0, 0, 80, 48, 0, 0, 80, 48]);
    expect(close).toHaveBeenCalledTimes(2);
  });
  it('creates an oriented bounded import preview and releases it on serialization failure', async () => {
    const { source, resources, close, canvas } = await setup('empty');
    await expect(
      loadSource(source.file, resources, limits),
    ).rejects.toMatchObject({ code: 'encode' });
    expect(close).toHaveBeenCalledTimes(2);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });
  it('rejects crop/target budget violations before allocating a decode', async () => {
    const { source, resources } = await setup();
    await expect(
      renderCrop(source, { ...crop, x: 100 }, output, resources, limits),
    ).rejects.toBeDefined();
    await expect(
      renderCrop(source, crop, { ...output, width: 100000 }, resources, limits),
    ).rejects.toBeDefined();
    expect(resources.bitmap).not.toHaveBeenCalled();
  });
});
