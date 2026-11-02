import { desktopImageLimits, mobileImageLimits, resolveImageLimits, type ImageLimits } from '../image/limits';
export type ComicBudget = Readonly<{
  input: ImageLimits; blobBytes: number; streamBytes: number;
  thumbnails: number; thumbnailBytes: number;
  pdf: {pages: number; bytes: number; pixels: number; outputBytes: number};
}>;
export const desktopComicBudget: ComicBudget = {
  input: {...desktopImageLimits, files: 600, bytes: 64 * 1024 ** 2, totalBytes: 2 * 1024 ** 3},
  blobBytes: 128 * 1024 ** 2, streamBytes: 3 * 1024 ** 3,
  thumbnails: 48, thumbnailBytes: 12 * 1024 ** 2,
  pdf: {pages: 100, bytes: 96 * 1024 ** 2, pixels: 96_000_000, outputBytes: 128 * 1024 ** 2},
};
export const mobileComicBudget: ComicBudget = {
  input: {...mobileImageLimits, files: 200, totalBytes: 512 * 1024 ** 2},
  blobBytes: 64 * 1024 ** 2, streamBytes: 768 * 1024 ** 2,
  thumbnails: 24, thumbnailBytes: 6 * 1024 ** 2,
  pdf: {pages: 40, bytes: 32 * 1024 ** 2, pixels: 24_000_000, outputBytes: 48 * 1024 ** 2},
};
export const resolveComicBudget = (signals: Parameters<typeof resolveImageLimits>[0]) => resolveImageLimits(signals) === desktopImageLimits ? desktopComicBudget : mobileComicBudget;
