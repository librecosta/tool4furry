import type { ToolDefinition } from '../types';
export const definition = {
  id: 'svg-to-png',
  slug: 'svg-to-png',
  category: 'creative',
  group: 'design-utilities',
  roles: ['painter', 'developer', 'animator'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'SVG 转 PNG',
      summary: '安全预览静态 SVG，按比例调整尺寸并导出 PNG。',
      description: '安全预览静态 SVG，按比例调整尺寸并导出 PNG。',
    },
    en: {
      title: 'SVG to PNG',
      summary:
        'Safely preview static SVGs, resize proportionally and export PNGs.',
      description:
        'Safely preview static SVGs, resize proportionally and export PNGs.',
    },
  },
} satisfies ToolDefinition;
