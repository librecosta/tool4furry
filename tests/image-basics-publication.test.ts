import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tools, getAvailableTools } from '../src/tools/registry';
import { getToolPageContent, getRelatedTools } from '../src/site/tool-content';
import { assertToolLoaderContract, toolBuildDefines, toolAvailabilityConstant } from '../src/tools/build-availability';
import { publicPages, llmsText } from '../src/site/discovery';

const ids = ['image-compressor', 'comic-page-organizer', 'image-watermark', 'exif-metadata'];
describe.each(['cn', 'global'] as const)('%s Compressor publication and three remaining Draft modules', region => {
  it('keeps implementations behind their literal Loader and Registry qualifications', () => {
    expect(() => assertToolLoaderContract(tools, readFileSync('src/tools/loaders.ts', 'utf8'))).not.toThrow();
    const available = getAvailableTools(region, true), production = getAvailableTools(region, false);
    for (const id of ids) {
      const tool = tools.find(tool => tool.id === id)!;
      const published = id === 'image-compressor';
      expect(tool).toMatchObject({id, slug: id, status: published ? 'published' : 'draft', mode: 'form', regions: ['cn', 'global']});
      expect(available).toContain(tool); expect(production.includes(tool)).toBe(published);
      expect(toolBuildDefines(tools, region)[toolAvailabilityConstant(id)]).toBe(String(published));
      expect(publicPages(region).filter(page => page.url.includes(`/tools/${id}/`))).toHaveLength(published ? 2 : 0);
      expect(llmsText(region).includes(`/tools/${id}/`)).toBe(published);
      for (const locale of ['zh', 'en'] as const) {
        const content = getToolPageContent(tool, region, undefined, true, locale);
        expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
        expect(content.h1).toBe(tool.copy[locale].title);
        expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(published ? 4 : 3);
        if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
        if (published) expect(getToolPageContent(tool, region, undefined, false, locale)).toEqual(content);
        else expect(() => getToolPageContent(tool, region, undefined, false, locale)).toThrow('Unpublished');
      }
      expect(getRelatedTools(tool, region, undefined, true).length).toBeGreaterThan(0);
      if (published) expect(getRelatedTools(tool, region).map(item => item.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor']);
    }
    expect(production.map(tool => tool.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor', 'image-compressor']);
  });
  it('keeps the finalized Compressor metadata and guide bilingual and static', () => {
    const tool = tools.find(tool => tool.id === 'image-compressor')!;
    const expected = {
      zh: {title: '在线图片压缩工具 - 批量压缩与大小调整 | Tool4Furry', h1: '图片压缩', intro: '压缩单张或多张图片，比较画质与文件大小，满意后再下载。', description: '在线批量压缩 JPEG、PNG、WebP 和受支持的静态 AVIF 图片。快速调整压缩强度，或设置质量、目标大小与最长边，预览压缩效果并下载图片或 ZIP。全部在浏览器本地处理。'},
      en: {title: 'Online Image Compressor – Batch Image Compression | Tool4Furry', h1: 'Image Compressor', intro: 'Compress one image or a whole batch, compare quality and file size, and download the results you like.', description: 'Compress JPEG, PNG, WebP and supported static AVIF images in your browser. Adjust compression strength, quality, target file size or dimensions, compare results, and download images or a ZIP. No uploads required.'},
    };
    for (const locale of ['zh', 'en'] as const) {
      const content = getToolPageContent(tool, region, undefined, false, locale);
      expect(content).toMatchObject(expected[locale]);
      expect(content.features).toBeUndefined();
      expect(content.steps?.every(step => step.startsWith('**'))).toBe(true);
      expect(content.faq?.at(-1)?.question).toBe(locale === 'zh' ? '图片会上传到服务器吗？' : 'Are my images uploaded to a server?');
    }
  });
});
