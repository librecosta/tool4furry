import type { ToolDefinition } from '../types';
export const definition = {
  id: 'svg-converter',
  slug: 'svg-converter',
  category: 'creative',
  group: 'design-utilities',
  roles: ['painter', 'developer', 'animator'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'SVG 转换',
      summary: '在 SVG 与常见图片格式之间自由转换。',
      description: '转换 SVG 与位图，支持高清栅格化、矢量化、ICO 图标生成及图片封装。',
    },
    en: {
      title: 'SVG Converter',
      summary: 'Convert between SVG and common image formats.',
      description: 'Convert between SVG and raster images with high-resolution rasterization, vectorization, ICO generation and image embedding.',
    },
  },
} satisfies ToolDefinition;
