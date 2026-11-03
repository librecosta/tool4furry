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
  'pdf-merge': import.meta.env.DEV || import.meta.env.T4F_TOOL_PDF_MERGE_AVAILABLE
    ? () => import('./pdf-merge/PdfMerge') : undefined,
  'pdf-split': import.meta.env.DEV || import.meta.env.T4F_TOOL_PDF_SPLIT_AVAILABLE
    ? () => import('./pdf-split/PdfSplit') : undefined,
  'images-to-pdf': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGES_TO_PDF_AVAILABLE
    ? () => import('./images-to-pdf/ImagesToPdf') : undefined,
  'zip-manager': import.meta.env.DEV || import.meta.env.T4F_TOOL_ZIP_MANAGER_AVAILABLE
    ? () => import('./zip-manager/ZipManager') : undefined,
  'batch-file-renamer': import.meta.env.DEV || import.meta.env.T4F_TOOL_BATCH_FILE_RENAMER_AVAILABLE
    ? () => import('./batch-file-renamer/BatchFileRenamer') : undefined,
  'file-hash': import.meta.env.DEV || import.meta.env.T4F_TOOL_FILE_HASH_AVAILABLE
    ? () => import('./file-hash/FileHash') : undefined,
  'text-cleaner': import.meta.env.DEV || import.meta.env.T4F_TOOL_TEXT_CLEANER_AVAILABLE
    ? () => import('./text-cleaner/TextCleaner') : undefined,
  'text-diff': import.meta.env.DEV || import.meta.env.T4F_TOOL_TEXT_DIFF_AVAILABLE
    ? () => import('./text-diff/TextDiff') : undefined,
  'subtitle-tools': import.meta.env.DEV || import.meta.env.T4F_TOOL_SUBTITLE_TOOLS_AVAILABLE
    ? () => import('./subtitle-tools/SubtitleTools') : undefined,
  'json-formatter': import.meta.env.DEV || import.meta.env.T4F_TOOL_JSON_FORMATTER_AVAILABLE
    ? () => import('./json-formatter/JsonFormatter') : undefined,
  'url-base64': import.meta.env.DEV || import.meta.env.T4F_TOOL_URL_BASE64_AVAILABLE
    ? () => import('./url-base64/UrlBase64') : undefined,
  'timestamp-converter': import.meta.env.DEV || import.meta.env.T4F_TOOL_TIMESTAMP_CONVERTER_AVAILABLE
    ? () => import('./timestamp-converter/TimestampConverter') : undefined,
  'qr-code-generator': import.meta.env.DEV || import.meta.env.T4F_TOOL_QR_CODE_GENERATOR_AVAILABLE
    ? () => import('./qr-code-generator/QrCodeGenerator') : undefined,
  'color-contrast': import.meta.env.DEV || import.meta.env.T4F_TOOL_COLOR_CONTRAST_AVAILABLE
    ? () => import('./color-contrast/ColorContrast') : undefined,
  'audio-trimmer': import.meta.env.DEV || import.meta.env.T4F_TOOL_AUDIO_TRIMMER_AVAILABLE
    ? () => import('./audio-trimmer/AudioTrimmer') : undefined,
  // Publication follows metadata; no additional release switch to remove.
  'markdown-editor': import.meta.env.DEV || import.meta.env.T4F_TOOL_MARKDOWN_EDITOR_AVAILABLE
    ? () => import('./markdown-editor/MarkdownEditor') : undefined,
  'video-frame-extractor': import.meta.env.DEV || import.meta.env.T4F_TOOL_VIDEO_FRAME_EXTRACTOR_AVAILABLE
    ? () => import('./video-frame-extractor/VideoFrameExtractor') : undefined,
  'csv-json-converter': import.meta.env.DEV || import.meta.env.T4F_TOOL_CSV_JSON_CONVERTER_AVAILABLE
    ? () => import('./csv-json-converter/CsvJsonConverter') : undefined,
  'code-image-generator': import.meta.env.DEV || import.meta.env.T4F_TOOL_CODE_IMAGE_GENERATOR_AVAILABLE
    ? () => import('./code-image-generator/CodeImageGenerator') : undefined,
  'svg-to-png': import.meta.env.DEV || import.meta.env.T4F_TOOL_SVG_TO_PNG_AVAILABLE
    ? () => import('./svg-to-png/SvgToPng') : undefined,
  'regex-tester': import.meta.env.DEV || import.meta.env.T4F_TOOL_REGEX_TESTER_AVAILABLE
    ? () => import('./regex-tester/RegexTester') : undefined,
  'uuid-generator': import.meta.env.DEV || import.meta.env.T4F_TOOL_UUID_GENERATOR_AVAILABLE
    ? () => import('./uuid-generator/UuidGenerator') : undefined,
  'image-converter': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_CONVERTER_AVAILABLE
    ? () => import('./image-converter/ImageConverter')
    : undefined,
};
