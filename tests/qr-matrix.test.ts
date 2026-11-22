import jsQR from 'jsqr';
import { expect, it } from 'vitest';
import { createQrMatrix, type QrMatrixData } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { createDefaultRecipe } from '../src/tools/qr-code-generator/recipe/defaults';
import { errorCorrectionLevels, type QrRecipeV1 } from '../src/tools/qr-code-generator/recipe/types';

const sample = createDefaultRecipe();

function scan({ size, cells, quietZoneModules }: QrMatrixData) {
  const scale = 5;
  const edge = (size + 2 * quietZoneModules) * scale;
  const pad = quietZoneModules * scale;
  const pixels = new Uint8ClampedArray(edge * edge * 4).fill(255);
  for (let y = pad; y < edge - pad; y++) for (let x = pad; x < edge - pad; x++) {
    const row = Math.floor((y - pad) / scale), col = Math.floor((x - pad) / scale);
    if (!cells[row * size + col]) continue;
    const offset = (y * edge + x) * 4;
    pixels.fill(0, offset, offset + 3);
  }
  return jsQR(pixels, edge, edge, { inversionAttempts: 'dontInvert' });
}

it('returns the expected dimensions, row-major finder pattern and quiet zone', () => {
  const matrix = createQrMatrix(sample);
  expect(matrix.size).toBe(25);
  expect(matrix.cells).toBeInstanceOf(Uint8Array);
  expect(matrix.cells).toHaveLength(625);
  expect(new Set(matrix.cells)).toEqual(new Set([0, 1]));
  expect(matrix.quietZoneModules).toBe(4);
  expect(matrix.errorCorrectionLevel).toBe('M');
  expect(Array.from(matrix.cells.slice(0, 8))).toEqual([1, 1, 1, 1, 1, 1, 1, 0]);
  expect(Array.from(matrix.cells.slice(25, 33))).toEqual([1, 0, 0, 0, 0, 0, 1, 0]);
  expect(scan(matrix)?.data).toBe(sample.content);
});

it.each(errorCorrectionLevels)('encodes original UTF-8 bytes at correction level %s', errorCorrectionLevel => {
  const content = ' https://例子.test/a%20b?name=中文&emoji=🦊#片段 ';
  const request = { ...sample, content, qr: { errorCorrectionLevel } };
  const matrix = createQrMatrix(request);
  expect(matrix.errorCorrectionLevel).toBe(errorCorrectionLevel);
  expect(scan(matrix)?.data).toBe(content);
  expect(scan(matrix)?.binaryData).toEqual(Array.from(new TextEncoder().encode(content)));
  expect(createQrMatrix(request)).toEqual(matrix);
});

it('keeps terrain and artwork independent of QR data, and follows correction-driven capacity', () => {
  const other: QrRecipeV1 = {
    ...sample, terrain: { id: 'valley', revision: 1, seed: 1 },
    artwork: { id: 'strata', revision: 1 },
  };
  expect(createQrMatrix(other)).toEqual(createQrMatrix(sample));
  expect(createQrMatrix({ ...sample, qr: { errorCorrectionLevel: 'H' } }).size).toBeGreaterThan(25);
  expect(createQrMatrix({ ...sample, content: '7'.repeat(2500) }).size).toBeGreaterThan(25);
  expect(() => createQrMatrix({ ...sample, content: '🦊'.repeat(1000) })).toThrow('capacity');
  expect(() => createQrMatrix({ ...sample, content: '' })).toThrow('content');
  expect(() => createQrMatrix({ ...sample, content: '\udfff' })).toThrow('content');
});
