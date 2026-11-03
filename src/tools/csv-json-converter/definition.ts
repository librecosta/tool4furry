import type { ToolDefinition } from '../types';
export const definition = {
  id: 'csv-json-converter',
  slug: 'csv-json-converter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer', 'operations', 'studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'CSV / JSON 转换',
      summary: '转换 CSV 与对象数组 JSON，预览表格并保留 CSV 字符串。',
      description: '转换 CSV 与对象数组 JSON，预览表格并保留 CSV 字符串。',
    },
    en: {
      title: 'CSV / JSON Converter',
      summary:
        'Convert CSV and JSON object arrays with a table preview and string-preserving CSV input.',
      description:
        'Convert CSV and JSON object arrays with a table preview and string-preserving CSV input.',
    },
  },
} satisfies ToolDefinition;
