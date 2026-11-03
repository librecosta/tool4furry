import type { ToolDefinition } from '../types';
export const definition = {
  id: 'video-frame-extractor',
  slug: 'video-frame-extractor',
  category: 'creative',
  group: 'design-utilities',
  roles: ['animator', 'operations'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '视频取帧',
      summary: '从本地视频提取当前画面或按间隔导出图片。',
      description: '从本地视频提取当前画面或按间隔导出图片。',
    },
    en: {
      title: 'Video Frame Extractor',
      summary: 'Extract a frame or interval-based images from a local video.',
      description:
        'Extract a frame or interval-based images from a local video.',
    },
  },
} satisfies ToolDefinition;
