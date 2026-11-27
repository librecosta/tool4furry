import type { ToolDefinition } from '../types';
export const definition = {
  id: 'code-image-generator',
  slug: 'code-image-generator',
  category: 'creative',
  group: 'design-utilities',
  roles: ['developer', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '代码分享图',
      summary: '自由设计代码分享图，支持多格式高清导出。',
      description: '使用语法高亮、艺术预设和创意背景生成精美代码图片。',
    },
    en: {
      title: 'Code Image Generator',
      summary: 'Design and export customizable, high-resolution code screenshots.',
      description: 'Create beautiful code images with syntax highlighting, art presets and creative backgrounds.',
    },
  },
} satisfies ToolDefinition;
