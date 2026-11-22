import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { buildDioramaTerrain, terrainHeight } from '../src/tools/qr-code-generator/graphics/diorama-terrain';
import { buildDioramaQr, qrPlateEdge } from '../src/tools/qr-code-generator/graphics/diorama-qr';
import { advanceDiorama } from '../src/tools/qr-code-generator/graphics/scene-transition';
import { createQrMatrix } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { errorCorrectionLevels, terrainIds } from '../src/tools/qr-code-generator/recipe/types';

describe('diorama geometry', () => {
  it.each(terrainIds)('produces a deterministic, finite, closed and consistently oriented %s solid', id => {
    const data = buildDioramaTerrain({ id, revision: 1, seed: 42 });
    expect(data).toEqual(buildDioramaTerrain({ id, revision: 1, seed: 42 }));
    expect(data.positions).not.toEqual(buildDioramaTerrain({ id, revision: 1, seed: 43 }).positions);
    expect(data.colors.length).toBe(data.positions.length);
    expect(data.positions.every(Number.isFinite)).toBe(true);
    expect(data.indices.every(index => index < data.positions.length / 3)).toBe(true);
    const edges = new Map<string, { count: number; winding: number }>();
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(data.positions, 3));
    geo.setIndex(new BufferAttribute(data.indices, 1));
    geo.computeVertexNormals();
    const a = new Vector3(), b = new Vector3(), c = new Vector3();
    const vertices = geo.getAttribute('position');
    for (let at = 0; at < data.indices.length; at += 3) {
      const [i, j, k] = data.indices.subarray(at, at + 3);
      a.fromBufferAttribute(vertices, i);
      b.fromBufferAttribute(vertices, j);
      c.fromBufferAttribute(vertices, k);
      if (b.sub(a).cross(c.sub(a)).lengthSq() <= 1e-14) throw new Error('Degenerate terrain triangle');
      for (const [from, to] of [[i, j], [j, k], [k, i]]) {
        const key = from < to ? from + ':' + to : to + ':' + from;
        const edge = edges.get(key) ?? { count: 0, winding: 0 };
        edge.count++;
        edge.winding += from < to ? 1 : -1;
        edges.set(key, edge);
      }
    }
    expect([...edges.values()].every(edge => edge.count === 2 && edge.winding === 0)).toBe(true);
    expect(geo.getAttribute('normal').array.every(Number.isFinite)).toBe(true);
    expect(geo.getAttribute('normal').getY(65 * 32 + 32)).toBeGreaterThan(0);
    expect(geo.getAttribute('normal').getY(vertices.count - 1)).toBeLessThan(-0.95);
    geo.dispose();
  });

  it('distinguishes ridges, multiple hills and a valley by elevations at identical coordinates', () => {
    const signature = terrainIds.map(id =>
      Array.from({ length: 21 }, (_, i) => terrainHeight(id, 1428536480, i / 10 - 1, 0.23).toFixed(3)).join(','));
    expect(new Set(signature).size).toBe(3);
    expect(terrainHeight('valley', 1428536480, 0.18, 0.23)).toBeLessThan(terrainHeight('valley', 1428536480, 0.95, 0.23) - 0.8);
    expect(terrainHeight('valley', 1428536480, -0.08, -0.65)).toBeLessThan(terrainHeight('valley', 1428536480, 0.55, -0.65) - 0.8);
  });

  it.each(errorCorrectionLevels)('instantiates only dark modules at their exact %s positions and leaves four quiet modules', errorCorrectionLevel => {
    const matrix = createQrMatrix({ content: ' https://example.com/雪/🦊#diorama ', qr: { errorCorrectionLevel } });
    const relief = buildDioramaQr(matrix);
    expect(relief.bricks.length).toBe(matrix.cells.reduce((total, cell) => total + cell, 0));
    expect(relief).toEqual(buildDioramaQr(matrix));
    expect(relief.quietWidth).toBeCloseTo(relief.step * 4);
    expect(matrix.size * relief.step + 2 * relief.quietWidth).toBeCloseTo(qrPlateEdge);
    for (const instance of relief.bricks) {
      const index = instance.row * matrix.size + instance.col;
      expect(matrix.cells[index]).toBe(1);
      expect(instance.functional).toBe(!!matrix.functionalMask[index]);
      expect(instance.x).toBeCloseTo((instance.col + 0.5) * relief.step + relief.quietWidth - qrPlateEdge / 2);
      expect(instance.z).toBeCloseTo((instance.row + 0.5) * relief.step + relief.quietWidth - qrPlateEdge / 2);
      if (instance.functional) expect(instance.tint).toBe(1);
    }
  });
});

it('clamps animation gaps and settles immediately for reduced motion', () => {
  expect(advanceDiorama(0, 10_000, false)).toEqual(advanceDiorama(0, 0.06, false));
  expect(advanceDiorama(0, 0, true)).toEqual({ elapsed: 1, progress: 1, done: true });
  let time = 0;
  for (let i = 0; i < 10; i++) time = advanceDiorama(time, 0.06, false).elapsed;
  expect(time).toBe(1);
});
