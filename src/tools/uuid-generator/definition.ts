import type { ToolDefinition } from '../types';
export const definition = {
  id: 'uuid-generator',
  slug: 'uuid-generator',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'UUID 生成器',
      summary: '生成、转换与验证 UUID。',
      description: '快速或批量生成多版本 UUID，支持格式转换、验证及时间戳解析。',
    },
    en: {
      title: 'UUID Generator',
      summary: 'Generate, convert and validate UUIDs.',
      description: 'Generate individual or batch UUIDs across multiple versions, convert formats, validate identifiers and decode timestamps.',
    },
  },
} satisfies ToolDefinition;
