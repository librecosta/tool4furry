import type { ToolDefinition } from '../types';
export const definition = {
  id: 'markdown-editor',
  slug: 'markdown-editor',
  category: 'text',
  group: 'text-processing',
  roles: ['developer', 'operations', 'studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'Markdown 编辑器',
      summary: '在统一工作区编辑、预览并保存 Markdown 文档。',
      description: '编写 Markdown，实时预览排版，支持格式化编辑及 Markdown / HTML 导出。',
    },
    en: {
      title: 'Markdown Editor',
      summary: 'Edit, preview and save Markdown documents in a unified workspace.',
      description: 'Write Markdown with live preview, formatting tools and Markdown or HTML export.',
    },
  },
} satisfies ToolDefinition;
