import { describe, expect, it } from 'vitest';
import { getCommunityCards } from '../src/site/home-community';
import qq from '../src/assets/community/QQ-Group.avif?url&no-inline';
import discord from '../src/assets/community/discord.png?url&no-inline';
import telegram from '../src/assets/community/telegram.png?url&no-inline';
import gofurry from '../src/assets/community/gofurry-favicon.png?url&no-inline';

describe('regional community platforms with independent locale copy', () => {
  it.each(['zh', 'en'] as const)('keeps QQ and Telegram on CN/%s', locale => {
    const cards = getCommunityCards('cn', locale);
    expect(cards.map(card => card.id)).toEqual(['qq', 'telegram', 'gofurry']);
    expect(cards[0].title).toBe(locale === 'zh' ? 'QQ 交流群' : 'QQ Group');
    expect(cards[0].qr).toMatchObject({ src: qq, width: 128, height: 128 });
    expect(cards[0].href).toBeUndefined();
    expect(cards[1].href).toBe('https://t.me/+-Fn3F3hprS8wY2M9');
    expect(cards.map(card => card.logo)).toEqual([undefined, telegram, gofurry]);
    expect(cards[0].description).toBe(locale === 'zh' ? '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。' : 'Talk about tools, share creative ideas, and send feedback.');
    expect(cards[0].note).toBe(locale === 'zh' ? '使用 QQ 扫码加入' : 'Scan with QQ to join');
  });
  it.each(['zh', 'en'] as const)('keeps Discord and Telegram on Global/%s', locale => {
    const cards = getCommunityCards('global', locale);
    expect(cards.map(card => card.id)).toEqual(['discord', 'telegram', 'gofurry']);
    expect(cards[0].title).toBe(locale === 'zh' ? 'Discord 社群' : 'Discord Community');
    expect(cards.every(card => !card.qr)).toBe(true);
    expect(cards.slice(0, 2).map(card => card.href)).toEqual(['https://discord.gg/gEEgV8pkS', 'https://t.me/+-Fn3F3hprS8wY2M9']);
    expect(cards.map(card => card.logo)).toEqual([discord, telegram, gofurry]);
    expect(cards[0].description).toBe(locale === 'zh' ? '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。' : 'Talk tools, share creative ideas, and give feedback alongside fellow creators.');
  });
  it.each(['zh', 'en'] as const)('shares the Telegram copy and localized GoFurry card on both regions/%s', locale => {
    for (const region of ['cn', 'global'] as const) {
      const cards = getCommunityCards(region, locale);
      expect(cards[1].description).toBe(locale === 'zh' ? '交流使用心得与功能想法，和其他创作者保持联系。' : 'Discuss tool features, exchange ideas, and stay connected.');
      expect(cards[2]).toEqual({
        id: 'gofurry',
        title: locale === 'zh' ? '发现精彩的兽圈网站' : 'Discover the furry web',
        description: locale === 'zh' ? '探索兽圈画廊、社群和游戏，找到你想逛的下一个网站。' : 'Find furry art galleries, communities, and games all in one directory.',
        action: locale === 'zh' ? '探索 GoFurry' : 'Explore GoFurry',
        href: locale === 'zh' ? 'https://go-furry.com/zh' : 'https://go-furry.com/',
        logo: gofurry,
      });
    }
  });
});
