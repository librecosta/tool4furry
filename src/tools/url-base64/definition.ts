import type { ToolDefinition } from '../types';
export const definition = {
  id: 'url-base64',
  slug: 'url-base64',
  category: 'development',
  group: 'developer-utilities',
  roles: ['developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'URL 与 Base64',
      description: '实时进行 URL 和 Base64 文本编解码，支持 UTF-8、Base64URL 与高级编码规则。',
      summary: '选择编码方式和方向，实时转换文本并复制或下载。',
    },
    en: {
      title: 'URL & Base64',
      description: 'Encode and decode URL and Base64 text with UTF-8 and advanced codec options.',
      summary: 'Switch codecs and directions, convert text live, and copy or download results.',
    },
  },
} satisfies ToolDefinition;
