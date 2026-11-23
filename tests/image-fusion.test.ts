import { describe, expect, it } from 'vitest';
import { createQrMatrix } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { defaultParameters, makeLayout, methods, prepareTones, quantize, renderFusion } from '../src/lab/image-fusion/fusion';

const matrix = createQrMatrix({ content: ' https://example.com/雪?x=🦊#terrain ', qr: { errorCorrectionLevel: 'H' } });
const layout = makeLayout(385, matrix);
function sample(size: number) {
  return { size, data: Uint8ClampedArray.from({ length: size ** 2 * 4 }, (_, i) => i % 4 === 3 ? 255 : (i * 129 + (i >>> 5)) % 197 + 25) };
}
const source = sample(layout.symbolPx);
const tiny = sample(matrix.size * layout.sub);
const read = (pixels: Uint8ClampedArray, x: number, y: number) =>
  [...pixels.slice((y * layout.size + x) * 4, (y * layout.size + x) * 4 + 4)];
const output = (method: (typeof methods)[number], options = defaultParameters) =>
  renderFusion(source, prepareTones(tiny, options), matrix, layout, options, method);

describe('image fusion', () => {
  it.each(methods)('keeps all reserved cells and four-module quiet zone intact in %s', method => {
    const { data } = output(method, { ...defaultParameters, adaptive: true, strength: 0, contrast: 0, anchor: 25 });
    let fits = true;
    for (let y = 0; y < layout.size && fits; y++) {
      for (let x = 0; x < layout.size && fits; x++) {
        const col = Math.floor((x - layout.start) / layout.modulePx);
        const row = Math.floor((y - layout.start) / layout.modulePx);
        const i = row * matrix.size + col;
        const p = (y * layout.size + x) * 4;
        const outside = Math.min(col, row) < 0 || Math.max(col, row) >= matrix.size;
        if (!outside && !matrix.functionalMask[i]) continue;
        const dark = !outside && matrix.cells[i] === 1;
        fits = data[p] === (dark ? 15 : 255) && data[p + 1] === (dark ? 23 : 255) &&
          data[p + 2] === (dark ? 28 : 255) && data[p + 3] === 255;
      }
    }
    expect(fits).toBe(true);
    expect(layout.start).toBeGreaterThanOrEqual(4 * layout.modulePx);
  });

  it('implements three different stable methods without changing the source or matrix', () => {
    const inputBefore = source.data.slice();
    const cellsBefore = matrix.cells.slice();
    const results = methods.map(method => output(method));
    expect(results[0].mae).not.toEqual(results[1].mae);
    expect(results[1].mae).not.toEqual(results[2].mae);
    expect(results[2].data).toEqual(output('hybrid').data);
    expect(source.data).toEqual(inputBefore);
    expect(matrix.cells).toEqual(cellsBefore);
  });

  it('uses the anchor in data modules without depending on it for blend', () => {
    const low = { ...defaultParameters, anchor: 25, dither: 'none' as const };
    const high = { ...defaultParameters, anchor: 100 };
    expect(output('blend', low).data).toEqual(output('blend', high).data);
    expect(output('halftone', low).mae).not.toBe(output('halftone', high).mae);
    expect(output('hybrid', low).mae).not.toBe(output('hybrid', high).mae);
    const module = matrix.functionalMask.findIndex((protectedCell, index) => !protectedCell && matrix.cells[index] === 1);
    const x = layout.start + (module % matrix.size) * layout.modulePx + (layout.modulePx >> 1);
    const y = layout.start + Math.floor(module / matrix.size) * layout.modulePx + (layout.modulePx >> 1);
    expect(Math.max(...read(output('hybrid', low).data, x, y).slice(0, 3))).toBeLessThan(60);
  });

  it('changes local targets when adaptive luminance is enabled and keeps even coverage at odd output sizes', () => {
    expect(output('hybrid', { ...defaultParameters, adaptive: true }).mae).not.toBe(output('hybrid').mae);
    expect(layout.symbolPx).toBe(matrix.size * layout.modulePx);
    expect(() => makeLayout(matrix.size, matrix)).toThrow('density');
  });

  it('provides deterministic ordered and error-diffusion alternatives without modifying intensity samples', () => {
    const samples = new Float32Array(16).fill(0.4);
    expect([...quantize(samples, 4, 'none')]).toEqual(Array(16).fill(0));
    expect([...quantize(samples, 4, 'ordered')]).toEqual([1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1]);
    expect(quantize(samples, 4, 'floyd')).toEqual(quantize(samples, 4, 'floyd'));
    expect(quantize(samples, 4, 'floyd')).not.toEqual(quantize(samples, 4, 'none'));
    expect(samples).toEqual(new Float32Array(16).fill(0.4));
  });
});
