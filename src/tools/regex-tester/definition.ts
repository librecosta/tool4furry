import type { ToolDefinition } from '../types';
export const definition = {
  id: 'regex-tester',
  slug: 'regex-tester',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '正则测试',
      summary: '测试 JavaScript 正则，查看匹配与替换结果。',
      description: '测试 JavaScript 正则，查看匹配与替换结果。',
    },
    en: {
      title: 'Regex Tester',
      summary: 'Test JavaScript regular expressions, matches and replacements.',
      description:
        'Test JavaScript regular expressions, matches and replacements.',
    },
  },
} satisfies ToolDefinition;
