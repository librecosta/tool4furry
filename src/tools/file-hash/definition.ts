import type { ToolDefinition } from '../types';
export const definition = {
  id: 'file-hash',
  slug: 'file-hash',
  category: 'files',
  group: 'file-operations',
  roles: ['developer', 'studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文件哈希',
      description: '计算 SHA-256 并与预期哈希比较。',
      summary: '计算 SHA-256 并与预期哈希比较。',
    },
    en: {
      title: 'File Hash',
      description: 'Calculate SHA-256 and compare it with an expected hash.',
      summary: 'Calculate SHA-256 and compare it with an expected hash.',
    },
  },
} satisfies ToolDefinition;
