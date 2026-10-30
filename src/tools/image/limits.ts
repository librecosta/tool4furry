/** Fixed per workspace. These bounds limit work; they do not guarantee device capacity. */
export type ImageLimits = Readonly<{
  bytes: number;
  pixels: number;
  edge: number;
  files: number;
  totalBytes: number;
}>;
export const mobileImageLimits: ImageLimits = Object.freeze({
  bytes: 20 * 1024 ** 2,
  pixels: 16_000_000,
  edge: 8192,
  files: 50,
  totalBytes: 60 * 1024 ** 2,
});
export const desktopImageLimits: ImageLimits = Object.freeze({
  bytes: 50 * 1024 ** 2,
  pixels: 40_000_000,
  edge: 10000,
  files: 100,
  totalBytes: 100 * 1024 ** 2,
});
export const zipOutputBytes = 128 * 1024 ** 2;
export const avifOutputLimits = Object.freeze({ pixels: 2048 ** 2, edge: 2048, timeout: 30000 });
// Same conservative classification as the fixed workspace profile, never viewport size.
export const allowsAvifOutput = (limits: ImageLimits) => limits.pixels === desktopImageLimits.pixels && limits.edge === desktopImageLimits.edge;

/** Unknown/touch-only clients use the conservative profile; viewport changes do nothing. */
export function resolveImageLimits(
  signals: {
    mobile?: boolean;
    userAgent?: string;
    coarsePointer?: boolean;
  } = {},
): ImageLimits {
  const { mobile, userAgent = '', coarsePointer } = signals;
  if (
    mobile === true ||
    coarsePointer !== false ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
  )
    return mobileImageLimits;
  return mobile === false ||
    /Windows NT|Macintosh|X11|Linux x86_64/.test(userAgent)
    ? desktopImageLimits
    : mobileImageLimits;
}
