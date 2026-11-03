import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tools, getAvailableTools } from '../src/tools/registry';
import { getToolPageContent, getRelatedTools } from '../src/site/tool-content';
import { assertToolLoaderContract, toolBuildDefines, toolAvailabilityConstant } from '../src/tools/build-availability';
import { publicPages, llmsText } from '../src/site/discovery';

const ids = ['image-compressor', 'comic-page-organizer', 'image-watermark', 'exif-metadata'];
describe.each(['cn', 'global'] as const)('%s published basic image tools', region => {
  it('keeps implementations behind their literal Loader and Registry qualifications', () => {
    expect(() => assertToolLoaderContract(tools, readFileSync('src/tools/loaders.ts', 'utf8'))).not.toThrow();
    const available = getAvailableTools(region, true), production = getAvailableTools(region, false);
    for (const id of ids) {
      const tool = tools.find(tool => tool.id === id)!;
      expect(tool).toMatchObject({id, slug: id, status: 'published', mode: 'form', regions: ['cn', 'global']});
      expect(available).toContain(tool); expect(production).toContain(tool);
      expect(toolBuildDefines(tools, region)[toolAvailabilityConstant(id)]).toBe('true');
      expect(publicPages(region).filter(page => page.url.includes(`/tools/${id}/`))).toHaveLength(2);
      expect(llmsText(region)).toContain(`/tools/${id}/`);
      for (const locale of ['zh', 'en'] as const) {
        const content = getToolPageContent(tool, region, undefined, true, locale);
        expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
        expect(content.h1).toBe(tool.copy[locale].title);
        expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(4);
        if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
        expect(getToolPageContent(tool, region, undefined, false, locale)).toEqual(content);
      }
      expect(getRelatedTools(tool, region, undefined, true).length).toBeGreaterThan(0);
      expect(getRelatedTools(tool, region).map(item => item.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor']);
    }
    expect(production.map(tool => tool.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor', 'image-compressor', 'comic-page-organizer', 'image-watermark', 'exif-metadata', 'pdf-merge']);
  });
  it.each(ids)('excludes %s from production when its Registry qualification is Draft', id => {
    const registry = tools.map(tool => tool.id === id ? {...tool, status: 'draft' as const} : tool);
    const tool = registry.find(tool => tool.id === id)!;
    expect(getAvailableTools(region, true, registry)).toContain(tool);
    expect(getAvailableTools(region, false, registry)).not.toContain(tool);
    expect(toolBuildDefines(registry, region)[toolAvailabilityConstant(id)]).toBe('false');
    expect(publicPages(region, registry).some(page => page.url.includes(`/tools/${id}/`))).toBe(false);
    expect(llmsText(region, registry)).not.toContain(`/tools/${id}/`);
    for (const locale of ['zh', 'en'] as const) {
      expect(() => getToolPageContent(tool, region, undefined, false, locale)).toThrow('Unpublished');
      expect(getToolPageContent(tool, region, undefined, true, locale).h1).toBe(tool.copy[locale].title);
    }
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
  it('finalizes Comic SEO while distinguishing original archives, conversion and independent PDF export', () => {
    const tool = tools.find(tool => tool.id === 'comic-page-organizer')!;
    const expected = {
      zh: {title: '漫画页整理 - 图片排序与 ZIP/CBZ/PDF 导出 | Tool4Furry', description: '在浏览器本地整理漫画页与连续插画。支持拖动排序、自定义页面命名、可选统一图片格式和质量设置，导出 ZIP、CBZ 或 PDF。', h1: '漫画页整理', intro: '排好漫画与插画的顺序，按需要打包归档或保存为 PDF。'},
      en: {title: 'Comic Page Organizer - ZIP, CBZ & PDF | Tool4Furry', description: 'Organize comic pages locally in your browser. Reorder images, customize page names, optionally convert formats and adjust quality, then export ZIP, CBZ or PDF.', h1: 'Comic Page Organizer', intro: 'Arrange your comic pages and illustrations, then save an image archive or a PDF.'},
    };
    for (const locale of ['zh', 'en'] as const) {
      const content = getToolPageContent(tool, region, undefined, true, locale);
      expect(content).toMatchObject(expected[locale]);
      expect(content.features).toBeUndefined();
      expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(4);
      expect(content.steps?.every(step => step.startsWith('**'))).toBe(true);
      expect(content.steps?.join(' ')).toContain(locale === 'zh' ? '重置排序' : 'Reset Order');
      expect(content.faq?.[1].answer).toContain(locale === 'zh' ? '第一张有效图片' : 'first valid image');
      expect(content.limitations?.[0]).toContain(locale === 'zh' ? '默认保留原始字节，不清理来源元数据' : 'keep original bytes without removing source metadata by default');
      expect(content.limitations?.[0]).toContain(locale === 'zh' ? '质量设置仅适用于 JPEG、WebP 和 AVIF' : 'Quality applies to JPEG, WebP and AVIF');
      expect(content.limitations?.[1]).toContain(locale === 'zh' ? '不应用归档命名前缀、统一图片格式或质量设置' : 'Archive prefixes, uniform image formats and quality settings do not apply');
      expect(content.limitations?.[1]).toContain(locale === 'zh' ? '不能保证移除全部隐私信息' : 'Neither format conversion nor PDF can guarantee removal of all private information');
      expect(content.limitations?.[2]).toContain(locale === 'zh' ? '受设备、浏览器和导出模式限制' : 'within device, browser and export-mode limits');
      expect(content.faq?.at(-1)?.answer).toContain(locale === 'zh' ? '不会上传至 Tool4Furry 服务端' : 'not uploaded to Tool4Furry');
      expect(tool.copy[locale].summary).toContain('PDF');
      expect(JSON.stringify([content, tool.copy[locale]])).not.toMatch(/设置封面|选择封面|箭头按钮|choose a cover|set a cover|arrow buttons/i);
    }
  });
  it('publishes the frozen Watermark SEO without an extra feature overview', () => {
    const tool = tools.find(tool => tool.id === 'image-watermark')!;
    const expected = {
      zh: {
        title: '在线图片加水印 - 文字、Logo 与批量平铺 | Tool4Furry',
        description: '在线为图片添加文字或 Logo 水印，支持批量处理、旋转平铺、位置与透明度调整。支持安全静态 SVG 水印素材，导出 PNG、JPEG、WebP 或受限 AVIF，全部在浏览器本地完成。',
        h1: '图片水印',
        intro: '为作品添加文字或 Logo 水印，实时调整效果，轻松批量保存。',
      },
      en: {
        title: 'Online Image Watermark Tool – Text, Logo & Batch | Tool4Furry',
        description: 'Add text or logo watermarks to images in your browser. Apply watermarks in batches, adjust rotation, tiled patterns, position and opacity, and export PNG, JPEG, WebP or supported AVIF images. Safe static SVG logos are supported.',
        h1: 'Image Watermark',
        intro: 'Add text or logo watermarks to your artwork, fine-tune the result, and save multiple images with ease.',
      },
    };
    for (const locale of ['zh', 'en'] as const) {
      const content = getToolPageContent(tool, region, undefined, false, locale);
      expect(content).toMatchObject(expected[locale]);
      expect(content.features).toBeUndefined();
      expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(4);
      expect(content.steps?.every(step => step.startsWith('**'))).toBe(true);
      expect(content.limitations?.join(' ')).toContain(locale === 'zh' ? '符合设备与尺寸限制的 AVIF' : 'AVIF on supported devices within output limits');
      expect(content.faq?.[2].answer).toContain(locale === 'zh' ? '不支持脚本、动画、外部资源或复杂 SVG 结构' : 'scripts, animations, external resources and complex SVG structures are rejected');
      expect(content.faq?.at(-1)?.question).toBe(locale === 'zh' ? '图片会上传到服务器吗？' : 'Are my images uploaded to a server?');
    }
  });
  it('publishes the frozen EXIF guide with three steps, three limits and four FAQs in each locale', () => {
    const tool = tools.find(tool => tool.id === 'exif-metadata')!;
    const expected = {
      zh: {title: '在线 EXIF 查看与批量清理 - 图片元数据 | Tool4Furry', description: '在线查看 JPEG、PNG、WebP 图片的 EXIF、拍摄时间、设备和 GPS 等信息。支持浏览器本地批量无损清理、清理前后字段对照、逐张下载与 ZIP 打包，无需上传图片。', h1: '图片元数据', intro: '查看图片携带的拍摄信息，清理不需要的元数据，安心分享作品。'},
      en: {title: 'Online EXIF Viewer & Batch Metadata Cleaner | Tool4Furry', description: 'View EXIF, camera, date and GPS metadata in JPEG, PNG and WebP images. Remove supported private metadata in batches without re-encoding pixels. Compare fields and download cleaned images or a ZIP, all in your browser.', h1: 'EXIF Metadata', intro: 'See what information your images carry and remove unwanted metadata before sharing your work.'},
    };
    for (const locale of ['zh', 'en'] as const) {
      const content = getToolPageContent(tool, region, undefined, false, locale);
      expect(content).toMatchObject(expected[locale]);
      expect(content.features).toBeUndefined();
      expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(4);
      expect(content.steps?.every(step => step.startsWith('**'))).toBe(true);
      expect(content.faq?.[0].question).toBe(locale === 'zh' ? '图片会上传到服务器吗？' : 'Are my images uploaded to a server?');
      expect(content.faq?.at(-1)?.answer).toContain(locale === 'zh' ? '无法安全清理的图片会明确提示失败。' : 'Files that cannot be safely cleaned are explicitly rejected.');
      expect(content.limitations?.join(' ')).toContain(locale === 'zh' ? '必要的图片方向和色彩信息可能保留' : 'Necessary orientation and supported color information may remain');
      expect(JSON.stringify(content)).not.toMatch(/清理前后图片|visual comparison|preview and download a separate/i);
    }
  });
});
