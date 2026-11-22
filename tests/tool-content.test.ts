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
import { definition as subtitles } from '../src/tools/subtitle-tools/definition';
import { definition as json } from '../src/tools/json-formatter/definition';

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
  it('publishes the JSON Formatter bilingual guide and short copy for its frozen workspace', () => {
    const expected = {
      zh: {
        title: '在线 JSON 格式化工具 - 校验、压缩与树形查看 | Tool4Furry',
        description: '在线格式化、压缩和校验 JSON。支持语法高亮、错误行列定位、可折叠树形结构浏览与复制下载，保留大整数及原始数字字面量，全部在浏览器本地完成。',
        h1: 'JSON 格式化',
        intro: '粘贴或导入 JSON，实时检查语法并查看格式化结果。还可以压缩内容，或通过树形视图浏览数据结构。',
      },
      en: {
        title: 'JSON Formatter & Validator - Beautify, Minify & Explore | Tool4Furry',
        description: 'Format, minify and validate JSON in your browser. Find syntax errors by line and column, explore a collapsible tree, and preserve numeric literals, key order and duplicate keys.',
        h1: 'JSON Formatter',
        intro: 'Paste or import JSON to validate its syntax, format or minify the content, and explore its structure in a readable tree.',
      },
    };
    expect(json).toMatchObject({
      id: 'json-formatter', slug: 'json-formatter', category: 'development', group: 'developer-utilities',
      roles: ['developer'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: 'JSON 格式化', description: '实时校验、格式化和压缩 JSON，支持语法诊断与树形结构查看。', summary: '编辑并校验 JSON，查看格式化结果或浏览可折叠的数据树。' },
        en: { title: 'JSON Formatter', description: 'Validate, format and minify JSON with syntax diagnostics and tree browsing.', summary: 'Edit JSON, inspect errors and explore its structure in a collapsible tree.' },
      },
    });
    for (const region of json.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(json, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.title.match(/Tool4Furry/g)).toHaveLength(1);
      expect(page.steps).toHaveLength(4);
      expect(page.limitations).toHaveLength(6);
      expect(page.faq).toHaveLength(4);
      expect(page.limitations![0]).toMatch(/JSON5.*不支持|不支持.*JSON5|JSON5 syntax are not supported/);
      expect(page.limitations![1]).toMatch(/重复字段|duplicate keys/);
      expect(page.limitations![2]).toMatch(/只读树形|read-only structural tree/);
      expect(page.limitations![3]).toMatch(/32 MiB.*16,777,216.*33,554,432.*500,000/);
      expect(page.limitations![4]).toMatch(/40.*直属子节点|40 direct child nodes/);
      expect(page.limitations![5]).toMatch(/不执行 JSON Schema.*不会自动修复|not JSON Schema.*does not automatically repair/);
      expect(JSON.stringify(page)).not.toMatch(/50 万字符|500,000 characters|128 层|128 nesting|JSONPath|JSONC|YAML/);
      expect(getRelatedTools(json, region)).toEqual([]);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it('publishes bilingual Subtitle Tools content and preserves the Registry classification', () => {
    const expected = {
      zh: {
        title: '在线字幕转换工具 - SRT/VTT 转换与时间调整 | Tool4Furry',
        description: '在线转换 SRT 与 WebVTT 字幕，逐条预览时间和文字。支持整体提前或延后、单条字幕编辑、源码修改及文件下载，全部在浏览器本地完成，无需上传。',
        h1: '字幕工具',
        intro: '导入字幕，查看每一条内容，轻松转换 SRT 与 WebVTT。需要时还可以调整时间、修改文字。',
      },
      en: {
        title: 'SRT to VTT & VTT to SRT Converter | Tool4Furry',
        description: 'Convert SRT and WebVTT subtitles online. Preview individual cues, shift timing, edit subtitle text and timestamps, or download converted files locally in your browser.',
        h1: 'Subtitle Tools',
        intro: 'Import subtitles, preview every cue, and convert between SRT and WebVTT. Adjust timing and edit text whenever you need.',
      },
    };
    expect(subtitles).toMatchObject({
      id: 'subtitle-tools', slug: 'subtitle-tools', category: 'text', group: 'subtitles',
      roles: ['animator', 'operations'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: '字幕工具', description: '可视化转换 SRT 与 WebVTT，支持字幕预览、时间调整和编辑。', summary: '导入字幕并逐条查看，转换格式或调整时间后下载。' },
        en: { title: 'Subtitle Tools', description: 'Convert SRT and WebVTT with visual cue previews and timing adjustments.', summary: 'Preview, edit and convert subtitles locally in your browser.' },
      },
    });
    for (const region of subtitles.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(subtitles, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.title.match(/Tool4Furry/g)).toHaveLength(1);
      expect(page.steps).toHaveLength(4);
      expect(page.limitations).toHaveLength(6);
      expect(page.faq).toHaveLength(4);
      expect(page.limitations![2]).toMatch(/32 MiB.*(?:1,600 万.*10 万|16 million.*100,000)/);
      expect(page.limitations![4]).toMatch(/NOTE.*STYLE.*REGION/);
      expect(page.limitations![5]).toMatch(/内嵌时间戳|inline timestamps/);
      expect(getRelatedTools(subtitles, region)).toEqual([]);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
  });

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
