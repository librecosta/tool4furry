import type { ToolDefinition } from '../types';
export const definition = {
  id: 'svg-converter',
  slug: 'svg-converter',
  category: 'creative',
  group: 'design-utilities',
  roles: ['painter', 'developer', 'animator'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: 'SVG 转换',
      summary: '在 SVG 与位图之间转换，或将图片封装进 SVG。',
      description: '栅格化静态 SVG、描摹位图轮廓或生成内嵌图片的 SVG。',
    },
    en: {
      title: 'SVG Converter',
      summary: 'Convert between SVG and raster images, or embed an image in SVG.',
      description: 'Rasterize static SVGs, trace bitmap outlines or create an SVG with an embedded image.',
    },
  },
} satisfies ToolDefinition;
