import type { ToolDefinition } from '../types';
export const definition = {
  id: 'color-contrast',
  slug: 'color-contrast',
  category: 'creative',
  group: 'design-utilities',
  roles: ['painter', 'developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '颜色与对比度',
      description: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
      summary: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
    },
    en: {
      title: 'Color & Contrast',
      description: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
      summary: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
    },
  },
} satisfies ToolDefinition;
