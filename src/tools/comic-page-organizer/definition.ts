import type { ToolDefinition } from '../types';

export const comicPageOrganizerDefinition: ToolDefinition = {
  id: 'comic-page-organizer', slug: 'comic-page-organizer',
  category: 'images', group: 'image-processing',
  roles: ['painter', 'animator'], audiences: ['creator'], contexts: ['studio'],
  mode: 'form', status: 'draft', regions: ['cn', 'global'],
  copy: {
    zh: { title: '漫画页整理', summary: '整理图片顺序，导出 ZIP 或 CBZ 漫画归档。', description: '在浏览器本地导入漫画页或文件夹，在画廊中拖动排序、多选删除、重置排序和逐页预览，并保留原始图片字节导出 ZIP 或 CBZ。' },
    en: { title: 'Comic Page Organizer', summary: 'Arrange image pages and export ZIP or CBZ archives.', description: 'Import images or folders locally, reorder them in a gallery, reset their order, select and remove pages, preview your comic, and export original image bytes as ZIP or CBZ.' },
  },
};
