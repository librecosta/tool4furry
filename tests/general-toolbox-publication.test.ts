import { it, expect } from 'vitest';
import { tools, getAvailableTools } from '../src/tools/registry';
import { toolPageContents, getToolPageContent } from '../src/site/tool-content';
import { toolLoaders } from '../src/tools/loaders';
import { groups } from '../src/site/taxonomy';
import { draftIds, generalToolboxIds, firstBatchIds, secondBatchIds } from './fixtures/general-toolbox';
it('keeps both implementation batches intact with eight Published and twenty-one Draft tools', () => {
  expect(tools).toHaveLength(29);
  expect(firstBatchIds).toHaveLength(15);
  expect(firstBatchIds).toContain('pdf-merge');
  expect(secondBatchIds).toHaveLength(7);
  expect(draftIds).toHaveLength(21);
  expect(tools.filter((t) => t.status === 'draft').map((t) => t.id)).toEqual(
    draftIds,
  );
  for (const region of ['cn', 'global'] as const) {
    expect(getAvailableTools(region, false)).toHaveLength(8);
    expect(getAvailableTools(region, true)).toHaveLength(29);
    for (const id of generalToolboxIds) {
      const tool = tools.find((t) => t.id === id)!;
      expect(tool.regions).toEqual(['cn', 'global']);
      expect(toolLoaders[id]).toBeTypeOf('function');
      expect(groups[tool.group].category).toBe(tool.category);
      for (const locale of ['zh', 'en'] as const) {
        const c = getToolPageContent(
          tool,
          region,
          toolPageContents,
          true,
          locale,
        );
        expect(c.steps?.length).toBeGreaterThanOrEqual(3);
        expect(c.limitations?.length).toBeGreaterThan(0);
        if (locale === 'en')
          expect(JSON.stringify(c)).not.toMatch(/[\u4e00-\u9fff]/);
        if (id === 'pdf-merge') {
          expect(tool.status).toBe('published');
          expect(getToolPageContent(tool, region, toolPageContents, false, locale)).toBe(c);
          expect(c.steps).toHaveLength(4);
          expect(c.limitations).toHaveLength(6);
          expect(c.faq).toHaveLength(3);
          expect(c.features).toBeUndefined();
        } else {
          expect(tool.status).toBe('draft');
          expect(() => getToolPageContent(tool, region, toolPageContents, false, locale)).toThrow();
        }
      }
    }
  }
});

it('publishes the frozen PDF Merge metadata without changing the first-batch set', () => {
  const expected = {
    zh: { title: '在线 PDF 合并工具 - 拖拽排序与本地合并 | Tool4Furry', description: '免费在线合并多个 PDF 文件，自由调整文件顺序，一键生成并下载合并后的 PDF。无需上传服务器，所有处理均在浏览器本地完成。', h1: 'PDF 合并', intro: '将多个 PDF 整理成一份文档。添加文件、调整顺序，然后合并下载。' },
    en: { title: 'Merge PDF Files Online - Reorder & Download | Tool4Furry', description: 'Merge multiple PDF files for free, arrange them in any order, and download the result. All processing happens locally in your browser without uploading files.', h1: 'PDF Merge', intro: 'Bring multiple PDF files into one document. Add your files, arrange their order, and download the merged result.' },
  };
  for (const locale of ['zh', 'en'] as const) {
    expect(toolPageContents['pdf-merge'][locale]).toMatchObject(expected[locale]);
    expect(expected[locale].title.match(/Tool4Furry/g)).toHaveLength(1);
  }
});
