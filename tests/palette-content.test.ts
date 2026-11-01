import { describe, expect, it } from 'vitest';
import { paletteExtractorContent } from '../src/site/palette-extractor-content';
import { getToolPageContent } from '../src/site/tool-content';
import { paletteExtractorDefinition as definition } from '../src/tools/palette-extractor/definition';

describe('Palette Extractor finalized bilingual content', () => {
  it.each([
    ['zh', '在线图片取色与调色板提取 - 配色分享图 | Tool4Furry',
      '从图片中自动提取配色，手动取色、编辑色卡、复制 HEX 和 RGB，下载调色板或生成图片与色带组合的 PNG 分享图。全部在浏览器本地完成。',
      '图片调色板提取', '从作品中发现配色，调整每一种颜色，再把图片与色带一起保存下来。'],
    ['en', 'Image Color Palette Extractor & Picker | Tool4Furry',
      'Extract colors from images, pick and edit swatches, copy HEX and RGB values, and create PNG palette cards with your artwork. Everything runs locally in your browser.',
      'Palette Extractor',
      'Discover the colors in your artwork, fine-tune your palette, and bring your image and colors together in a shareable card.'],
  ] as const)('retains the approved %s metadata and intro', (locale, title, description, h1, intro) => {
    expect(paletteExtractorContent[locale]).toMatchObject({ title, description, h1, intro });
  });

  it.each([
    ['zh', ['添加图片：', '提取配色：', '调整色卡：', '下载与分享：'], [
      '图片会上传到服务器吗？',
      '为什么提取出的颜色少于设置的数量？',
      '可以自己选择或修改颜色吗？',
      '重新提取会覆盖我调整过的颜色吗？',
      '制作分享图会裁剪原图吗？',
    ]],
    ['en', ['Add an image:', 'Extract your palette:', 'Refine your colors:', 'Download your palette:'], [
      'Are my images uploaded to a server?',
      'Why did I get fewer colors than requested?',
      'Can I pick or edit colors myself?',
      'Will extracting again overwrite my edits?',
      'Will creating a share card crop my artwork?',
    ]],
  ] as const)('keeps the %s four-step, four-limit, five-FAQ guide current', (locale, labels, questions) => {
    const content = paletteExtractorContent[locale];
    expect(content.steps).toHaveLength(4);
    expect(content.limitations).toHaveLength(4);
    expect(content.faq).toHaveLength(5);
    expect(content.steps?.map(step => step.match(/^\*\*([^*]+)\*\* /)?.[1])).toEqual(labels);
    expect(content.faq?.map(item => item.question)).toEqual(questions);
    expect(content.faq?.every(item => item.answer.trim().length > 0)).toBe(true);
    expect(content).not.toHaveProperty('features');
    expect(content.steps?.[1]).toContain('3–10');
    expect(content.limitations?.[0]).toMatch(/PNG.+JPEG.+WebP.+AVIF/);
    expect(content.limitations?.[2]).toContain(locale === 'zh' ? '完全透明' : 'Fully transparent');
    expect(content.faq?.[3].answer).toContain(locale === 'zh' ? '取消操作即可保留现有配色' : 'Cancel to keep your current palette');
    expect(content.faq?.[4].answer).toContain(locale === 'zh' ? '在预览中移动或缩放图片' : 'move or zoom the image in the preview');
    expect(JSON.stringify([content, definition.copy[locale]])).not.toMatch(/三套模板|系统分享|填写标题|three (?:sharing )?templates|system shar|add a title/i);
  });

  it('uses the supplied English headings and keeps the English page free of Chinese', () => {
    expect(paletteExtractorContent.en.headings).toEqual({
      steps: 'How to Use',
      limitations: 'Supported Formats & Limitations',
      faq: 'Frequently Asked Questions',
    });
    expect(JSON.stringify(paletteExtractorContent.en)).not.toMatch(/\p{Script=Han}/u);
  });

  it.each(['cn', 'global'] as const)('keeps the updated %s content behind the existing Draft gate', region => {
    expect(definition).toMatchObject({status: 'draft', regions: ['cn', 'global']});
    for (const locale of ['zh', 'en'] as const) {
      expect(getToolPageContent(definition, region, undefined, true, locale)).toEqual(paletteExtractorContent[locale]);
      expect(() => getToolPageContent(definition, region, undefined, false, locale)).toThrow('Unpublished');
    }
  });
});
