import type { ToolDefinition } from '../types';
export const definition = {
  id: 'regex-tester',
  slug: 'regex-tester',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '正则测试',
      summary: '在线测试正则表达式，匹配、替换与提取文本。',
      description: '实时测试正则表达式，查找、替换和提取文本，查看匹配结果与表达式解释。',
    },
    en: {
      title: 'Regex Tester',
      summary: 'Test regular expressions, find matches, replace and extract text.',
      description: 'Test regular expressions with live matching, text replacement, extraction and pattern explanations.',
    },
  },
} satisfies ToolDefinition;
