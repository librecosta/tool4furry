import type { Locale } from '../../i18n/locale';
import catalog from './catalog.json';
export { creativeImageUrl } from './image-urls';

export const creativeCategories = {
  landscapes: { zh: '自然与天空', en: 'Landscapes' },
  water: { zh: '海洋与水', en: 'Water' },
  textures: { zh: '材质纹理', en: 'Textures' },
  abstract: { zh: '抽象艺术', en: 'Abstract' },
  gradients: { zh: '渐变柔光', en: 'Gradients' },
  architecture: { zh: '建筑空间', en: 'Architecture' },
} as const;

export type CreativeCategory = keyof typeof creativeCategories;
export type CreativeAsset = Readonly<Omit<typeof catalog[number], 'category' | 'recommendedUse' | 'title'> & {
  category: CreativeCategory;
  recommendedUse: 'outer' | 'both';
  title: Readonly<Record<Locale, string>>;
}>;

const assets = catalog as readonly CreativeAsset[];
const assetsById = new Map(assets.map(asset => [asset.id, asset]));
const thumbs = import.meta.glob<string>('./thumbnails/*.webp', { eager: true, import: 'default', query: '?url&no-inline' });

export function listCreativeAssets(category?: CreativeCategory, target: 'canvas' | 'window' = 'canvas') {
  const matches = assets.filter(asset => !category || asset.category === category);
  // Keep catalog order within each group, including assets with no window recommendation.
  return target === 'window' ? matches.sort((a, b) =>
    Number(b.recommendedUse === 'both') - Number(a.recommendedUse === 'both')) : matches;
}

export function getCreativeAsset(id: string) {
  return assetsById.get(id);
}

export function creativeThumbnailUrl(asset: CreativeAsset) {
  return thumbs[`./${asset.thumbnail}`];
}
