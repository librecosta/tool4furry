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
  feedback: HomeMedia;
  collaboration: HomeMedia;
  tools: Readonly<Record<string, HomeMedia>>;
} = {
  feedback: { src: '/visuals/home/luminous-blue.avif', width: 500, height: 400, alt: { zh: '', en: '' } },
  collaboration: { src: '/visuals/home/luminous-purple.avif', width: 500, height: 400, alt: { zh: '', en: '' } },
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
  principlesTitle: '技术与工程',
  principlesIntro: 'Tool4Furry 基于 Astro、React 与 StyleX 构建，面向 Furry 创作者开发实用的浏览器工具。我们从浏览器原生图像处理起步，逐步拓展至创作流程中的更多任务。',
  principlesDetail: '在技术实现上，我们也将按需探索 WebAssembly、WebGL、WebGPU 与 Three.js，以支持更复杂的图像计算、实时渲染和交互式创作。',
  principlesSource: '查看源代码',
};
const en: { [K in keyof typeof zh]: typeof zh[K] } = {
  demo: 'Development demo · not a tool',
  draft: 'Draft preview',
  roleEmpty: 'Tools for this section are on the way.',
  more: 'View more',
  principlesTitle: 'Technology & Engineering',
  principlesIntro: 'Tool4Furry is built with Astro, React, and StyleX to develop practical browser-based tools for furry creators. Starting with native browser image processing, we aim to support more tasks across the creative workflow.',
  principlesDetail: "On the technical side, we'll explore WebAssembly, WebGL, WebGPU, and Three.js as needed to support more advanced image computation, real-time rendering, and interactive creation.",
  principlesSource: 'View source code',
};
export const homepageCopy = { zh, en };

type EditorialStory = { id: 'feedback' | 'collaboration'; title: string; body: string; link: { label: string; href: string } };
export const homepageStories: Record<Locale, readonly EditorialStory[]> = {
  zh: [
    { id: 'feedback', title: '反馈与改进', body: '我们持续完善 Tool4Furry 的功能与使用体验。如果你在使用过程中遇到问题，或有功能建议和新的工具需求，欢迎提交反馈。', link: { label: '提交反馈', href: 'https://github.com/librecosta/tool4furry/issues' } },
    { id: 'collaboration', title: '交流与合作', body: '我们欢迎与创作者、开发者及社群组织交流。有关工具开发、技术协作或项目合作，可通过邮件与我们联系。', link: { label: '联系我们', href: 'mailto:contact@librecosta.com' } },
  ],
  en: [
    { id: 'feedback', title: 'Feedback & Improvements', body: "We continue to improve Tool4Furry's features and usability. If you encounter an issue, have a suggestion, or would like to request a new tool, we'd welcome your feedback.", link: { label: 'Submit feedback', href: 'https://github.com/librecosta/tool4furry/issues' } },
    { id: 'collaboration', title: 'Contact & Collaboration', body: 'We welcome discussions with creators, developers, and community organizations. For tool development, technical collaboration, or project proposals, please contact us by email.', link: { label: 'Contact us', href: 'mailto:contact@librecosta.com' } },
  ],
};

type HomepagePillar = { id: 'experience' | 'safety' | 'privacy'; title: string; description: string; links: readonly { label: string; href: string }[] };
export const homepagePillars: Record<Locale, readonly HomepagePillar[]> = {
  zh: [
    { id: 'experience', title: '体验优先', description: '我们关心你操作的每一步，从使用者的角度出发用心打磨每一款工具。让清晰易懂的界面、及时准确的反馈带给你更好的交互体验。', links: [{ label: '浏览工具箱', href: '/tools/' }, { label: '关于项目', href: '/about/' }] },
    { id: 'safety', title: '安全优先', description: '从用户管理、支付到服务的权限边界，我们严格遵守安全开发的业界标准，积极升级、维护我们的服务。', links: [{ label: '问题反馈', href: 'https://github.com/librecosta/tool4furry/issues' }, { label: '安全漏洞报告', href: 'mailto:contact@librecosta.com' }] },
    { id: 'privacy', title: '隐私优先', description: '我们坚持最小化必要的数据收集，优先让素材在浏览器本地处理并且核心代码开源。用户有权了解自己的数据如何被使用、保存与保护。', links: [{ label: '隐私说明', href: '/privacy/' }, { label: '使用条款', href: '/terms/' }] },
  ],
  en: [
    { id: 'experience', title: 'Experience First', description: "We care about every step of your experience, thoughtfully refining each tool from the user's perspective. Clear, intuitive interfaces and timely, accurate feedback help make every interaction better.", links: [{ label: 'Browse toolbox', href: '/tools/' }, { label: 'About the project', href: '/about/' }] },
    { id: 'safety', title: 'Security First', description: 'From account management and payments to service access boundaries, we strictly follow industry standards for secure development and proactively update and maintain our services.', links: [{ label: 'Report an issue', href: 'https://github.com/librecosta/tool4furry/issues' }, { label: 'Report a vulnerability', href: 'mailto:contact@librecosta.com' }] },
    { id: 'privacy', title: 'Privacy First', description: 'We are committed to minimizing the data we collect, prioritizing local processing of assets in the browser, and keeping our core code open source. Users have the right to know how their data is used, stored, and protected.', links: [{ label: 'Privacy', href: '/privacy/' }, { label: 'Terms', href: '/terms/' }] },
  ],
};
