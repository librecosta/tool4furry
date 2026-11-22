import { describe, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import { createQrMatrix } from '../src/tools/qr-code-generator/matrix/qr-matrix';

// Independently enumerated functional footprints, including the light modules.
function expectedMask(size: number, centers: number[]) {
  const mask = new Uint8Array(size * size);
  const rect = (row: number, col: number, height: number, width: number) => {
    for (let r = row; r < row + height; r++) mask.fill(1, r * size + col, r * size + col + width);
  };
  rect(0, 0, 8, 8);
  rect(0, size - 8, 8, 8);
  rect(size - 8, 0, 8, 8);
  rect(8, 6, size - 16, 1);
  rect(6, 8, 1, size - 16);
  for (const row of centers) {
    for (const col of centers) {
      if (row === 6 && (col === 6 || col === size - 7) || row === size - 7 && col === 6) continue;
      rect(row - 2, col - 2, 5, 5);
    }
  }
  rect(8, 0, 1, 9);
  rect(0, 8, 9, 1);
  rect(8, size - 8, 1, 8);
  rect(size - 8, 8, 8, 1);
  if (size >= 45) {
    rect(size - 11, 0, 3, 6);
    rect(0, size - 11, 6, 3);
  }
  return mask;
}

describe('qrcode@1.5.4 functional footprints', () => {
  it.each([
    ['HELLO WORLD', 'M', 1, 0, []],
    ['https://example.com/path?a=1#b', 'L', 2, 3, [6, 18]],
    ['x'.repeat(60), 'Q', 5, 0, [6, 30]],
    ['a'.repeat(107), 'M', 7, 1, [6, 22, 38]],
    ['z'.repeat(131), 'M', 8, 4, [6, 24, 42]],
    ['x'.repeat(200), 'H', 15, 0, [6, 26, 48, 70]],
  ] as const)('protects version %s (%s, QR v%i)', (content, level, version, pattern, centers) => {
    const upstream = QRCode.create(content, { errorCorrectionLevel: level });
    expect([upstream.version, upstream.maskPattern]).toEqual([version, pattern]);
    const matrix = createQrMatrix({ content, qr: { errorCorrectionLevel: level } });
    expect(matrix.size).toBe(17 + 4 * version);
    expect(matrix.cells).toEqual(upstream.modules.data);
    expect(matrix.functionalMask).toEqual(expectedMask(matrix.size, [...centers]));
    expect(matrix.cells[(matrix.size - 8) * matrix.size + 8]).toBe(1);
  });

  it.each(['missing', 'wrong length', 'invalid value', 'empty mask'])('fails closed with %s', variant => {
    const upstream = QRCode.create('HELLO WORLD');
    const { size, reservedBit } = upstream.modules;
    const mask = variant === 'missing' ? undefined : variant === 'wrong length' ? new Uint8Array(1)
      : variant === 'invalid value' ? reservedBit.map((bit, index) => index === 0 ? 2 : bit) : new Uint8Array(size * size);
    const mock = vi.spyOn(QRCode, 'create').mockReturnValue({
      ...upstream, modules: { ...upstream.modules, reservedBit: mask! },
    });
    try {
      expect(() => createQrMatrix({ content: 'HELLO WORLD', qr: { errorCorrectionLevel: 'M' } }))
        .toThrow(expect.objectContaining({ code: 'functionalMask' }));
    } finally {
      mock.mockRestore();
    }
  });
});
