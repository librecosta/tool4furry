import type { ToolDefinition } from '../types';
export const imageWatermarkDefinition: ToolDefinition = {
  id: 'image-watermark', slug: 'image-watermark', category: 'images', group: 'image-processing',
  roles: ['painter', 'animator', 'operations'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'published', regions: ['cn', 'global'], copy: {
    zh: {title: '图片水印', summary: '本地批量添加文字或 Logo 水印，支持旋转和平铺。', description: '在浏览器本地批量添加文字或 Logo 水印，调整旋转、平铺、位置与透明度。支持安全静态 SVG 素材，导出 PNG、JPEG、WebP 或受设备与尺寸限制的 AVIF。'},
    en: {title: 'Image Watermark', summary: 'Add text or logo watermarks locally, with batch processing, rotation and tiling.', description: 'Watermark images locally with text or logos, rotation, tiled patterns and opacity controls. Supports safe static SVG logos and PNG, JPEG, WebP or device- and size-limited AVIF output.'},
  },
};
