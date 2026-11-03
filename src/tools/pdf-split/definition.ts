import type { ToolDefinition } from '../types';
export const definition = {
  id: 'pdf-split',
  slug: 'pdf-split',
  category: 'documents',
  group: 'pdf-tools',
  roles: ['studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'PDF 拆分',
      description: '提取指定页码，或将每一页保存为独立 PDF。',
      summary: '提取指定页码，或将每一页保存为独立 PDF。',
    },
    en: {
      title: 'PDF Split',
      description:
        'Extract selected pages or save every page as a separate PDF.',
      summary: 'Extract selected pages or save every page as a separate PDF.',
    },
  },
} satisfies ToolDefinition;
