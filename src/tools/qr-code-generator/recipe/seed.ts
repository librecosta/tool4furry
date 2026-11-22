import type { TerrainId } from './types';

export const maxTerrainSeed = 0xffffffff;

export function isTerrainSeed(value: unknown): value is number {
  // Object.is also rejects negative zero, which JSON would silently serialize as zero.
  return typeof value === 'number' && Object.is(value, value >>> 0);
}

export function deriveSeed(content: string, terrainId: TerrainId, terrainRevision = 1, recipeVersion = 1): number {
  // FNV-1a over a versioned domain and the original UTF-8 content.
  const bytes = new TextEncoder().encode(`t4f-qr\0${recipeVersion}\0${terrainId}\0${terrainRevision}\0${content}`);
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
  return hash >>> 0;
}
