import type { ToolDefinition } from '../types';
export const definition = {
  id: 'timestamp-converter',
  slug: 'timestamp-converter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '时间戳转换',
      description: '双向转换 Unix 时间戳与日期，支持秒、毫秒、ISO 8601 和时区显示。',
      summary: '输入时间戳或选择日期，实时查看 UTC、本地时间及其他格式。',
    },
    en: {
      title: 'Timestamp Converter',
      description:
        'Convert Unix timestamps and dates with millisecond precision and time zone support.',
      summary: 'Enter a timestamp or date to view Unix, ISO, UTC and local time results.',
    },
  },
} satisfies ToolDefinition;
