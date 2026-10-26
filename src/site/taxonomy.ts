export const domains = {
  images: { zh: '图像与素材', en: 'Images & Assets' },
  creative: { zh: '创作与设计', en: 'Creative & Design' },
  characters: { zh: '角色与设定', en: 'Characters & Worldbuilding' },
  text: { zh: '文本与写作', en: 'Text & Writing' },
  documents: { zh: '文档与办公', en: 'Documents & Office' },
  development: { zh: '开发与数据', en: 'Development & Data' },
  files: { zh: '文件与效率', en: 'Files & Productivity' },
} as const;
export type DomainId = keyof typeof domains;
export const groups = {
  'image-processing': {
    category: 'images',
    zh: '图片处理',
    en: 'Image Processing',
  },
} as const satisfies Record<
  string,
  { category: DomainId; zh: string; en: string }
>;
export type GroupId = keyof typeof groups;
export const audiences = {
  creator: {
    zh: '创作者',
    en: 'Creator',
    reason: {
      zh: '查找为素材与作品创作提供帮助的工具。',
      en: 'Find tools for assets and creative work.',
    },
  },
  developer: {
    zh: '开发者',
    en: 'Developer',
    reason: {
      zh: '查找适用于开发流程与格式处理的工具。',
      en: 'Find tools for development workflows and formats.',
    },
  },
  operator: {
    zh: '运营与管理',
    en: 'Operations',
    reason: {
      zh: '查找适用于内容运营和日常管理的工具。',
      en: 'Find tools for content operations and everyday management.',
    },
  },
} as const;
export type AudienceId = keyof typeof audiences;
export const contexts = {
  studio: {
    zh: '工作室',
    en: 'Studio',
    reason: {
      zh: '查找适用于作品生产与客户交付的工具。',
      en: 'Find tools for production and client delivery.',
    },
  },
  community: {
    zh: '社群',
    en: 'Community',
    reason: {
      zh: '查找适用于社群内容和资源组织的工具。',
      en: 'Find tools for community content and resources.',
    },
  },
} as const;
export type ContextId = keyof typeof contexts;
