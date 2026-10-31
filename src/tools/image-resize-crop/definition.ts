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
  status: 'published',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片尺寸与裁剪',
      summary: '在浏览器本地裁剪、调整尺寸或批量缩放图片。',
      description:
        '单张裁剪与精确尺寸调整，多图按宽度、高度、最长边或百分比批量缩放，下载 PNG、JPEG、WebP 或 ZIP。图片不上传。',
    },
    en: {
      title: 'Image Resize & Crop',
      summary: 'Crop, resize or batch resize images locally in your browser.',
      description:
        'Crop individual images or batch resize by width, height, longest edge or percentage. Download PNG, JPEG, WebP or ZIP without uploading.',
    },
  },
};
