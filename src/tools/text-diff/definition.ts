import type { ToolDefinition } from '../types';
export const definition = {
  id: 'text-diff',
  slug: 'text-diff',
  category: 'text',
  group: 'text-processing',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文本对比',
      description: '实时逐行对比文本，查看新增、删除和对应行号。',
      summary: '双栏编辑并查看文本差异，支持筛选变化与导出报告。',
    },
    en: {
      title: 'Text Diff',
      description: 'Compare text line by line with live additions, deletions and line numbers.',
      summary: 'Edit both versions, review changes and export a readable diff report.',
    },
  },
} satisfies ToolDefinition;
