// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  batchTime,
  taskFilename,
  validFilenameLabel,
} from '../src/tools/file-naming';
const time = '20261021-154812123';
const name = (
  source = 'avatar.jpg',
  sequence = 1,
  label = '',
  extension = 'webp',
) => taskFilename({ time, sequence, source, label, extension });
describe('shared batch download naming', () => {
  it('formats local millisecond time and stable four-digit sequence', () => {
    expect(batchTime(new Date(2026, 9, 21, 15, 48, 12, 123))).toBe(time);
    expect(name().name).toBe(`t4f-${time}-0001-avatar.webp`);
    expect(name('a.jpg', 1).name).not.toBe(name('a.png', 2).name);
    expect(name('a.jpg', 10001).name).toContain('-10001-a.webp');
    expect(name('wrong.webp', 1, '', 'jpg').name).toBe(
      `t4f-${time}-0001-wrong.jpg`,
    );
  });
  it('preserves Chinese and Emoji and limits UTF-8 bytes without splitting codepoints', () => {
    expect(name('头像🐺.png', 2, '收藏').name).toBe(
      `t4f-${time}-0002-收藏-头像🐺.webp`,
    );
    for (const source of [
      'a'.repeat(400),
      '🐺'.repeat(100),
      '图片'.repeat(100),
    ]) {
      const value = name(`${source}.png`, 1, '标签🐺').name;
      expect(new TextEncoder().encode(value).length).toBeLessThanOrEqual(180);
      expect(value).not.toContain('\uFFFD');
      expect(value).toMatch(/\.webp$/);
    }
    expect(name('e\u0301.png').name).toContain('-é.webp');
  });
  it('sanitizes hostile source names and rejects invalid labels without silently rewriting user input', () => {
    for (const source of ['CON.png', 'LPT1.jpg', '.png', '....png'])
      expect(name(source).name).toContain('-image.webp');
    expect(name('../bad:path\u0000?.png').name).not.toMatch(/[/:?\x00]/);
    for (const label of [
      '../x',
      'CON',
      'a\u0000b',
      ' ',
      '.',
      'a.',
      ' a',
      'a ',
      'x'.repeat(41),
      '🐺'.repeat(11),
    ]) {
      expect(validFilenameLabel(label)).toBe(false);
      expect(name('a.png', 1, label).error).toBe(true);
    }
    expect(validFilenameLabel('🐺'.repeat(10))).toBe(true);
    expect(name('a.png', 0).error).toBe(true);
  });
});
