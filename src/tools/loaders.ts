import type { ComponentType } from 'react';
import type { ToolProps } from './types';
export type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>;
// Add a literal () => import('./my-tool/MyTool') when implementing a real tool.
export const toolLoaders: Readonly<Partial<Record<string, ToolLoader>>> = {
  'image-compressor': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_COMPRESSOR_AVAILABLE
    ? () => import('./image-compressor/ImageCompressor') : undefined,
  'comic-page-organizer': import.meta.env.DEV || import.meta.env.T4F_TOOL_COMIC_PAGE_ORGANIZER_AVAILABLE
    ? () => import('./comic-page-organizer/ComicPageOrganizer') : undefined,
  'image-watermark': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_WATERMARK_AVAILABLE
    ? () => import('./image-watermark/ImageWatermark') : undefined,
  'exif-metadata': import.meta.env.DEV || import.meta.env.T4F_TOOL_EXIF_METADATA_AVAILABLE
    ? () => import('./exif-metadata/ExifMetadata') : undefined,
  'palette-extractor': import.meta.env.DEV || import.meta.env.T4F_TOOL_PALETTE_EXTRACTOR_AVAILABLE
    ? () => import('./palette-extractor/PaletteExtractor')
    : undefined,
  'image-resize-crop': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_RESIZE_CROP_AVAILABLE
    ? () => import('./image-resize-crop/ImageResizeCrop')
    : undefined,
  // Publication follows metadata; no additional release switch to remove.
  'image-converter': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_CONVERTER_AVAILABLE
    ? () => import('./image-converter/ImageConverter')
    : undefined,
};
