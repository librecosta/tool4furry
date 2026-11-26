import type { ToolDefinition } from '../types';
export const definition = {
  id: 'csv-json-converter',
  slug: 'csv-json-converter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer', 'operations', 'studio'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'CSV / JSON 转换',
      summary: '转换、检查并导出 CSV、TSV 和 JSON 数据。',
      description: '双向转换 CSV 与 JSON，支持数据类型设置、数字精度保真及表格预览。',
    },
    en: {
      title: 'CSV / JSON Converter',
      summary: 'Convert, inspect and export CSV, TSV and JSON data.',
      description: 'Convert CSV and JSON with configurable data types, numeric precision and table previews.',
    },
  },
} satisfies ToolDefinition;
