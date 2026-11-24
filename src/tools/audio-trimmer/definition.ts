import type { ToolDefinition } from '../types';
export const definition = {
  id: 'audio-trimmer',
  slug: 'audio-trimmer',
  category: 'creative',
  group: 'audio-processing',
  roles: ['composer', 'animator'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '音频裁切',
      description: '通过可视化波形裁切音频，支持片段试听、淡入淡出及多格式导出。',
      summary: '精确选择音频片段，试听并保存裁切结果。',
    },
    en: {
      title: 'Audio Trimmer',
      description:
        'Trim audio with an interactive waveform, playback, fades and multiple export formats.',
      summary: 'Select, preview and export audio clips with precision.',
    },
  },
} satisfies ToolDefinition;
