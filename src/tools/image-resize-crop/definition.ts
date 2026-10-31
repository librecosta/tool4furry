import type { ToolDefinition } from '../types';
export const imageResizeCropDefinition: ToolDefinition = {
  id: 'image-resize-crop',
  slug: 'image-resize-crop',
  category: 'images',
  group: 'image-processing',
  roles: ['painter', 'developer', 'animator', 'operations'],
  audiences: ['creator', 'developer'],
  contexts: ['studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片尺寸与裁剪',
      summary: '在浏览器本地裁剪图片并调整像素尺寸。',
      description:
        '单张图片自由或按比例裁剪，精确调整宽高和百分比，预览并导出 PNG、JPEG 或 WebP。图片不上传。',
    },
    en: {
      title: 'Image Resize & Crop',
      summary: 'Crop and resize an image locally in your browser.',
      description:
        'Crop one image freely or to an aspect ratio, set exact dimensions or a percentage, preview and export PNG, JPEG or WebP without uploading.',
    },
  },
};
