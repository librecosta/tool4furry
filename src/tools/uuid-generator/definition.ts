import type { ToolDefinition } from '../types';
export const definition = {
  id: 'uuid-generator',
  slug: 'uuid-generator',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'UUID 生成器',
      summary: '使用安全随机数生成单个或批量 UUIDv4。',
      description: '使用安全随机数生成单个或批量 UUIDv4。',
    },
    en: {
      title: 'UUID Generator',
      summary:
        'Generate individual or batch UUIDv4 values using secure randomness.',
      description:
        'Generate individual or batch UUIDv4 values using secure randomness.',
    },
  },
} satisfies ToolDefinition;
