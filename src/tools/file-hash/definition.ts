import type { ToolDefinition } from '../types';
export const definition = {
  id: 'file-hash',
  slug: 'file-hash',
  category: 'files',
  group: 'file-operations',
  roles: ['developer', 'studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '文件哈希',
      description: '批量计算 MD5、SHA 系列与 CRC32，支持本地哈希比对。',
      summary: '拖入文件自动计算哈希，支持多种算法与批量导出。',
    },
    en: {
      title: 'File Hash',
      description: 'Calculate MD5, SHA and CRC32 checksums locally for multiple files.',
      summary: 'Automatically hash files, compare checksums and export results.',
    },
  },
} satisfies ToolDefinition;
