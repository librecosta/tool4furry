import type { Preset } from '../processing-state';
import type { ImageFormat } from '../image/types';
import { metadataPolicy, authorshipPolicy } from '../image/metadata';
export type EncodeSettings = Readonly<{
  format: ImageFormat;
  quality: number | null;
  jpegBackground: string;
  avif444?: boolean;
  preserveAuthorship?: boolean;
}>;
export const recommendations: Record<ImageFormat, Preset<EncodeSettings>> = {
  avif: {
    // v1 also binds the fixed ST encoder's S6 and Alpha100 semantics.
    id: 'avif', version: 1,
    settings: { format: 'avif', quality: 55, jpegBackground: '#FFFFFF', avif444: false },
  },
  webp: {
    id: 'webp',
    version: 1,
    settings: { format: 'webp', quality: 85, jpegBackground: '#FFFFFF' },
  },
  jpeg: {
    id: 'jpeg',
    version: 1,
    settings: { format: 'jpeg', quality: 88, jpegBackground: '#FFFFFF' },
  },
  png: {
    id: 'png',
    version: 1,
    settings: { format: 'png', quality: null, jpegBackground: '#FFFFFF' },
  },
};
export function sameSettings(
  a: Readonly<EncodeSettings>,
  b: Readonly<EncodeSettings>,
) {
  return (
    a.format === b.format &&
    !!a.preserveAuthorship === !!b.preserveAuthorship &&
    (a.format !== 'avif' || !!a.avif444 === !!b.avif444) &&
    (a.format === 'png' || Object.is(a.quality, b.quality)) &&
    (a.format !== 'jpeg' ||
      a.jpegBackground.toUpperCase() === b.jpegBackground.toUpperCase())
  );
}
export function validSettings(s: EncodeSettings) {
  return (
    (s.preserveAuthorship === undefined || typeof s.preserveAuthorship === 'boolean') &&
    !(s.format === 'avif' && s.preserveAuthorship) &&
    (s.format !== 'avif' || s.avif444 === undefined || typeof s.avif444 === 'boolean') &&
    (s.format === 'png' ||
      (Number.isInteger(s.quality) && s.quality! >= 1 && s.quality! <= 100)) &&
    (s.format !== 'jpeg' || /^#[0-9a-f]{6}$/i.test(s.jpegBackground))
  );
}
export const settingsMetadataPolicy = (s: EncodeSettings) =>
  s.preserveAuthorship ? authorshipPolicy : metadataPolicy;
