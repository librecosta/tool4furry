import type { ToolDefinition } from '../types';
export const definition = {
  id: 'text-cleaner',
  slug: 'text-cleaner',
  category: 'text',
  group: 'text-processing',
  roles: ['operations', 'studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文本清理',
      description: '实时清理文本空白、空行与换行符，支持快速和高级模式。',
      summary: '粘贴文本实时清理，保留缩进并支持 LF/CRLF。',
    },
    en: {
      title: 'Text Cleaner',
      description:
        'Clean whitespace, blank lines and line endings with live previews.',
      summary: 'Paste text, preview cleanup and choose LF or CRLF output.',
    },
  },
} satisfies ToolDefinition;
