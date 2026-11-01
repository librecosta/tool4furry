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
  imageCompressorDefinition, comicPageOrganizerDefinition, imageWatermarkDefinition, exifMetadataDefinition];
export function getPublishedTools(region: Region, registry = tools) {
  return getAvailableTools(region, false, registry);
}
export function getAvailableTools(region: Region, dev: boolean, registry = tools) {
  return registry.filter(
    (tool) => (dev || tool.status === 'published') && tool.regions.includes(region),
  );
}
