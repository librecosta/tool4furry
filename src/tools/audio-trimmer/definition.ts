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
      description: '试听音频范围，导出真实 PCM WAV 文件。',
      summary: '试听音频范围，导出真实 PCM WAV 文件。',
    },
    en: {
      title: 'Audio Trimmer',
      description:
        'Audition an audio selection and export a real PCM WAV file.',
      summary: 'Audition an audio selection and export a real PCM WAV file.',
    },
  },
} satisfies ToolDefinition;
