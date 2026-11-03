import type { ToolDefinition } from '../types';
export const definition = {
  id: 'subtitle-tools',
  slug: 'subtitle-tools',
  category: 'text',
  group: 'subtitles',
  roles: ['animator', 'operations'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '字幕工具',
      description: '转换 SRT 与 WebVTT，整体平移字幕时间。',
      summary: '转换 SRT 与 WebVTT，整体平移字幕时间。',
    },
    en: {
      title: 'Subtitle Tools',
      description: 'Convert SRT and WebVTT and shift cue timing.',
      summary: 'Convert SRT and WebVTT and shift cue timing.',
    },
  },
} satisfies ToolDefinition;
