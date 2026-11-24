import type { ToolDefinition } from '../types';
export const definition = {
  id: 'color-contrast',
  slug: 'color-contrast',
  category: 'creative',
  group: 'design-utilities',
  roles: ['painter', 'developer'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '颜色与对比度',
      description: '转换 HEX、RGB、HSL，检测 WCAG 对比度并获取颜色修正建议。',
      summary: '实时预览配色、检查可读性并调整颜色。',
    },
    en: {
      title: 'Color & Contrast',
      description: 'Convert HEX, RGB and HSL colors, check WCAG contrast, and find color adjustments.',
      summary: 'Preview color combinations, check readability, and adjust colors in real time.',
    },
  },
} satisfies ToolDefinition;
