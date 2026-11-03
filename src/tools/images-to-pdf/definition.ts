import type { ToolDefinition } from '../types';
export const definition = {
  id: 'images-to-pdf',
  slug: 'images-to-pdf',
  category: 'documents',
  group: 'pdf-tools',
  roles: ['studio', 'painter'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片转 PDF',
      description: '按原图比例生成多页 PDF。',
      summary: '按原图比例生成多页 PDF。',
    },
    en: {
      title: 'Images to PDF',
      description: 'Create a multi-page PDF with original image proportions.',
      summary: 'Create a multi-page PDF with original image proportions.',
    },
  },
} satisfies ToolDefinition;
