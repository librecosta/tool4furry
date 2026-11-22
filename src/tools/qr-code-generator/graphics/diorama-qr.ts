import type { QrMatrixData } from '../matrix/qr-matrix';

export const qrPlateEdge = 7.7;
export const qrPlateTop = 0.22;

export function buildDioramaQr(matrix: QrMatrixData) {
  const step = qrPlateEdge / (matrix.size + matrix.quietZoneModules * 2);
  const bricks = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      const index = row * matrix.size + col;
      if (!matrix.cells[index]) continue;
      const functional = matrix.functionalMask[index] === 1;
      const variation = functional ? 0 : (Math.imul(index + 1, 0x9e3779b1) >>> 29);
      bricks.push({
        row, col, functional,
        x: (col + 0.5 - matrix.size / 2) * step,
        z: (row + 0.5 - matrix.size / 2) * step,
        height: Math.min(0.23, step * (0.50 + variation * 0.04)),
        tint: 1 - variation * 0.025,
      });
    }
  }
  return { bricks, step, quietWidth: step * matrix.quietZoneModules };
}
