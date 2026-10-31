import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageResizeCropDefinition as definition } from '../src/tools/image-resize-crop/definition';
import { imageResizeCropContent } from '../src/site/image-resize-crop-content';
import {
  getAvailableTools,
  getPublishedTools,
  tools,
} from '../src/tools/registry';
import {
  assertToolLoaderContract,
  toolBuildDefines,
} from '../src/tools/build-availability';
import { getToolPageContent } from '../src/site/tool-content';
import { getRelatedTools } from '../src/site/tool-content';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';

describe('Resize & Crop Draft platform contract', () => {
  it.each(['cn', 'global'] as const)(
    'is available in %s DEV only, with both static locales and a literal gated loader',
    (region) => {
      expect(definition).toMatchObject({
        id: 'image-resize-crop',
        slug: 'image-resize-crop',
        status: 'draft',
        mode: 'form',
      });
      expect(getAvailableTools(region, true)).toContain(definition);
      expect(getPublishedTools(region)).not.toContain(definition);
      expect(
        toolBuildDefines(tools, region)[
          'import.meta.env.T4F_TOOL_IMAGE_RESIZE_CROP_AVAILABLE'
        ],
      ).toBe('false');
      expect(() =>
        assertToolLoaderContract(
          tools,
          readFileSync('src/tools/loaders.ts', 'utf8'),
        ),
      ).not.toThrow();
      for (const locale of ['zh', 'en'] as const) {
        expect(
          getToolPageContent(definition, region, undefined, true, locale),
        ).toEqual(imageResizeCropContent[locale]);
        expect(() =>
          getToolPageContent(definition, region, undefined, false, locale),
        ).toThrow('Unpublished');
      }
      expect(getRelatedTools(definition, region)).toContain(
        imageConverterDefinition,
      );
      expect(getRelatedTools(imageConverterDefinition, region)).not.toContain(
        definition,
      );
      expect(
        getRelatedTools(imageConverterDefinition, region, undefined, true),
      ).toContain(definition);
    },
  );
  it('keeps crop CSS variables local and includes the original ISC terms', () => {
    const css = readFileSync('src/tools/image-resize-crop/crop.css', 'utf8');
    expect(css).not.toContain(':root');
    expect(css).toContain('[data-image-resize-crop]');
    expect(css).toContain('prefers-reduced-motion');
    expect(
      readFileSync('src/tools/image-resize-crop/crop.NOTICE.txt', 'utf8'),
    ).toContain('Copyright (c) 2015, Dominic Tobias');
  });
});

describe('Resize & Crop frozen editorial content', () => {
  it.each([
    ['zh', '在线图片裁剪与尺寸调整 - 批量缩放 | Tool4Furry',
      '在线裁剪图片、调整宽高，或按宽度、高度、最长边及百分比批量缩放。支持 PNG、JPEG、WebP 和部分静态 AVIF 输入，图片在浏览器本地处理，无需上传。',
      '图片尺寸与裁剪',
      '自由裁剪、调整尺寸或批量处理图片，全部在浏览器本地完成。'],
    ['en', 'Image Cropper & Resizer – Batch Resize | Tool4Furry',
      'Crop and resize images online, or batch resize by width, height, longest side or percentage. Supports PNG, JPEG, WebP and selected static AVIF images, processed locally in your browser.',
      'Image Resize & Crop',
      'Crop, resize or batch process images right in your browser.'],
  ] as const)('uses the frozen %s metadata and intro', (locale, title, description, h1, intro) => {
    expect(imageResizeCropContent[locale]).toMatchObject({ title, description, h1, intro });
  });

  it.each([
    ['zh', ['添加图片：', '单张编辑：', '批量缩放：', '预览与下载：'], [
      '图片会上传到服务器吗？',
      '可以先裁剪图片，再调整尺寸吗？',
      '批量缩放会裁掉图片内容吗？',
      '“不放大原图”是什么意思？',
      '导出时使用的是缩小后的预览图吗？',
      '图片的透明背景会保留吗？',
    ]],
    ['en', ['Add images:', 'Crop and resize:', 'Batch resize:', 'Preview and download:'], [
      'Are my images uploaded to a server?',
      'Can I crop and resize an image in one go?',
      'Will batch resizing crop my images?',
      'What does "Don\'t upscale images" mean?',
      'Does exporting use the smaller preview image?',
      'Will my image keep its transparent background?',
    ]],
  ] as const)('keeps the %s four-step, four-limit, six-FAQ guide without a feature overview', (locale, stepLabels, questions) => {
    const content = imageResizeCropContent[locale];
    expect(content).not.toHaveProperty('features');
    expect(content.steps).toHaveLength(4);
    expect(content.limitations).toHaveLength(4);
    expect(content.faq).toHaveLength(6);
    expect(content.steps?.map(step => step.match(/^\*\*([^*]+)\*\* /)?.[1])).toEqual(stepLabels);
    expect(content.faq?.map(item => item.question)).toEqual(questions);
    expect(content.faq?.every(item => item.answer.trim().length > 0)).toBe(true);
    expect(content.limitations?.[0]).toMatch(/PNG.+JPEG.+WebP.+AVIF/);
    expect(content.faq?.[3].answer).toMatch(/800×600.+1200px|1200px.+800×600/);
    expect(content.faq?.[5].answer).toMatch(/PNG.+WebP.+JPEG/);
    expect(content.faq?.[5].answer).toContain(locale === 'zh' ? '默认是白色' : 'white by default');
  });

  it('uses the frozen English headings and keeps the complete English copy free of Chinese', () => {
    const content = imageResizeCropContent.en;
    expect(content.headings).toEqual({
      steps: 'How to Use',
      limitations: 'Supported Formats & Limitations',
      faq: 'Frequently Asked Questions',
    });
    expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
    expect(JSON.stringify(definition.copy.en)).not.toMatch(/\p{Script=Han}/u);
  });
});
