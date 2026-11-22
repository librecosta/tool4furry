import { expect, it } from 'vitest';
import { buildTerrainData } from '../src/tools/qr-code-generator/graphics/terrain-math';

it('generates repeatable finite height fields, including both unsigned seed boundaries', () => {
  const seed = 1428536480;
  const first = buildTerrainData(seed);
  expect(buildTerrainData(seed)).toEqual(first);
  const heights = first.positions.filter((_, index) => index % 3 === 1);
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5);
  for (const boundarySeed of [0, 0xffffffff]) {
    const boundary = buildTerrainData(boundarySeed);
    expect(boundary.positions.every(Number.isFinite)).toBe(true);
    expect(boundary.positions).not.toEqual(first.positions);
    expect(boundary.indices).toEqual(first.indices);
  }
  for (const invalidSeed of [-1, 0x1_0000_0000, 1.5, Infinity, NaN])
    expect(() => buildTerrainData(invalidSeed)).toThrow(RangeError);
});

it('generates complete, up-facing triangles that only reference neighbors on the finite grid', () => {
  const { positions, indices } = buildTerrainData(1);
  expect(positions).toHaveLength(33 * 33 * 3);
  expect(indices).toHaveLength(32 * 32 * 6);
  expect(positions.every(Number.isFinite)).toBe(true);
  expect(Math.max(...indices)).toBe(33 * 33 - 1);
  expect(new Set(indices).size).toBe(33 * 33);
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3, b = indices[index + 1] * 3, c = indices[index + 2] * 3;
    const up = (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a])
      - (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]);
    expect(up).toBe(0.0625);
  }
});
