import { isTerrainSeed, maxTerrainSeed } from '../recipe/seed';

const segments = 32;
const edge = 8;

function lattice(x: number, z: number, seed: number) {
  // Coordinate-keyed 32-bit mixing. Each lattice point is independent of traversal order.
  let value = seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(z, 0x85ebca77);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / maxTerrainSeed;
}

const smooth = (value: number) => value * value * (3 - 2 * value);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function valueNoise(x: number, z: number, seed: number) {
  const left = Math.floor(x), top = Math.floor(z);
  const u = smooth(x - left), v = smooth(z - top);
  const north = mix(lattice(left, top, seed), lattice(left + 1, top, seed), u);
  const south = mix(lattice(left, top + 1, seed), lattice(left + 1, top + 1, seed), u);
  return mix(north, south, v);
}

export function buildTerrainData(seed: number) {
  if (!isTerrainSeed(seed)) throw new RangeError('Terrain seed must be an unsigned 32-bit integer');

  const stride = segments + 1;
  const positions = new Float32Array(stride * stride * 3);
  const indices = new Uint16Array(segments * segments * 6);
  for (let row = 0; row < stride; row++) {
    const z = (row / segments - 0.5) * edge;
    for (let column = 0; column < stride; column++) {
      const x = (column / segments - 0.5) * edge;
      const vertex = row * stride + column;
      const broad = valueNoise(x * 0.35, z * 0.35, seed);
      const detail = valueNoise(x * 1.2, z * 1.2, seed ^ 0x27d4eb2f);
      positions[vertex * 3] = x;
      positions[vertex * 3 + 1] = (broad - 0.5) * 1.8 + (detail - 0.5) * 0.35;
      positions[vertex * 3 + 2] = z;
      if (row < segments && column < segments) {
        const below = vertex + stride;
        indices.set([vertex, below, vertex + 1, vertex + 1, below, below + 1], (row * segments + column) * 6);
      }
    }
  }
  return { positions, indices };
}
