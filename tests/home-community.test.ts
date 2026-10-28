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
    expect(cards[2].description).toContain('GoFurry');
    expect(cards[2].action).toBe(locale === 'zh' ? '前往爱发电' : 'Open Afdian');
  });
  it.each(['zh', 'en'] as const)('keeps Discord and the supplied GoFurry Ko-fi destination on Global/%s', locale => {
    const cards = getCommunityCards('global', locale);
    expect(cards.map(card => card.id)).toEqual(['discord', 'telegram', 'support']);
    expect(cards[0].title).toBe(locale === 'zh' ? 'Discord 社群' : 'Discord Community');
    expect(cards.every(card => !card.qr)).toBe(true);
    expect(cards.filter(card => card.href).map(card => card.href)).toEqual(['https://discord.gg/gEEgV8pkS', 'https://t.me/+-Fn3F3hprS8wY2M9', 'https://ko-fi.com/gofurry']);
    expect(cards[2].description).toContain('GoFurry');
    expect(cards[2].action).toBe(locale === 'zh' ? '在 Ko-fi 支持我们' : 'Support us on Ko-fi');
  });
});
