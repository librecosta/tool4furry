import type { ToolDefinition } from '../types';
export const definition = {
  id: 'batch-file-renamer',
  slug: 'batch-file-renamer',
  category: 'files',
  group: 'file-operations',
  roles: ['studio', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '批量文件重命名',
      description: '预览命名规则并下载保留原始字节的 ZIP。',
      summary: '预览命名规则并下载保留原始字节的 ZIP。',
    },
    en: {
      title: 'Batch File Renamer',
      description:
        'Preview naming rules and download a ZIP with unchanged file bytes.',
      summary:
        'Preview naming rules and download a ZIP with unchanged file bytes.',
    },
  },
} satisfies ToolDefinition;
