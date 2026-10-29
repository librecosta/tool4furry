import { describe, expect, it } from 'vitest';
import { getCommunityCards } from '../src/site/home-community';

describe('regional community platforms with independent locale copy', () => {
  it.each(['zh', 'en'] as const)('keeps QQ and the disclosed GoFurry support destination on CN/%s', locale => {
    const cards = getCommunityCards('cn', locale);
    expect(cards.map(card => card.id)).toEqual(['qq', 'telegram', 'support']);
    expect(cards[0].title).toBe(locale === 'zh' ? 'QQ 交流群' : 'QQ Group');
    expect(cards[0].qr).toMatchObject({ src: '/community/QQ-Group.avif', width: 128, height: 128 });
    expect(cards[0].href).toBeUndefined();
    expect(cards.filter(card => card.href).map(card => card.href)).toEqual(['https://t.me/+-Fn3F3hprS8wY2M9', 'https://afdian.com/a/gofurry']);
    expect(cards[2].note).toBe(locale === 'zh' ? '通过 GoFurry 的赞助页面' : "Via GoFurry's Afdian page");
    expect(cards[2].description).not.toContain('GoFurry');
    expect(cards[2].title).toBe(locale === 'zh' ? '赞助与支持' : 'Support the Project');
    expect(cards.map(card => card.logo)).toEqual([undefined, '/community/telegram.png', '/community/afdian.png']);
    expect(cards[0].description).toBe(locale === 'zh' ? '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。' : 'Talk about tools, share creative ideas, and send feedback.');
    expect(cards[0].note).toBe(locale === 'zh' ? '使用 QQ 扫码加入' : 'Scan with QQ to join');
    expect(cards[2].action).toBe(locale === 'zh' ? '前往爱发电' : 'Open Afdian');
  });
  it.each(['zh', 'en'] as const)('keeps Discord and the supplied GoFurry Ko-fi destination on Global/%s', locale => {
    const cards = getCommunityCards('global', locale);
    expect(cards.map(card => card.id)).toEqual(['discord', 'telegram', 'support']);
    expect(cards[0].title).toBe(locale === 'zh' ? 'Discord 社群' : 'Discord Community');
    expect(cards.every(card => !card.qr)).toBe(true);
    expect(cards.filter(card => card.href).map(card => card.href)).toEqual(['https://discord.gg/gEEgV8pkS', 'https://t.me/+-Fn3F3hprS8wY2M9', 'https://ko-fi.com/gofurry']);
    expect(cards[2].note).toBe(locale === 'zh' ? '通过 GoFurry 的赞助页面' : "Via GoFurry's Ko-fi page");
    expect(cards.map(card => card.logo)).toEqual(['/community/discord.png', '/community/telegram.png', '/community/ko-fi.png']);
    expect(cards[0].description).toBe(locale === 'zh' ? '聊聊工具的使用体验，分享创作中的灵感，也欢迎提出建议。' : 'Talk tools, share creative ideas, and give feedback alongside fellow creators.');
    expect(cards[2].action).toBe(locale === 'zh' ? '在 Ko-fi 支持我们' : 'Support on Ko-fi');
  });
  it.each(['zh', 'en'] as const)('keeps the frozen shared copy on both regions/%s', locale => {
    for (const region of ['cn', 'global'] as const) {
      const cards = getCommunityCards(region, locale);
      expect(cards[1].description).toBe(locale === 'zh' ? '交流使用心得与功能想法，和其他创作者保持联系。' : 'Discuss tool features, exchange ideas, and stay connected.');
      expect(cards[2].description).toBe(locale === 'zh' ? '如果这些工具对你有所帮助，欢迎支持我们持续维护与开发。' : "If our tools have been useful to you, you're welcome to support their ongoing development.");
    }
  });
});
