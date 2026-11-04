import type { ToolDefinition } from '../types';
export const definition = {
  id: 'pdf-split',
  slug: 'pdf-split',
  category: 'documents',
  group: 'pdf-tools',
  roles: ['studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'PDF 拆分',
      description: '本地预览选页，提取 PDF 或将所选页面逐页打包 ZIP。',
      summary: '本地预览选页，提取 PDF 或将所选页面逐页打包 ZIP。',
    },
    en: {
      title: 'PDF Split',
      description:
        'Preview and select pages locally, then extract a PDF or a per-page ZIP.',
      summary: 'Preview and select pages locally, then extract a PDF or a per-page ZIP.',
    },
  },
} satisfies ToolDefinition;
