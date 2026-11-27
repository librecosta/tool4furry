import type { CreativeAsset } from './index';

const images = import.meta.glob<string>('./backgrounds/*.avif', { import: 'default', query: '?url&no-inline' });

export async function creativeImageUrl(asset: CreativeAsset) {
  return images[`./${asset.image}`]?.();
}
