import type { ToolDefinition } from '../types';
export const paletteExtractorDefinition: ToolDefinition = {
  id: 'palette-extractor',
  slug: 'palette-extractor',
  category: 'images',
  group: 'image-processing',
  roles: ['painter', 'animator', 'operations'],
  audiences: ['creator'],
  contexts: ['studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片调色板提取',
      summary: '发现作品中的配色，编辑色卡并制作分享图。',
      description:
        '在浏览器本地提取图片配色，手动取色、复制色值，使用三套模板导出 PNG 分享图。',
    },
    en: {
      title: 'Palette Extractor',
      summary:
        'Discover colors, edit your palette and create a shareable artwork.',
      description:
        'Extract image colors locally, sample and edit swatches, copy color values and export PNG artwork with three templates.',
    },
  },
};
