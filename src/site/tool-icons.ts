import converter32 from '../assets/tool-icons/image-converter-32.png?url&no-inline';
import converter128 from '../assets/tool-icons/image-converter-128.png?url&no-inline';
import resize32 from '../assets/tool-icons/image-resize-crop-32.png?url&no-inline';
import resize128 from '../assets/tool-icons/image-resize-crop-128.png?url&no-inline';
import palette32 from '../assets/tool-icons/palette-extractor-32.png?url&no-inline';
import palette128 from '../assets/tool-icons/palette-extractor-128.png?url&no-inline';
import compressor32 from '../assets/tool-icons/image-compressor-32.png?url&no-inline';
import compressor128 from '../assets/tool-icons/image-compressor-128.png?url&no-inline';
import comic32 from '../assets/tool-icons/comic-page-organizer-32.png?url&no-inline';
import comic128 from '../assets/tool-icons/comic-page-organizer-128.png?url&no-inline';
import watermark32 from '../assets/tool-icons/image-watermark-32.png?url&no-inline';
import watermark128 from '../assets/tool-icons/image-watermark-128.png?url&no-inline';
import metadata32 from '../assets/tool-icons/exif-metadata-32.png?url&no-inline';
import metadata128 from '../assets/tool-icons/exif-metadata-128.png?url&no-inline';

// Display resources only; Registry continues to control tool availability.
export const toolIcons = {
  'image-converter': { 32: converter32, 128: converter128 },
  'image-resize-crop': { 32: resize32, 128: resize128 },
  'palette-extractor': { 32: palette32, 128: palette128 },
  'image-compressor': { 32: compressor32, 128: compressor128 },
  'comic-page-organizer': { 32: comic32, 128: comic128 },
  'image-watermark': { 32: watermark32, 128: watermark128 },
  'exif-metadata': { 32: metadata32, 128: metadata128 },
} as const;

export function getToolIcon(id: string): Readonly<Record<32 | 128, string>> | undefined {
  return Object.hasOwn(toolIcons, id) ? toolIcons[id as keyof typeof toolIcons] : undefined;
}
