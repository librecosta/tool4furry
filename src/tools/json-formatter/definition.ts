import type { ToolDefinition } from '../types';
export const definition = {
  id: 'json-formatter',
  slug: 'json-formatter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'JSON 格式化',
      description: '校验、格式化或压缩 JSON，保留数字字面量。',
      summary: '校验、格式化或压缩 JSON，保留数字字面量。',
    },
    en: {
      title: 'JSON Formatter',
      description:
        'Validate, format or minify JSON while preserving numeric literals.',
      summary:
        'Validate, format or minify JSON while preserving numeric literals.',
    },
  },
} satisfies ToolDefinition;
