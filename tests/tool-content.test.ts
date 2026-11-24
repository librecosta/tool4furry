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
import { definition as codec } from '../src/tools/url-base64/definition';
import { definition as timestamp } from '../src/tools/timestamp-converter/definition';
import { definition as colorContrast } from '../src/tools/color-contrast/definition';
import { definition as audioTrimmer } from '../src/tools/audio-trimmer/definition';
import { definition as markdownEditor } from '../src/tools/markdown-editor/definition';

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
  it('publishes bilingual Timestamp SEO and short copy matching the date and timezone workflow', () => {
    const expected = {
      zh: {
        title: '在线时间戳转换工具 - Unix 秒毫秒与日期转换 | Tool4Furry',
        description: '在线转换 Unix 时间戳与日期，支持秒、毫秒、ISO 8601、UTC 和本地时间。提供日期时间选择器、时区显示、夏令时校验及一键复制，全部在浏览器本地完成。',
        h1: '时间戳转换',
        intro: '在 Unix 时间戳和日期之间自由转换。精确到毫秒，清楚查看 UTC、本地时间及不同时间格式。',
      },
      en: {
        title: 'Unix Timestamp Converter - Seconds, Milliseconds & Dates | Tool4Furry',
        description: 'Convert Unix timestamps to dates and back. Supports seconds, milliseconds, ISO 8601, UTC and local time, with date and time pickers, time zones and one-click copying.',
        h1: 'Timestamp Converter',
        intro: 'Convert between Unix timestamps and calendar dates with millisecond precision. View UTC, local time and other useful representations instantly.',
      },
    };
    expect(timestamp).toMatchObject({
      id: 'timestamp-converter', slug: 'timestamp-converter', category: 'development', group: 'developer-utilities',
      roles: ['developer', 'operations'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: '时间戳转换', description: '双向转换 Unix 时间戳与日期，支持秒、毫秒、ISO 8601 和时区显示。', summary: '输入时间戳或选择日期，实时查看 UTC、本地时间及其他格式。' },
        en: { title: 'Timestamp Converter', description: 'Convert Unix timestamps and dates with millisecond precision and time zone support.', summary: 'Enter a timestamp or date to view Unix, ISO, UTC and local time results.' },
      },
    });
    for (const region of timestamp.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(timestamp, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.title.match(/Tool4Furry/g)).toHaveLength(1);
      expect(page.steps).toHaveLength(4);
      expect(page.steps![0]).toMatch(/固定的英文日期示例|built-in English example/);
      expect(page.limitations).toHaveLength(6);
      expect(page.limitations![0]).toMatch(/最多三位小数|up to three decimal places/);
      expect(page.limitations![1]).toMatch(/0001–9999.*Z.*±HH:MM/);
      expect(page.limitations![2]).toMatch(/不提供任意 IANA 时区的日期反向输入|does not accept arbitrary IANA-zone local dates as input/);
      expect(page.limitations![3]).toContain('8,640,000,000,000,000');
      expect(page.limitations![4]).toMatch(/不存在本地时间.*重复的本地时间|Nonexistent local times.*ambiguous repeated times/);
      expect(page.faq).toHaveLength(4);
      expect(page.faq![1].answer).toMatch(/1704067200\.123.*1704067200123/);
      expect(JSON.stringify(page)).not.toMatch(/微秒|纳秒|批量转换|倒计时|microseconds|nanoseconds|batch conversion|countdown/i);
      expect(getRelatedTools(timestamp, region).map(tool => tool.id)).toEqual(['json-formatter', 'url-base64']);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it('publishes Color & Contrast with bilingual color conversion and WCAG guidance', () => {
    const expected = {
      zh: {
        title: '在线颜色转换与对比度检测 - HEX、RGB、HSL 与 WCAG | Tool4Furry',
        description: '在线转换 HEX、RGB、HSL 颜色，实时检测 WCAG 2.2 对比度，预览文字和 UI 配色，并获取达到 AA 或 AAA 对比度目标的颜色修正建议。',
        h1: '颜色与对比度',
        intro: '探索前景色与背景色的搭配效果，实时转换颜色格式、检测文字与 UI 对比度，并通过颜色修正改善配色的可读性。',
      },
      en: {
        title: 'Color Contrast Checker & HEX, RGB, HSL Converter | Tool4Furry',
        description: 'Convert HEX, RGB and HSL colors, check WCAG 2.2 contrast ratios, preview text and UI colors, and find color adjustments for your target contrast ratio.',
        h1: 'Color & Contrast',
        intro: 'Explore foreground and background color combinations, convert color formats, check accessibility contrast ratios, and find adjustments for more readable designs.',
      },
    };
    expect(colorContrast).toMatchObject({
      id: 'color-contrast', slug: 'color-contrast', category: 'creative', group: 'design-utilities',
      roles: ['painter', 'developer'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: '颜色与对比度', description: '转换 HEX、RGB、HSL，检测 WCAG 对比度并获取颜色修正建议。', summary: '实时预览配色、检查可读性并调整颜色。' },
        en: { title: 'Color & Contrast', description: 'Convert HEX, RGB and HSL colors, check WCAG contrast, and find color adjustments.', summary: 'Preview color combinations, check readability, and adjust colors in real time.' },
      },
    });
    for (const region of colorContrast.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(colorContrast, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.steps).toHaveLength(4);
      expect(page.limitations).toHaveLength(6);
      expect(page.limitations![1]).toMatch(/8-bit sRGB.*Alpha/);
      expect(page.limitations![2]).toMatch(/1:1.*21:1.*(?:未经舍入|unrounded)/);
      expect(page.limitations![3]).toMatch(/24 CSS.*18\.67 CSS/);
      expect(page.limitations![5]).toMatch(/EyeDropper.*(?:本地|locally)/);
      expect(page.faq).toHaveLength(4);
      expect(page.faq![1].answer).toMatch(/4\.5:1.*7:1.*3:1.*4\.5:1/);
      expect(page.faq![2].answer).toMatch(/3:1.*4\.5:1.*7:1/);
      expect(getRelatedTools(colorContrast, region)).toEqual([]);
      expect(getRelatedTools(colorContrast, region, undefined, true).map(tool => tool.id))
        .toEqual(['qr-code-generator', 'video-frame-extractor', 'code-image-generator']);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it('publishes the URL & Base64 bilingual guide and short copy for the frozen codec workspace', () => {
    const expected = {
      zh: {
        title: 'URL 与 Base64 编解码工具 - UTF-8 在线转换 | Tool4Furry',
        description: '在线进行 URL 编码、解码和 Base64 文本转换。支持 UTF-8、完整 URL、表单参数、Base64URL、Padding 设置及实时预览，可复制或下载 TXT，全部在浏览器本地完成。',
        h1: 'URL 与 Base64',
        intro: '选择 URL 或 Base64，再选择编码或解码。输入文本即可实时查看结果，也可以一键反向交换。',
      },
      en: {
        title: 'URL Encoder & Base64 Converter - Encode or Decode | Tool4Furry',
        description: 'Encode or decode URL text and UTF-8 Base64 locally in your browser. Supports URL components, form values, Base64URL, padding options, live results and TXT downloads.',
        h1: 'URL & Base64',
        intro: 'Choose URL or Base64, select Encode or Decode, and see the result as you type. Swap the result back into the input whenever you need.',
      },
    };
    expect(codec).toMatchObject({
      id: 'url-base64', slug: 'url-base64', category: 'development', group: 'developer-utilities',
      roles: ['developer'], mode: 'form', status: 'published', regions: ['cn', 'global'],
      copy: {
        zh: { title: 'URL 与 Base64', description: '实时进行 URL 和 Base64 文本编解码，支持 UTF-8、Base64URL 与高级编码规则。', summary: '选择编码方式和方向，实时转换文本并复制或下载。' },
        en: { title: 'URL & Base64', description: 'Encode and decode URL and Base64 text with UTF-8 and advanced codec options.', summary: 'Switch codecs and directions, convert text live, and copy or download results.' },
      },
    });
    for (const region of codec.regions) for (const locale of ['zh', 'en'] as const) {
      const page = getToolPageContent(codec, region, toolPageContents, false, locale);
      expect(page).toMatchObject(expected[locale]);
      expect(page.title.match(/Tool4Furry/g)).toHaveLength(1);
      expect(page.steps).toHaveLength(4);
      expect(page.steps![1]).toMatch(/内置英文示例|built-in English sample/);
      expect(page.limitations).toHaveLength(6);
      expect(page.limitations![0]).toMatch(/单个字段值|individual form values/);
      expect(page.limitations![1]).toMatch(/合法的补齐或省略补齐|correctly padded or valid unpadded/);
      expect(page.limitations![2]).toMatch(/尾部补位比特|trailing bits/);
      expect(page.limitations![3]).toContain('%2B');
      expect(page.limitations![4]).toMatch(/已移除旧的 50 万字符硬限制.*Worker|500,000-character limit has been removed.*Worker/);
      expect(page.limitations![5]).toMatch(/不是加密|provide no encryption/);
      expect(page.faq).toHaveLength(4);
      expect(JSON.stringify(page)).not.toMatch(/JWT|加密保护|file to Base64|unlimited/i);
      expect(getRelatedTools(codec, region).map(tool => tool.id)).toEqual(['json-formatter', 'timestamp-converter']);
      if (locale === 'en') expect(JSON.stringify(page)).not.toMatch(/\p{Script=Han}/u);
    }
  });

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
      expect(getRelatedTools(json, region).map(tool => tool.id)).toEqual(['url-base64', 'timestamp-converter']);
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
    expect(getRelatedTools(textDiff, 'cn').map(tool => tool.id)).toEqual(['text-cleaner', 'markdown-editor']);
    expect(getRelatedTools(textDiff, 'global').map(tool => tool.id)).toEqual(['text-cleaner', 'markdown-editor']);
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

it('publishes bilingual Markdown Editor pages with accurate rendering and image privacy limits', () => {
  expect(markdownEditor).toMatchObject({
    id: 'markdown-editor', slug: 'markdown-editor', category: 'text', group: 'text-processing',
    roles: ['developer', 'operations', 'studio'], mode: 'form', status: 'published', regions: ['cn', 'global'],
    copy: {
      zh: { title: 'Markdown 编辑器', description: '编写 Markdown，实时预览排版，支持格式化编辑及 Markdown / HTML 导出。', summary: '在统一工作区编辑、预览并保存 Markdown 文档。' },
      en: { title: 'Markdown Editor', description: 'Write Markdown with live preview, formatting tools and Markdown or HTML export.', summary: 'Edit, preview and save Markdown documents in a unified workspace.' },
    },
  });
  for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
    const content = getToolPageContent(markdownEditor, region, toolPageContents, false, locale);
    expect(content.title).toBe(locale === 'zh'
      ? '在线 Markdown 编辑器 - 实时预览与 HTML 导出 | Tool4Furry'
      : 'Online Markdown Editor - Live Preview & HTML Export | Tool4Furry');
    expect(content.h1).toBe(markdownEditor.copy[locale].title);
    expect(content.steps).toHaveLength(4);
    expect(content.steps?.every(step => /^\*\*.+\*\* /.test(step))).toBe(true);
    expect(content.limitations).toHaveLength(6);
    expect(content.limitations?.[3]).toMatch(/160,000.*UTF-16/);
    expect(content.limitations?.[4]).toMatch(/MathML.*(?:占位|placeholders)/);
    expect(content.limitations?.[5]).toMatch(locale === 'zh' ? /默认开启.*服务器发送请求.*关闭/ : /enabled by default.*requests.*disabled/);
    expect(content.faq).toHaveLength(4);
    if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
});

it('publishes bilingual Audio Trimmer pages and concise Registry copy in both regions', () => {
  expect(audioTrimmer).toMatchObject({
    id: 'audio-trimmer', slug: 'audio-trimmer', category: 'creative', group: 'audio-processing',
    roles: ['composer', 'animator'], mode: 'form', status: 'published', regions: ['cn', 'global'],
  });
  expect(audioTrimmer.copy).toEqual({
    zh: { title: '音频裁切', description: '通过可视化波形裁切音频，支持片段试听、淡入淡出及多格式导出。', summary: '精确选择音频片段，试听并保存裁切结果。' },
    en: { title: 'Audio Trimmer', description: 'Trim audio with an interactive waveform, playback, fades and multiple export formats.', summary: 'Select, preview and export audio clips with precision.' },
  });
  const metadata = {
    zh: {
      title: '在线音频裁切工具 - MP3、WAV、FLAC 音频剪辑 | Tool4Furry',
      description: '在线裁切 MP3、WAV 等音频，通过可视化波形精确选择片段，支持删除选区、循环试听、淡入淡出及多格式导出。最大支持 512 MiB 文件，全部在浏览器本地处理。',
      h1: '音频裁切',
    },
    en: {
      title: 'Online Audio Trimmer - Cut MP3, WAV & FLAC Audio | Tool4Furry',
      description: 'Trim audio with an interactive waveform, precise selection, playback, fades and multiple export formats. Process files up to 512 MiB locally in your browser.',
      h1: 'Audio Trimmer',
    },
  };
  for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
    const content = getToolPageContent(audioTrimmer, region, toolPageContents, false, locale);
    expect(content).toMatchObject(metadata[locale]);
    expect(content.steps).toHaveLength(4);
    expect(content.limitations).toHaveLength(6);
    expect(content.faq).toHaveLength(4);
    expect(content.limitations![3]).toMatch(/MP3.*PCM16 WAV.*FLAC.*M4A\/AAC.*OGG\/Opus/);
    expect(content.limitations![4]).toContain('256 MiB');
    if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
});
