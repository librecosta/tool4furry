import type { ToolDefinition } from '../types';
export const definition = {
  id: 'pdf-merge',
  slug: 'pdf-merge',
  category: 'documents',
  group: 'pdf-tools',
  roles: ['studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'PDF 合并',
      description: '按顺序合并多个 PDF。',
      summary: '按顺序合并多个 PDF。',
    },
    en: {
      title: 'PDF Merge',
      description: 'Combine PDF files in your chosen order.',
      summary: 'Combine PDF files in your chosen order.',
    },
  },
} satisfies ToolDefinition;
