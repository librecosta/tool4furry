import type { ToolDefinition } from '../types';
export const imageCompressorDefinition: ToolDefinition = {
  id: 'image-compressor', slug: 'image-compressor', category: 'images', group: 'image-processing',
  roles: ['painter', 'developer', 'animator', 'operations'], audiences: ['creator', 'developer'], contexts: ['studio'],
  mode: 'form', status: 'published', regions: ['cn', 'global'],
  copy: {
    zh: { title: '图片压缩', summary: '在线批量压缩图片，在浏览器本地比较画质与文件大小。', description: '支持 JPEG、PNG、WebP 和受支持的静态 AVIF 输入，批量压缩、预览并下载图片或 ZIP。JPEG/WebP 可尝试目标大小，AVIF 输出受设备和尺寸限制；结果不保证更小。' },
    en: { title: 'Image Compressor', summary: 'Batch image compression with local quality and file-size comparison.', description: 'Compress images or batches locally, compare results and download images or a ZIP. JPEG/WebP support size targets; AVIF output depends on device and dimensions. Files may become larger.' },
  },
};
