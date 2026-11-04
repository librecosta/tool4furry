import type { ImageLimits } from '../image/limits';
import type { ImageSource } from '../image/types';

// Arithmetic/format bounds, not a device profile or an admission quota. Actual
// decode/allocation/embedding failures are reported without reducing the image.
export const imagesPdfLimits: ImageLimits = {
  files: Number.MAX_SAFE_INTEGER, bytes: Number.MAX_SAFE_INTEGER,
  totalBytes: Number.MAX_SAFE_INTEGER, edge: 0x7fffffff,
  pixels: Math.floor(Number.MAX_SAFE_INTEGER / 4),
};
export const imagesPdfBudget = {
  pages: Number.MAX_SAFE_INTEGER, bytes: Number.MAX_SAFE_INTEGER,
  pixels: Number.MAX_SAFE_INTEGER, outputBytes: Number.MAX_SAFE_INTEGER,
};
export function heavyImages(pages: readonly {file: File; source?: ImageSource}[]) {
  return pages.length > 40 || pages.reduce((sum, p) => sum + p.file.size, 0) > 32 * 1024 ** 2
    || pages.reduce((sum, p) => sum + (p.source ? p.source.width * p.source.height : 0), 0) > 24_000_000;
}
