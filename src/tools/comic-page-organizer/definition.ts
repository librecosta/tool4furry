import type { ToolDefinition } from '../types';

export const comicPageOrganizerDefinition: ToolDefinition = {
  id: 'comic-page-organizer', slug: 'comic-page-organizer',
  category: 'images', group: 'image-processing',
  roles: ['painter', 'animator'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'published', regions: ['cn', 'global'],
  copy: {
    zh: { title: '漫画页整理', summary: '本地整理漫画页，导出 ZIP、CBZ 或 PDF。', description: '在浏览器本地拖动排序漫画与插画，自定义页面命名，按需统一图片格式和质量，导出 ZIP、CBZ 或独立 PDF。' },
    en: { title: 'Comic Page Organizer', summary: 'Arrange comic pages locally and export ZIP, CBZ or PDF.', description: 'Reorder comic pages and illustrations in your browser, customize archive page names, optionally convert image formats and adjust quality, or export a separate PDF.' },
  },
};
