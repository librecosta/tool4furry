import type { ToolDefinition } from '../types';
export const definition = {
  id: 'timestamp-converter',
  slug: 'timestamp-converter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '时间戳转换',
      description: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
      summary: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
    },
    en: {
      title: 'Timestamp Converter',
      description:
        'Convert Unix timestamps and ISO 8601 into UTC and local time.',
      summary: 'Convert Unix timestamps and ISO 8601 into UTC and local time.',
    },
  },
} satisfies ToolDefinition;
