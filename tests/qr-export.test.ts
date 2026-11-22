// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateVerifiedQr, rasterizeQr } from '../src/tools/qr-code-generator/art/export';
import { renderQrSvg } from '../src/tools/qr-code-generator/art/render';
import { createQrMatrix } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { createDefaultRecipe } from '../src/tools/qr-code-generator/recipe/defaults';

const { decode } = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock('jsqr', () => ({ default: decode }));

const content = ' 雪🦊 https://example.com/?q=%23&x=1#fragment ';
const recipe = { ...createDefaultRecipe(), content };
const mode = { kind: 'artistic' as const, recipe };
const matrix = createQrMatrix(recipe);
const scanResult = { data: content, binaryData: [...new TextEncoder().encode(content)] };
const draw = vi.fn();
const encode = vi.fn();
const createUrl = vi.fn();
const revokeUrl = vi.fn();

function simulateImageLoad(autoLoad: boolean) {
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement) {
    if (autoLoad) queueMicrotask(() => this.onload?.(new Event('load')));
  });
}

beforeEach(() => {
  decode.mockReset();
  draw.mockReset();
  encode.mockReset().mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  revokeUrl.mockReset();
  createUrl.mockReset().mockReturnValue('blob:svg');
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createUrl;
    static revokeObjectURL = revokeUrl;
  });
  simulateImageLoad(true);
  const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
  const canvas2d: { getContext(type: '2d'): CanvasRenderingContext2D | null } = HTMLCanvasElement.prototype;
  vi.spyOn(canvas2d, 'getContext').mockReturnValue({
    drawImage: draw, getImageData: () => imageData,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(encode);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('verified QR export', () => {
  it('rasterizes the exact delivered SVG from a temporary object URL', async () => {
    decode.mockReturnValue(scanResult);
    const exported = await generateVerifiedQr(matrix, content, 513, mode, new AbortController().signal);
    const source = renderQrSvg(matrix, 513, mode).svg;
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(exported.svg);
    expect(await exported.svg.text()).toBe(source);
    expect(draw).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLImageElement), 0, 0, 513, 513);
    expect(exported.png.type).toBe('image/png');
    expect(exported.fallback).toBeUndefined();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:svg');
    expect(decode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('rejects altered bytes and validates the same matrix in standard style', async () => {
    decode.mockReturnValueOnce({ ...scanResult, binaryData: [0] }).mockReturnValueOnce(scanResult);
    const exported = await generateVerifiedQr(matrix, content, 512, mode, new AbortController().signal);
    expect(await exported.svg.text()).toBe(renderQrSvg(matrix, 512, { kind: 'standard' }).svg);
    expect(exported.fallback).toEqual({ reason: 'decode' });
    expect(decode).toHaveBeenCalledTimes(2);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('checks a dense substitute without creating an unfit artwork image', async () => {
    const denseText = 'x'.repeat(1200);
    decode.mockReturnValue({ data: denseText, binaryData: Array(1200).fill(120) });
    const dense = createQrMatrix({ ...recipe, content: denseText });
    const exported = await generateVerifiedQr(dense, denseText, 513,
      { kind: 'artistic', recipe: { ...recipe, content: denseText } }, new AbortController().signal);
    expect(exported.fallback).toEqual({ reason: 'density', minimum: 830 });
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('fails closed when both scans fail or the decoder throws', async () => {
    decode.mockReturnValue(null);
    await expect(generateVerifiedQr(matrix, content, 512, mode, new AbortController().signal))
      .rejects.toThrow('original text could not be read back');
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(encode).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledTimes(2);
    decode.mockImplementation(() => { throw new Error('library exception'); });
    await expect(generateVerifiedQr(matrix, content, 512, mode, new AbortController().signal))
      .rejects.toThrow('Scan verification was interrupted');
    expect(encode).not.toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledTimes(3);
  });

  it('revokes the source URL if an edit or unmount aborts image loading', async () => {
    simulateImageLoad(false);
    const controller = new AbortController();
    const pending = rasterizeQr(renderQrSvg(matrix, 512, mode), controller.signal, decode);
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:svg');
    expect(draw).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(encode).not.toHaveBeenCalled();
  });
});
