// Display resources only; Registry continues to control tool availability.
export const toolIconPaths = {
  'image-converter': '/assets/tool-icons/image-converter',
  'image-resize-crop': '/assets/tool-icons/image-resize-crop',
  'palette-extractor': '/assets/tool-icons/palette-extractor',
  'image-compressor': '/assets/tool-icons/image-compressor',
  'comic-page-organizer': '/assets/tool-icons/comic-page-organizer',
  'image-watermark': '/assets/tool-icons/image-watermark',
  'exif-metadata': '/assets/tool-icons/exif-metadata',
} as const;

export function getToolIconPath(id: string): string | undefined {
  return Object.hasOwn(toolIconPaths, id) ? toolIconPaths[id as keyof typeof toolIconPaths] : undefined;
}
