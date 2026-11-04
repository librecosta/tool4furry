import type { ToolDefinition } from '../types';
export const definition = {
  id: 'zip-manager',
  slug: 'zip-manager',
  category: 'files',
  group: 'file-operations',
  roles: ['studio', 'developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'ZIP 管理',
      description: '创建包含目录的 ZIP，浏览并提取现有归档。',
      summary: '创建包含目录的 ZIP，浏览并提取现有归档。',
    },
    en: {
      title: 'ZIP Manager',
      description:
        'Create ZIPs with folders, browse archives and extract files.',
      summary: 'Create ZIPs with folders, browse archives and extract files.',
    },
  },
} satisfies ToolDefinition;
