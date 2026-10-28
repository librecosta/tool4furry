import type { Region } from '../config/region';
import type { Locale } from '../i18n/locale';

type CommunityCard = {
  id: 'qq' | 'discord' | 'telegram' | 'support';
  title: string;
  description: string;
  href?: string;
  action?: string;
  qr?: { src: string; width: number; height: number; alt: string };
};
const copy = {
  zh: {
    qq: 'QQ 交流群', qqHint: '使用 QQ 扫码加入交流', qqAlt: 'QQ 交流群二维码',
    discord: 'Discord 社群', discordHint: '与社群交流工具与创作。', discordAction: '加入 Discord',
    telegram: 'Telegram 群组', telegramHint: '交流工具与创作中的想法。', telegramAction: '加入 Telegram',
    support: '赞助与支持', afdianHint: '当前前往 GoFurry 爱发电页面', afdianAction: '前往爱发电',
    internationalSupport: '赞助与支持', kofiHint: '当前前往 GoFurry 的 Ko-fi 页面', kofiAction: '在 Ko-fi 支持我们',
  },
  en: {
    qq: 'QQ Group', qqHint: 'Scan with QQ to join', qqAlt: 'QQ Group QR code',
    discord: 'Discord Community', discordHint: 'Talk tools and creative work with the community.', discordAction: 'Join Discord',
    telegram: 'Telegram Group', telegramHint: 'Share ideas about tools and creative work.', telegramAction: 'Join Telegram',
    support: 'Support', afdianHint: 'Currently links to GoFurry on Afdian', afdianAction: 'Open Afdian',
    internationalSupport: 'Support the Project', kofiHint: 'Currently links to GoFurry on Ko-fi', kofiAction: 'Support us on Ko-fi',
  },
};

/** Region selects platforms; Locale only selects the visible copy. */
export function getCommunityCards(region: Region, locale: Locale): readonly CommunityCard[] {
  const c = copy[locale];
  return [
    region === 'cn'
      ? { id: 'qq', title: c.qq, description: c.qqHint, qr: { src: '/community/QQ-Group.avif', width: 128, height: 128, alt: c.qqAlt } }
      : { id: 'discord', title: c.discord, description: c.discordHint, href: 'https://discord.gg/gEEgV8pkS', action: c.discordAction },
    { id: 'telegram', title: c.telegram, description: c.telegramHint, href: 'https://t.me/+-Fn3F3hprS8wY2M9', action: c.telegramAction },
    region === 'cn'
      ? { id: 'support', title: c.support, description: c.afdianHint, href: 'https://afdian.com/a/gofurry', action: c.afdianAction }
      : { id: 'support', title: c.internationalSupport, description: c.kofiHint, href: 'https://ko-fi.com/gofurry', action: c.kofiAction },
  ];
}
