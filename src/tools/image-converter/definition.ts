import type { ToolDefinition } from '../types';
// Source-level Beta accepted; both regional static builds are ready, not deployed.
export const imageConverterDefinition: ToolDefinition = {
  id: 'image-converter',
  slug: 'image-converter',
  category: 'images',
  group: 'image-processing',
  roles: ['painter', 'developer', 'animator', 'operations'],
  audiences: ['creator', 'developer'],
  contexts: ['studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片格式转换',
      summary: '在浏览器本地转换 PNG、JPEG、WebP 和 AVIF 图片。',
      description:
        '批量转换 PNG、JPEG、WebP 和受支持的 AVIF 静态图片，支持质量调整、预览与下载，默认清理常见隐私元数据。',
    },
    en: {
      title: 'Image Converter',
      summary: 'Convert PNG, JPEG, WebP and AVIF images locally.',
      description:
        'Batch-convert PNG, JPEG, WebP and supported AVIF images in your browser. Adjust quality, preview and download results, with common private metadata removed by default.',
    },
  },
};
