import type { ToolDefinition } from '../types';
export const imageCompressorDefinition: ToolDefinition = {
  id: 'image-compressor', slug: 'image-compressor', category: 'images', group: 'image-processing',
  roles: ['painter', 'developer', 'animator', 'operations'], audiences: ['creator', 'developer'], contexts: ['studio'],
  mode: 'form', status: 'draft', regions: ['cn', 'global'],
  copy: {
    zh: { title: '图片压缩', summary: '调整质量或目标大小，在本地压缩单张和多张图片。', description: '压缩 JPEG、PNG、WebP 和受支持的静态 AVIF 图片，比较实际大小，下载图片或 ZIP。目标大小采用有限次尝试，不保证一定达到。' },
    en: { title: 'Image Compressor', summary: 'Compress individual images or batches locally with quality or size targets.', description: 'Compress JPEG, PNG, WebP and supported static AVIF images, compare actual file sizes and download images or a ZIP. Size targets use bounded attempts and are not guaranteed.' },
  },
};
