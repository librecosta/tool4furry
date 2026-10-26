import type { ToolDefinition } from '../types';
// Firefox/WebKit/mobile and resource release gates have not passed.
export const imageConverterDefinition: ToolDefinition = {
  id: 'image-converter',
  slug: 'image-converter',
  category: 'images',
  group: 'image-processing',
  audiences: ['creator', 'developer'],
  contexts: ['studio'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '图片格式转换',
      description:
        '在浏览器本地转换静态 PNG、JPEG、WebP，保持分辨率，按实际编码能力输出。',
    },
    en: {
      title: 'Image Converter',
      description:
        'Convert static PNG, JPEG and WebP locally, keeping resolution and using verified browser export support.',
    },
  },
};
