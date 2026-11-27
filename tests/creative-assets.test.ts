// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { creativeCategories, creativeImageUrl, creativeThumbnailUrl, getCreativeAsset, listCreativeAssets,
  type CreativeCategory } from '../src/assets/creative';
import { inspectImage } from '../src/tools/image/inspect-image';

const directory = new URL('../src/assets/creative/', import.meta.url);
const assets = listCreativeAssets();

describe('Creative Collection Vol. 01', () => {
  it('has 23 unique entries, each paired with exactly one original file and thumbnail', async () => {
    expect(assets).toHaveLength(23);
    expect(new Set(assets.map(asset => asset.id)).size).toBe(23);
    expect((await readdir(new URL('backgrounds/', directory))).sort()).toEqual(assets.map(asset => `${asset.id}.avif`).sort());
    expect((await readdir(new URL('thumbnails/', directory))).sort()).toEqual(assets.map(asset => `${asset.id}.webp`).sort());
    expect(getCreativeAsset('unknown')).toBeUndefined();
    expect(assets.reduce((bytes, asset) => bytes + asset.bytes, 0)).toBe(8_765_275);
    expect(assets.reduce((bytes, asset) => bytes + asset.thumbnailBytes, 0)).toBe(400_410);
  });

  it('filters all six categories and prioritizes window recommendations while retaining all images', () => {
    const categories = Object.keys(creativeCategories) as CreativeCategory[];
    expect(categories).toHaveLength(6);
    for (const category of categories) {
      expect(listCreativeAssets(category)).toEqual(assets.filter(asset => asset.category === category));
      expect(listCreativeAssets(category).length).toBeGreaterThan(0);
    }
    const recommended = assets.filter(asset => asset.recommendedUse === 'both');
    expect(listCreativeAssets(undefined, 'window')).toEqual([...recommended, ...assets.filter(asset => asset.recommendedUse === 'outer')]);
  });

  it.each(assets.map(asset => [asset.id, asset] as const))('validates %s and exposes separate asset URLs', async (id, asset) => {
    expect(getCreativeAsset(id)).toBe(asset);
    expect(asset.title).toMatchObject({ zh: expect.any(String), en: expect.any(String) });
    expect(asset.image).toBe(`backgrounds/${id}.avif`);
    expect(asset.thumbnail).toBe(`thumbnails/${id}.webp`);
    expect(await creativeImageUrl(asset)).toContain(`${id}.avif`);
    expect(creativeThumbnailUrl(asset)).toContain(`${id}.webp`);
    const [image, thumb] = await Promise.all([
      readFile(new URL(asset.image, directory)), readFile(new URL(asset.thumbnail, directory)),
    ]);
    expect(image.length).toBe(asset.bytes);
    expect(thumb.length).toBe(asset.thumbnailBytes);
    expect(createHash('sha256').update(image).digest('hex')).toBe(asset.processing.sha256);
    expect(await inspectImage(new Blob([new Uint8Array(image)])))
      .toMatchObject({ format: 'avif', width: asset.width, height: asset.height });
    expect(await inspectImage(new Blob([new Uint8Array(thumb)])))
      .toMatchObject({ format: 'webp', width: asset.thumbnailWidth, height: asset.thumbnailHeight });
    expect(Math.max(asset.width, asset.height)).toBeLessThanOrEqual(3840);
    expect(Math.max(asset.thumbnailWidth, asset.thumbnailHeight)).toBeLessThanOrEqual(480);
  });
});
