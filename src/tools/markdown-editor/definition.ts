import type { ToolDefinition } from '../types';
export const definition = {
  id: 'markdown-editor',
  slug: 'markdown-editor',
  category: 'text',
  group: 'text-processing',
  roles: ['developer', 'operations', 'studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'Markdown 编辑器',
      summary: '编写 Markdown，实时预览并保存文档。',
      description: '编写 Markdown，实时预览并保存文档。',
    },
    en: {
      title: 'Markdown Editor',
      summary: 'Write Markdown with a live preview and save your document.',
      description: 'Write Markdown with a live preview and save your document.',
    },
  },
} satisfies ToolDefinition;
