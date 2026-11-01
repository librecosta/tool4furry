import type { ToolDefinition } from '../types';
export const exifMetadataDefinition: ToolDefinition = {
  id: 'exif-metadata', slug: 'exif-metadata', category: 'images', group: 'image-processing',
  roles: ['painter', 'operations'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'published', regions: ['cn', 'global'],
  copy: {
    zh: {title: '图片元数据', summary: '本地查看 EXIF，批量清理受支持的图片元数据。', description: '在浏览器本地查看 JPEG、PNG、WebP 中可识别的 EXIF 与隐私字段，批量无损清理元数据，逐张下载或打包 ZIP。'},
    en: {title: 'EXIF Metadata', summary: 'View EXIF and batch clean supported image metadata locally.', description: 'Inspect recognizable EXIF and private fields in JPEG, PNG and WebP images, batch clean supported metadata without re-encoding pixels, and download images or a ZIP locally.'},
  },
};
