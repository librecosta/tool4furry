import type { Region } from '../config/region';
import type { Locale } from '../i18n/locale';
import { getCatalogEntries, type CatalogEntry } from './catalog';
import { tools } from '../tools/registry';

type Localized = Record<Locale, string>;
type MediaCandidate = { src: `/${string}`; width: number };
export type HomeMedia = {
  src: `/${string}`;
  alt: Localized;
  width: number;
  height: number;
  focus?: string;
  sizes?: string;
  avif?: readonly MediaCandidate[];
  webp?: readonly MediaCandidate[];
};
export type RoleShowcase = {
  id: string;
  label: Localized;
  description: Localized;
  toolIds: readonly string[];
  media?: HomeMedia;
  icon?: HomeMedia;
};

// Local editorial slots only, never a publication list. Set a path after the
// approved file is delivered; absent files render geometry, never broken images.
export const homepageMedia: {
  featuredDecor?: HomeMedia;
  workflow?: HomeMedia;
  principles?: HomeMedia;
  tools: Readonly<Record<string, HomeMedia>>;
} = {
  tools: {},
};

export const roleShowcases: readonly RoleShowcase[] = [
  { id: 'painter', label: { zh: '画家', en: 'Artists' }, description: { zh: '从画布到交付素材', en: 'From the canvas to finished assets' }, toolIds: ['image-converter'] },
  { id: 'composer', label: { zh: '作曲家', en: 'Composers' }, description: { zh: '围绕声音的创作日常', en: 'The everyday work around sound' }, toolIds: [] },
  { id: 'developer', label: { zh: '开发者', en: 'Developers' }, description: { zh: '让创作与代码相遇', en: 'Where creative work meets code' }, toolIds: ['image-converter'] },
  { id: 'animator', label: { zh: '动画师', en: 'Animators' }, description: { zh: '每一帧都值得打磨', en: 'Every frame deserves care.' }, toolIds: ['image-converter'] },
  { id: 'operations', label: { zh: '运营', en: 'Community teams' }, description: { zh: '为内容与社群增添色彩', en: 'Bring more color to content and communities.' }, toolIds: ['image-converter'] },
  { id: 'studio', label: { zh: '工作室', en: 'Studios' }, description: { zh: '工作细节决定成败', en: 'Details make the difference.' }, toolIds: [] },
];

export function getRoleShowcases(region: Region, locale: Locale, dev = false, registry = tools, roles = roleShowcases) {
  const entries = new Map(getCatalogEntries(region, registry, dev, locale).map(entry => [entry.id, entry]));
  return roles.map(role => ({
    ...role,
    entries: [...new Set(role.toolIds)].flatMap(id => entries.has(id) ? [entries.get(id)!] : []).slice(0, 12),
  }));
}

// A presentation cap only: navigation retains getHomepageEntries' nine-item limit.
export function getFeaturedShowcase(entries: readonly CatalogEntry[], locale: Locale, dev = false) {
  const real = entries.slice(0, 4).map(entry => ({
    ...entry, description: entry.summary ?? entry.description, demo: false as const,
  }));
  if (!dev) return real;
  const examples = [
    { id: 'image-crop', title: { zh: '图片裁剪', en: 'Image Crop' } },
    { id: 'image-compress', title: { zh: '图片压缩', en: 'Image Compression' } },
    { id: 'color-picker', title: { zh: '颜色提取', en: 'Color Picker' } },
  ];
  return [...real, ...examples.filter(example => !entries.some(entry => entry.id === example.id)).map(example => ({
    id: example.id, title: example.title[locale], description: homepageCopy[locale].demo, demo: true as const,
  }))].slice(0, 4);
}

const zh = {
  demo: '开发演示 · 非工具',
  draft: '草稿预览',
  roleEmpty: '这个分区的工具正在准备中。',
  more: '查看更多',
  workflowTitle: '从素材，到处理，再到成果',
  workflowIntro: '一段创作流程里，整理和交付也值得被认真对待。工具应围绕具体任务展开，让你看清输入、处理与结果。',
  workflowSteps: ['准备素材', '按任务处理', '检查与交付'],
  workflowDetail: '先了解素材，再选择合适的处理方式；交付前确认结果。这里将用实际工具与作品呈现这段过程。',
  workflowPreview: '查看图片转换开发预览',
  principlesTitle: 'Tool4Furry 的设计与工程',
  principlesIntro: 'Tool4Furry 是 LibreCosta 为 Furry 创作者打造的浏览器工具箱。我们从具体的小任务出发，重视清楚的操作、克制的界面和真实可用的能力。',
  principlesDetail: '优先探索浏览器本地处理，让素材处理更贴近创作本身。具体的数据处理方式以每个工具的说明为准；前端代码开放，设计与实现也接受检验。',
  principlesNote: '轻量的页面，清楚的边界，逐步打磨的工具。',
};
const en: { [K in keyof typeof zh]: typeof zh[K] } = {
  demo: 'Development demo · not a tool',
  draft: 'Draft preview',
  roleEmpty: 'Tools for this section are on the way.',
  more: 'View more',
  workflowTitle: 'From assets, through processing, to results',
  workflowIntro: 'Preparation and delivery deserve the same care as creation. A tool should serve a specific task and make its input, processing and result clear.',
  workflowSteps: ['Prepare assets', 'Process for the task', 'Check and deliver'],
  workflowDetail: 'Understand the source, choose the right process, then check the result before delivery. This space will tell that story with real tools and work.',
  workflowPreview: 'Open the Image Converter development preview',
  principlesTitle: 'How we design and build Tool4Furry',
  principlesIntro: 'Tool4Furry is a browser toolbox by LibreCosta for furry creators. We start with specific, everyday tasks and value clear controls, restrained interfaces and capabilities that work.',
  principlesDetail: 'We prioritize processing in the browser where practical. Each tool explains how it handles data. The frontend code is open, so its design and implementation can be examined.',
  principlesNote: 'Light pages, clear boundaries and tools refined over time.',
};
export const homepageCopy = { zh, en };

type HomepagePillar = { id: string; title: string; description: string; links: readonly { label: string; href: string }[] };
export const homepagePillars: Record<Locale, readonly HomepagePillar[]> = {
  zh: [
    { id: 'experience', title: '体验优先', description: '让操作清晰，让反馈及时。', links: [{ label: '浏览工具箱', href: '/tools/' }, { label: '关于项目', href: '/about/' }] },
    { id: 'safety', title: '安全优先', description: '认真校验每一项输入，谨慎处理每一项结果。', links: [{ label: '问题反馈', href: 'https://github.com/librecosta/tool4furry/issues' }, { label: '安全漏洞报告', href: 'mailto:contact@librecosta.com' }] },
    { id: 'privacy', title: '隐私优先', description: '最小化必要数据，优先在浏览器本地处理。', links: [{ label: '隐私说明', href: '/privacy/' }, { label: '使用条款', href: '/terms/' }] },
  ],
  en: [
    { id: 'experience', title: 'Experience first', description: 'Clear controls. Timely feedback.', links: [{ label: 'Browse toolbox', href: '/tools/' }, { label: 'About the project', href: '/about/' }] },
    { id: 'safety', title: 'Safety first', description: 'Validate every input. Handle every result with care.', links: [{ label: 'Report an issue', href: 'https://github.com/librecosta/tool4furry/issues' }, { label: 'Report a vulnerability', href: 'mailto:contact@librecosta.com' }] },
    { id: 'privacy', title: 'Privacy first', description: 'Keep necessary data to a minimum. Prioritize processing in your browser.', links: [{ label: 'Privacy', href: '/privacy/' }, { label: 'Terms', href: '/terms/' }] },
  ],
};
