import type { ToolDefinition } from '../types';
export const definition = {
  id: 'text-diff',
  slug: 'text-diff',
  category: 'text',
  group: 'text-processing',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文本对比',
      description: '逐行比较文本，查看新增与删除内容。',
      summary: '逐行比较文本，查看新增与删除内容。',
    },
    en: {
      title: 'Text Diff',
      description: 'Compare texts line by line to see additions and removals.',
      summary: 'Compare texts line by line to see additions and removals.',
    },
  },
} satisfies ToolDefinition;
