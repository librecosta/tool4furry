import { describe, expect, it } from 'vitest';
import {
  getToolPageContent,
  assertPublishedContent,
  getRelatedTools,
  type ToolContentMap,
} from '../src/site/tool-content';
import { fixtureTool } from './fixtures/tools';
import { imageConverterContent } from '../src/site/image-converter-content';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';

const content = {
  title: 'Test — Tool4Furry',
  description: 'Honest test description',
  h1: 'Test heading',
  intro: 'Test intro',
};
const map: ToolContentMap = {
  one: { zh: content, en: { ...content, h1: 'English heading' } },
};
describe('Astro-only content boundary', () => {
  it.each([
    ['zh', '在线图片格式转换器 - PNG、JPG、WebP、AVIF 互转 | Tool4Furry',
      '在浏览器本地批量转换 PNG、JPG、WebP 和 AVIF 图片，无需上传。支持常见格式互转、编码质量调整、图片预览和 ZIP 打包下载，默认清理常见隐私元数据。',
      '在线图片格式转换器',
      '在浏览器中批量转换 PNG、JPG、WebP 和 AVIF 图片，无需上传。使用推荐设置快速转换，或调整编码质量、背景颜色等选项，再预览和下载结果。'],
    ['en', 'Online Image Converter - PNG, JPG, WebP & AVIF | Tool4Furry',
      'Batch convert PNG, JPG, WebP and AVIF images in your browser without uploading files. Adjust quality, preview results and download ZIPs. Common private metadata is removed by default.',
      'Online Image Converter',
      'Convert between PNG, JPEG, WebP and supported AVIF images directly in your browser. Use quick presets or advanced quality settings, then preview and download each result or a ZIP.'],
  ] as const)('retains the frozen %s SEO and full four-format guide for the accepted tool', (locale, title, description, h1, intro) => {
    expect(imageConverterContent[locale]).toMatchObject({ title, description, h1, intro });
    expect(imageConverterContent[locale]?.steps).toHaveLength(4);
    expect(imageConverterContent[locale]?.limitations).toHaveLength(4);
    expect(imageConverterContent[locale]?.faq).toHaveLength(6);
    expect(imageConverterDefinition.copy[locale].summary).toContain('AVIF');
    expect(imageConverterDefinition.copy[locale].description).toContain('AVIF');
    expect(imageConverterDefinition.status).toBe('published');
    expect(imageConverterDefinition.regions).toEqual(['cn', 'global']);
  });
  it('requires localized content only for published region routes', () => {
    const one = fixtureTool('one');
    expect(getToolPageContent(one, 'global', map).h1).toBe('English heading');
    expect(() => assertPublishedContent([one], map)).not.toThrow();
    expect(() =>
      getToolPageContent({ ...one, regions: ['cn'] }, 'global', map),
    ).toThrow('Unpublished');
    expect(() =>
      getToolPageContent({ ...one, status: 'draft' }, 'cn', map),
    ).toThrow('Unpublished');
    expect(getToolPageContent({ ...one, status: 'draft' }, 'cn', map, true)).toEqual(content);
    expect(() => getToolPageContent({ ...one, regions: ['cn'] }, 'global', map, true)).toThrow('Unpublished');
    expect(() =>
      assertPublishedContent([{ ...one, regions: ['cn'] }], {
        one: { zh: content },
      }),
    ).toThrow('en');
  });
  it.each(['title', 'description', 'h1', 'intro'])(
    'blocks missing %s before publication',
    (key) => {
      expect(() =>
        getToolPageContent(fixtureTool('one'), 'cn', {
          one: { zh: { ...content, [key]: '' } },
        }),
      ).toThrow('Missing tool content');
    },
  );
  it('rejects duplicate brand titles, blank guide items and missing translations', () => {
    for (const bad of [
      { title: 'Tool4Furry · Tool4Furry' },
      { steps: [''] },
      { faq: [{ question: 'Q', answer: '' }] },
    ])
      expect(() =>
        getToolPageContent(fixtureTool('one'), 'cn', {
          one: { zh: { ...content, ...bad } },
        }),
      ).toThrow();
    expect(() =>
      assertPublishedContent([fixtureTool('one')], { one: { zh: content } }),
    ).toThrow('en');
  });
  it('keeps related tools published, regional, bounded and distinct from the current tool', () => {
    const one = fixtureTool('one');
    const list = [
      one,
      fixtureTool('draft', { status: 'draft' }),
      fixtureTool('global', { regions: ['global'] }),
      fixtureTool('two'),
      fixtureTool('three'),
      fixtureTool('four'),
      fixtureTool('five'),
    ];
    expect(getRelatedTools(one, 'cn', list).map((tool) => tool.id)).toEqual([
      'two',
      'three',
      'four',
    ]);
  });
  it.each(['cn', 'global'] as const)(
    'includes only available same-group tools in DEV %s recommendations',
    (region) => {
      const one = fixtureTool('current', { status: 'draft' });
      const list = [
        one,
        fixtureTool('other-region', { status: 'draft', regions: [region === 'cn' ? 'global' : 'cn'] }),
        fixtureTool('local-draft', { status: 'draft', regions: [region] }),
        fixtureTool('published'),
        fixtureTool('third'),
        fixtureTool('fourth'),
      ];
      expect(getRelatedTools(one, region, list, true).map((tool) => tool.slug)).toEqual([
        'local-draft', 'published', 'third',
      ]);
      expect(getRelatedTools(one, region, list).map((tool) => tool.slug)).toEqual([
        'published', 'third', 'fourth',
      ]);
    },
  );
});
