import type { ToolDefinition } from '../types';
export const definition = {
  id: 'code-image-generator',
  slug: 'code-image-generator',
  category: 'creative',
  group: 'design-utilities',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '代码分享图',
      summary: '将高亮代码与标题保存为 PNG 分享图。',
      description: '将高亮代码与标题保存为 PNG 分享图。',
    },
    en: {
      title: 'Code Image Generator',
      summary: 'Turn highlighted code and a title into a PNG share image.',
      description: 'Turn highlighted code and a title into a PNG share image.',
    },
  },
} satisfies ToolDefinition;
