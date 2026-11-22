import type { ToolDefinition } from '../types';
export const definition = {
  id: 'json-formatter',
  slug: 'json-formatter',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'JSON 格式化',
      description: '实时校验、格式化和压缩 JSON，支持语法诊断与树形结构查看。',
      summary: '编辑并校验 JSON，查看格式化结果或浏览可折叠的数据树。',
    },
    en: {
      title: 'JSON Formatter',
      description:
        'Validate, format and minify JSON with syntax diagnostics and tree browsing.',
      summary:
        'Edit JSON, inspect errors and explore its structure in a collapsible tree.',
    },
  },
} satisfies ToolDefinition;
