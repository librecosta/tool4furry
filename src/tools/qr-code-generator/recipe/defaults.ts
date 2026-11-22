import { deriveSeed } from './seed';
import type { QrRecipeV1 } from './types';

export function createDefaultRecipe(): QrRecipeV1 {
  const content = 'https://example.com';
  return {
    version: 1,
    content,
    terrain: { id: 'dunes', revision: 1, seed: deriveSeed(content, 'dunes') },
    artwork: { id: 'aeolian', revision: 1 },
    qr: { errorCorrectionLevel: 'M' },
  };
}
