import type { ToolDefinition } from '../types';
export const exifMetadataDefinition: ToolDefinition = {
  id: 'exif-metadata', slug: 'exif-metadata', category: 'images', group: 'image-processing',
  roles: ['painter', 'operations'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'draft', regions: ['cn', 'global'],
  copy: {
    zh: {title: '图片元数据', summary: '在本地查看图片信息，清理常见来源隐私元数据。', description: '查看 JPEG、PNG、WebP 中可解析的 EXIF 与 GPS 信息，无损清理受支持的来源元数据并下载。'},
    en: {title: 'EXIF Metadata', summary: 'Inspect image information and remove common private metadata locally.', description: 'View supported EXIF and GPS fields in JPEG, PNG and WebP images, and download a losslessly cleaned copy.'},
  },
};
