import type { QrRecipeV1, TerrainId } from '../recipe/types';

export const terrainPalettes = {
  dunes: { low: 0x995c38, high: 0xe5b878, rim: 0x955936, base: 0x65402e, ink: 0x453525, plate: 0xf9edda },
  highlands: { low: 0x485d40, high: 0xb5bb82, rim: 0x6b7052, base: 0x444b37, ink: 0x254537, plate: 0xf2f4e7 },
  valley: { low: 0x9b5845, high: 0xe3a77e, rim: 0x9d624f, base: 0x663e38, ink: 0x482e33, plate: 0xfaeee5 },
} as const satisfies Record<TerrainId, Record<string, number>>;

const halfEdge = 4.5;
const samples = 64;
const baseY = -0.78;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function noise(x: number, z: number, seed: number) {
  const hash = (i: number, j: number) => {
    let value = Math.imul(i, 0x1f123bb5) ^ Math.imul(j, 0x5f356495) ^ seed;
    value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
    return ((value ^ (value >>> 12)) >>> 0) / 0xffffffff;
  };
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = smooth(x - i);
  const v = smooth(z - j);
  return mix(mix(hash(i, j), hash(i + 1, j), u), mix(hash(i, j + 1), hash(i + 1, j + 1), u), v);
}

export function terrainHeight(id: TerrainId, seed: number, x: number, z: number) {
  const drift = noise(x * 1.8 + 12, z * 1.8, seed);
  const grain = noise(x * 7.4, z * 7.4 + 14, seed);
  const phase = (seed & 255) / 255;
  switch (id) {
    case 'dunes': {
      const front = z * 0.87 + x * 0.46 + 0.19 * Math.sin(x * 3.2 + phase) + 0.17 * drift;
      const crest = (Math.sin(front * 9.4 + 2 * phase + 0.56 * Math.cos(front * 8.3)) + 1) / 2;
      const swell = 0.45 + 0.48 * drift + 0.19 * Math.sin(x * 2.4 - z * 1.8);
      return 0.22 + 1.7 * crest ** 2.2 * swell + 0.43 * drift + 0.07 * grain;
    }
    case 'highlands': {
      const hill = (cx: number, cz: number, a: number, b: number) => {
        const dx = x - cx;
        const dz = z - cz;
        return Math.exp(-a * (dx + 0.31 * dz) ** 2 - b * (dz - 0.36 * dx) ** 2);
      };
      return 0.21 + 1.42 * hill(-0.55 + 0.16 * phase, -0.50, 5.2, 3.6) +
        1.8 * hill(0.52, -0.36 + phase * 0.09, 6.7, 4) +
        1.14 * hill(0.11, 0.51, 4.1, 7.4) + 0.32 * drift + 0.10 * grain;
    }
    case 'valley': {
      const center = 0.27 * Math.sin(2.65 * z + phase * 1.5) + 0.15 * z;
      const distance = Math.abs(x - center);
      const cliff = smooth(clamp((distance - 0.08 - 0.10 * drift) / 0.54));
      const strata = Math.sin((distance + 0.035 * drift) * 43) * cliff * 0.08;
      return 0.14 + cliff * (1.34 + 0.46 * drift + 0.26 * Math.sin(z * 3 + Math.sign(x - center))) +
        strata + drift * 0.17 + grain * 0.055;
    }
  }
}

function linearRgb(hex: number) {
  return [16, 8, 0].map(shift => {
    const value = ((hex >> shift) & 255) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
}

/** One indexed, closed solid. Each wall starts at the exact edge vertices of the heightfield. */
export function buildDioramaTerrain({ id, seed }: QrRecipeV1['terrain']) {
  const rowWidth = samples + 1;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const palette = terrainPalettes[id];
  const low = linearRgb(palette.low);
  const high = linearRgb(palette.high);
  const rim = linearRgb(palette.rim);
  const base = linearRgb(palette.base);
  const height = (x: number, z: number) => terrainHeight(id, seed, x, z);
  for (let row = 0; row <= samples; row++) {
    for (let col = 0; col <= samples; col++) {
      const x = col / samples * 2 - 1;
      const z = row / samples * 2 - 1;
      const y = height(x, z);
      const slope = Math.abs(height(x + 0.025, z) - y) + Math.abs(height(x, z + 0.025) - y);
      const band = id === 'valley' ? Math.sin(y * 20 + z * 2) * 0.046 : 0;
      const tint = clamp(0.23 + y * 0.41 - slope * 0.74 + band);
      positions.push(x * halfEdge, y, z * halfEdge);
      colors.push(...low.map((value, i) => mix(value, high[i], tint)));
      if (row < samples && col < samples) {
        const a = row * rowWidth + col;
        indices.push(a, a + rowWidth, a + 1, a + 1, a + rowWidth, a + rowWidth + 1);
      }
    }
  }
  const perimeter = [
    ...Array.from({ length: samples }, (_, i) => i),
    ...Array.from({ length: samples }, (_, i) => i * rowWidth + samples),
    ...Array.from({ length: samples }, (_, i) => samples * rowWidth + samples - i),
    ...Array.from({ length: samples }, (_, i) => (samples - i) * rowWidth),
  ];
  let ring = perimeter;
  for (const [y, spread, color] of [
    [-0.08, 1, rim], [-0.22, 1.018, base], [-0.60, 1.018, base], [baseY, 0.99, base],
  ] as const) {
    const next = perimeter.map(index => {
      const vertex = positions.length / 3;
      positions.push(positions[index * 3] * spread, y, positions[index * 3 + 2] * spread);
      colors.push(...color);
      return vertex;
    });
    ring.forEach((a, i) => {
      const j = (i + 1) % ring.length;
      indices.push(a, ring[j], next[i], ring[j], next[j], next[i]);
    });
    ring = next;
  }
  const center = positions.length / 3;
  positions.push(0, baseY, 0);
  colors.push(...base);
  ring.forEach((vertex, i) => indices.push(center, vertex, ring[(i + 1) % ring.length]));
  return { positions: Float32Array.from(positions), colors: Float32Array.from(colors), indices: Uint16Array.from(indices) };
}
