import type { ToolDefinition } from '../types';
export const definition = {
  id: 'text-cleaner',
  slug: 'text-cleaner',
  category: 'text',
  group: 'text-processing',
  roles: ['operations', 'studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文本清理',
      description: '清理空白与换行，对比处理前后文本。',
      summary: '清理空白与换行，对比处理前后文本。',
    },
    en: {
      title: 'Text Cleaner',
      description:
        'Clean whitespace and line endings, with before-and-after text.',
      summary: 'Clean whitespace and line endings, with before-and-after text.',
    },
  },
} satisfies ToolDefinition;
