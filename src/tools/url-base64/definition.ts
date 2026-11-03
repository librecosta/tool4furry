import type { ToolDefinition } from '../types';
export const definition = {
  id: 'url-base64',
  slug: 'url-base64',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'URL 与 Base64',
      description: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
      summary: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
    },
    en: {
      title: 'URL & Base64',
      description: 'Encode or decode UTF-8 text using URL encoding or Base64.',
      summary: 'Encode or decode UTF-8 text using URL encoding or Base64.',
    },
  },
} satisfies ToolDefinition;
