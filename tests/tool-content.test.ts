import { describe, expect, it } from 'vitest';
import {
  getToolPageContent,
  assertPublishedContent,
  getRelatedTools,
  toolPageContents,
  type ToolContentMap,
} from '../src/site/tool-content';
import { fixtureTool } from './fixtures/tools';
import { imageConverterContent } from '../src/site/image-converter-content';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import { definition as textDiff } from '../src/tools/text-diff/definition';

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
  it('publishes bilingual Text Diff copy for the existing line comparison and report', () => {
    const expected = {
      zh: {
        title: '在线文本对比工具 - 逐行差异与实时比较 | Tool4Furry',
        description: '在线对比两段文本，实时查看新增、删除和未变化的行。支持双栏编辑、行号对照、忽略行尾空白、仅显示变化及 TXT 差异报告下载，全部在浏览器本地完成。',
        h1: '文本对比',
        intro: '粘贴两段文本，即可查看它们的区别。逐行定位新增与删除内容，清楚了解每一处变化。',
      },
      en: {
        title: 'Compare Text Online - Line-by-Line Diff | Tool4Furry',
        description: 'Compare two texts side by side and see added, removed and unchanged lines. View line numbers, ignore trailing whitespace and download a TXT diff report locally.',
        h1: 'Text Diff',
        intro: 'Paste two versions of your text and see what changed. Compare lines, find additions and deletions, and review the differences instantly.',
      },
    };
    expect(textDiff).toMatchObject({
      id: 'text-diff', slug: 'text-diff', category: 'text', group: 'text-processing',
      roles: ['developer', 'operations'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: '文本对比', description: '实时逐行对比文本，查看新增、删除和对应行号。', summary: '双栏编辑并查看文本差异，支持筛选变化与导出报告。' },
        en: { title: 'Text Diff', description: 'Compare text line by line with live additions, deletions and line numbers.', summary: 'Edit both versions, review changes and export a readable diff report.' },
      },
    });
    for (const region of textDiff.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(textDiff, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.title.match(/Tool4Furry/g)).toHaveLength(1);
      expect(page.steps).toHaveLength(4);
      expect(page.limitations).toHaveLength(6);
      expect(page.faq).toHaveLength(4);
      expect(page.limitations![1]).toMatch(/两行上下文|two surrounding context lines/);
      expect(page.limitations![2]).toMatch(/不会直接修改|without modifying/);
      expect(page.limitations![3]).toMatch(/已移除旧的.*可能超时|limits have been removed.*may time out/);
      expect(page.limitations![4]).toMatch(/不是可直接应用|not an applicable/);
      expect(page.limitations![5]).toMatch(/规范化输入的换行|normalizes input line endings/);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
    expect(getRelatedTools(textDiff, 'cn').map(tool => tool.id)).toEqual(['text-cleaner']);
    expect(getRelatedTools(textDiff, 'global').map(tool => tool.id)).toEqual(['text-cleaner']);
  });
  it.each([
    ['zh', '在线图片格式转换器 - PNG、JPG、WebP、AVIF 互转 | Tool4Furry',
      '在浏览器本地批量转换 PNG、JPG、WebP 和 AVIF 图片，无需上传。支持常见格式互转、编码质量调整、图片预览和 ZIP 打包下载，默认清理常见隐私元数据。',
      '在线图片格式转换器',
      '轻松转换 PNG、JPEG、WebP 和 AVIF 图片，全部在浏览器本地完成。'],
    ['en', 'Online Image Converter - PNG, JPG, WebP & AVIF | Tool4Furry',
      'Batch convert PNG, JPG, WebP and AVIF images in your browser without uploading files. Adjust quality, preview results and download ZIPs. Common private metadata is removed by default.',
      'Online Image Converter',
      'Convert PNG, JPEG, WebP and AVIF images right in your browser.'],
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
