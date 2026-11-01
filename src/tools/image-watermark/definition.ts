import type { ToolDefinition } from '../types';
export const imageWatermarkDefinition: ToolDefinition = {
  id: 'image-watermark', slug: 'image-watermark', category: 'images', group: 'image-processing',
  roles: ['painter', 'animator', 'operations'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'draft', regions: ['cn', 'global'], copy: {
    zh: {title: '图片水印', summary: '为单张或多张图片添加文字或图片水印。', description: '在浏览器本地添加文字或图片水印，调整位置、大小和透明度，下载 PNG、JPEG、WebP 或 ZIP。'},
    en: {title: 'Image Watermark', summary: 'Add text or image watermarks to one or more images.', description: 'Add text or image watermarks locally, adjust position, size and opacity, and download PNG, JPEG, WebP or ZIP.'},
  },
};
