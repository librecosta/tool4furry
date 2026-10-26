import { publicationFixtures } from './publication';
import type { ToolContentMap } from '../../src/site/tool-content';

export const fixtureContents: ToolContentMap = Object.fromEntries(
  publicationFixtures.map((tool) => [
    tool.id,
    Object.fromEntries(
      (['zh', 'en'] as const).map((locale) => [
        locale,
        {
          title: `${tool.copy[locale].title} — Tool4Furry`,
          description: tool.copy[locale].description,
          h1:
            locale === 'zh' ? `测试标题 ${tool.id}` : `Test heading ${tool.id}`,
          intro:
            locale === 'zh'
              ? '静态简介，仅用于验证页面组合。'
              : 'Static introduction for composition verification only.',
          steps: [`STATIC_GUIDE_ONLY_${tool.id}_${locale}`],
          limitations: [
            locale === 'zh'
              ? '没有图片处理或下载功能。'
              : 'No image processing or download functionality.',
          ],
          faq: [
            {
              question:
                locale === 'zh' ? '这是正式工具吗？' : 'Is this a real tool?',
              answer:
                locale === 'zh'
                  ? '不是。仅为测试样本。'
                  : 'No. This is a test fixture.',
            },
          ],
        },
      ]),
    ),
  ]),
);
