import { recommendations } from '../image-converter/presets';
import type { ImageFormat } from '../image/types';

export type ComicImageFormat = 'original' | ImageFormat;
export type LossyFormat = 'jpeg' | 'webp' | 'avif';
export type ExportSettings = Readonly<{
  prefix: string; format: ComicImageFormat;
  qualities: Readonly<Record<LossyFormat, number>>; jpegBackground: string;
}>;
export const defaultExportSettings: ExportSettings = {
  prefix: 'page', format: 'original', jpegBackground: '#FFFFFF',
  qualities: {jpeg: recommendations.jpeg.settings.quality!, webp: recommendations.webp.settings.quality!, avif: recommendations.avif.settings.quality!},
};
export type Strength = 'light' | 'balanced' | 'strong';
export const recommendedQuality = (format: LossyFormat, strength: Strength = 'balanced') => ({
  jpeg: {light: 95, balanced: recommendations.jpeg.settings.quality!, strong: 70},
  webp: {light: 95, balanced: recommendations.webp.settings.quality!, strong: 65},
  avif: {light: 65, balanced: recommendations.avif.settings.quality!, strong: 40},
})[format][strength];
export const isLossy = (format: ComicImageFormat): format is LossyFormat => format !== 'original' && format !== 'png';
export function validPagePrefix(prefix: string) {
  return !!prefix && [...prefix].length <= 48 && new TextEncoder().encode(prefix).length <= 120 &&
    !/[<>:"/\\|?*\p{C}]/u.test(prefix) && !prefix.includes('..') && !/^[ .]|[ .]$/.test(prefix) &&
    !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(prefix);
}
export function validExportSettings(s: ExportSettings) {
  return validPagePrefix(s.prefix) && ['original','jpeg','png','webp','avif'].includes(s.format) &&
    (!isLossy(s.format) || Number.isInteger(s.qualities[s.format]) && s.qualities[s.format] >= 1 && s.qualities[s.format] <= 100) &&
    (s.format !== 'jpeg' || /^#[0-9a-f]{6}$/i.test(s.jpegBackground));
}
