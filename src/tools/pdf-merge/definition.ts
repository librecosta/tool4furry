import type { ToolDefinition } from '../types';
export const definition = {
  id: 'pdf-merge',
  slug: 'pdf-merge',
  category: 'documents',
  group: 'pdf-tools',
  roles: ['studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'PDF 合并',
      description: '在浏览器本地按自定顺序合并多个 PDF，无需上传。',
      summary: '在浏览器本地按自定顺序合并多个 PDF，无需上传。',
    },
    en: {
      title: 'PDF Merge',
      description: 'Reorder and merge PDF files locally in your browser, without uploads.',
      summary: 'Reorder and merge PDF files locally in your browser, without uploads.',
    },
  },
} satisfies ToolDefinition;
