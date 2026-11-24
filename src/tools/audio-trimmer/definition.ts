import type { ToolDefinition } from '../types';
export const definition = {
  id: 'audio-trimmer',
  slug: 'audio-trimmer',
  category: 'creative',
  group: 'audio-processing',
  roles: ['composer', 'animator'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '音频裁切',
      description: '在波形上裁切并试听音频，按浏览器能力导出。',
      summary: '在波形上裁切并试听音频，按浏览器能力导出。',
    },
    en: {
      title: 'Audio Trimmer',
      description:
        'Trim and preview audio on a waveform, then export in an available format.',
      summary: 'Trim and preview audio on a waveform, then export in an available format.',
    },
  },
} satisfies ToolDefinition;
