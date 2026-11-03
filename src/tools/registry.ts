import { definition as pdfMergeDefinition } from './pdf-merge/definition';
import { definition as pdfSplitDefinition } from './pdf-split/definition';
import { definition as imagesToPdfDefinition } from './images-to-pdf/definition';
import { definition as zipManagerDefinition } from './zip-manager/definition';
import { definition as batchFileRenamerDefinition } from './batch-file-renamer/definition';
import { definition as fileHashDefinition } from './file-hash/definition';
import { definition as textCleanerDefinition } from './text-cleaner/definition';
import { definition as textDiffDefinition } from './text-diff/definition';
import { definition as subtitleToolsDefinition } from './subtitle-tools/definition';
import { definition as jsonFormatterDefinition } from './json-formatter/definition';
import { definition as urlBase64Definition } from './url-base64/definition';
import { definition as timestampConverterDefinition } from './timestamp-converter/definition';
import { definition as qrCodeGeneratorDefinition } from './qr-code-generator/definition';
import { definition as colorContrastDefinition } from './color-contrast/definition';
import { definition as audioTrimmerDefinition } from './audio-trimmer/definition';
import type { Region } from '../config/region';
import type { ToolDefinition } from './types';
import { imageConverterDefinition } from './image-converter/definition';
import { imageResizeCropDefinition } from './image-resize-crop/definition';
import { paletteExtractorDefinition } from './palette-extractor/definition';
import { imageCompressorDefinition } from './image-compressor/definition';
import { comicPageOrganizerDefinition } from './comic-page-organizer/definition';
import { imageWatermarkDefinition } from './image-watermark/definition';
import { exifMetadataDefinition } from './exif-metadata/definition';
// Metadata only. Lab demos are intentionally not registered as tools.
export const tools: readonly ToolDefinition[] = [imageConverterDefinition, imageResizeCropDefinition, paletteExtractorDefinition,
  imageCompressorDefinition, comicPageOrganizerDefinition, imageWatermarkDefinition, exifMetadataDefinition,
  pdfMergeDefinition, pdfSplitDefinition, imagesToPdfDefinition, zipManagerDefinition, batchFileRenamerDefinition, fileHashDefinition, textCleanerDefinition, textDiffDefinition, subtitleToolsDefinition, jsonFormatterDefinition, urlBase64Definition, timestampConverterDefinition, qrCodeGeneratorDefinition, colorContrastDefinition, audioTrimmerDefinition];
export function getPublishedTools(region: Region, registry = tools) {
  return getAvailableTools(region, false, registry);
}
export function getAvailableTools(region: Region, dev: boolean, registry = tools) {
  return registry.filter(
    (tool) => (dev || tool.status === 'published') && tool.regions.includes(region),
  );
}
