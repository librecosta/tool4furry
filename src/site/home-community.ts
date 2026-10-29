import type { Region } from '../config/region';
import type { Locale } from '../i18n/locale';

type CommunityCard = {
  id: 'qq' | 'discord' | 'telegram' | 'support';
  title: string;
  description: string;
  note?: string;
  href?: string;
  action?: string;
  logo?: string;
  qr?: { src: string; width: number; height: number; alt: string };
};
const copy = {
  zh: {
    qq: 'QQ 交流群', qqDescription: '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。', qqHint: '使用 QQ 扫码加入', qqAlt: 'QQ 交流群二维码',
    discord: 'Discord 社群', discordHint: '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。', discordAction: '加入 Discord',
    telegram: 'Telegram 群组', telegramHint: '交流使用心得与功能想法，和其他创作者保持联系。', telegramAction: '加入 Telegram',
    support: '赞助与支持', supportDescription: '如果这些工具对你有所帮助，欢迎支持我们持续维护与开发。',
    afdianNote: '通过 GoFurry 的赞助页面', afdianAction: '前往爱发电',
    kofiNote: '通过 GoFurry 的赞助页面', kofiAction: '在 Ko-fi 支持我们',
  },
  en: {
    qq: 'QQ Group', qqDescription: 'Talk about tools, share creative ideas, and send feedback.', qqHint: 'Scan with QQ to join', qqAlt: 'QQ Group QR code',
    discord: 'Discord Community', discordHint: 'Talk tools, share creative ideas, and give feedback alongside fellow creators.', discordAction: 'Join Discord',
    telegram: 'Telegram Group', telegramHint: 'Discuss tool features, exchange ideas, and stay connected.', telegramAction: 'Join Telegram',
    support: 'Support the Project', supportDescription: "If our tools have been useful to you, you're welcome to support their ongoing development.",
    afdianNote: "Via GoFurry's Afdian page", afdianAction: 'Open Afdian',
    kofiNote: "Via GoFurry's Ko-fi page", kofiAction: 'Support on Ko-fi',
  },
};

/** Region selects platforms; Locale only selects the visible copy. */
export function getCommunityCards(region: Region, locale: Locale): readonly CommunityCard[] {
  const c = copy[locale];
  return [
    region === 'cn'
      ? { id: 'qq', title: c.qq, description: c.qqDescription, note: c.qqHint, qr: { src: '/community/QQ-Group.avif', width: 128, height: 128, alt: c.qqAlt } }
      : { id: 'discord', title: c.discord, description: c.discordHint, href: 'https://discord.gg/gEEgV8pkS', action: c.discordAction, logo: '/community/discord.png' },
    { id: 'telegram', title: c.telegram, description: c.telegramHint, href: 'https://t.me/+-Fn3F3hprS8wY2M9', action: c.telegramAction, logo: '/community/telegram.png' },
    region === 'cn'
      ? { id: 'support', title: c.support, description: c.supportDescription, note: c.afdianNote, href: 'https://afdian.com/a/gofurry', action: c.afdianAction, logo: '/community/afdian.png' }
      : { id: 'support', title: c.support, description: c.supportDescription, note: c.kofiNote, href: 'https://ko-fi.com/gofurry', action: c.kofiAction, logo: '/community/ko-fi.png' },
  ];
}
