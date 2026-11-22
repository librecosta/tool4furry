import type { Region } from '../config/region';
import type { Locale } from '../i18n/locale';
import qq from '../assets/community/QQ-Group.avif?url&no-inline';
import discord from '../assets/community/discord.png?url&no-inline';
import telegram from '../assets/community/telegram.png?url&no-inline';
import gofurry from '../assets/community/gofurry-favicon.png?url&no-inline';

type CommunityCard = {
  id: 'qq' | 'discord' | 'telegram' | 'gofurry';
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
    gofurry: '发现精彩的兽圈网站', gofurryDescription: '探索兽圈画廊、社群和游戏，找到你想逛的下一个网站。', gofurryAction: '探索 GoFurry',
  },
  en: {
    qq: 'QQ Group', qqDescription: 'Talk about tools, share creative ideas, and send feedback.', qqHint: 'Scan with QQ to join', qqAlt: 'QQ Group QR code',
    discord: 'Discord Community', discordHint: 'Talk tools, share creative ideas, and give feedback alongside fellow creators.', discordAction: 'Join Discord',
    telegram: 'Telegram Group', telegramHint: 'Discuss tool features, exchange ideas, and stay connected.', telegramAction: 'Join Telegram',
    gofurry: 'Discover the furry web', gofurryDescription: 'Find furry art galleries, communities, and games all in one directory.', gofurryAction: 'Explore GoFurry',
  },
};

/** Region selects community platforms; Locale selects copy and the GoFurry language. */
export function getCommunityCards(region: Region, locale: Locale): readonly CommunityCard[] {
  const c = copy[locale];
  return [
    region === 'cn'
      ? { id: 'qq', title: c.qq, description: c.qqDescription, note: c.qqHint, qr: { src: qq, width: 128, height: 128, alt: c.qqAlt } }
      : { id: 'discord', title: c.discord, description: c.discordHint, href: 'https://discord.gg/gEEgV8pkS', action: c.discordAction, logo: discord },
    { id: 'telegram', title: c.telegram, description: c.telegramHint, href: 'https://t.me/+-Fn3F3hprS8wY2M9', action: c.telegramAction, logo: telegram },
    { id: 'gofurry', title: c.gofurry, description: c.gofurryDescription, href: locale === 'zh' ? 'https://go-furry.com/zh' : 'https://go-furry.com/', action: c.gofurryAction, logo: gofurry },
  ];
}
