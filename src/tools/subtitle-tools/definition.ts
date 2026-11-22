import type { ToolDefinition } from '../types';
export const definition = {
  id: 'subtitle-tools',
  slug: 'subtitle-tools',
  category: 'text',
  group: 'subtitles',
  roles: ['animator', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '字幕工具',
      description: '可视化转换 SRT 与 WebVTT，支持字幕预览、时间调整和编辑。',
      summary: '导入字幕并逐条查看，转换格式或调整时间后下载。',
    },
    en: {
      title: 'Subtitle Tools',
      description: 'Convert SRT and WebVTT with visual cue previews and timing adjustments.',
      summary: 'Preview, edit and convert subtitles locally in your browser.',
    },
  },
} satisfies ToolDefinition;
