import type { ToolDefinition } from '../types';
export const definition = {
  id: 'qr-code-generator',
  slug: 'qr-code-generator',
  category: 'creative',
  group: 'design-utilities',
  roles: ['operations', 'developer'],
  mode: 'form',
  status: 'draft',
  regions: ['cn', 'global'],
  copy: {
    zh: {
      title: '二维码生成',
      description: '将文本或网址生成 PNG 与 SVG 二维码。',
      summary: '将文本或网址生成 PNG 与 SVG 二维码。',
    },
    en: {
      title: 'QR Code Generator',
      description: 'Create PNG and SVG QR codes from text or URLs.',
      summary: 'Create PNG and SVG QR codes from text or URLs.',
    },
  },
} satisfies ToolDefinition;
