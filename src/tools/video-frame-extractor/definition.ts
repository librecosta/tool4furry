import type { ToolDefinition } from '../types';
export const definition = {
  id: 'video-frame-extractor',
  slug: 'video-frame-extractor',
  category: 'creative',
  group: 'design-utilities',
  roles: ['animator', 'operations'],
  mode: 'form',
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '视频取帧',
      summary: '从本地视频提取、整理并导出图片。',
      description: '精确提取视频画面，支持单帧截图、批量提取及视频帧联系表。',
    },
    en: {
      title: 'Video Frame Extractor',
      summary: 'Capture, organize and export frames from local videos.',
      description: 'Extract precise video frames, batch images and create contact sheets.',
    },
  },
} satisfies ToolDefinition;
