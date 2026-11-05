import { it, expect } from 'vitest';
import { tools, getAvailableTools } from '../src/tools/registry';
import { toolPageContents, getToolPageContent } from '../src/site/tool-content';
import { toolLoaders } from '../src/tools/loaders';
import { groups } from '../src/site/taxonomy';
import { draftIds, generalToolboxIds, firstBatchIds, secondBatchIds } from './fixtures/general-toolbox';
it('publishes Text Cleaner SEO and short copy for its frozen live editor workflow', () => {
  const tool = tools.find(tool => tool.id === 'text-cleaner')!;
  expect(tool).toMatchObject({ id: 'text-cleaner', slug: 'text-cleaner', category: 'text', group: 'text-processing', roles: ['operations', 'studio'], mode: 'form', status: 'published', regions: ['cn', 'global'] });
  const expected = {
    zh: { title: '在线文本清理工具 - 空白处理与换行格式化 | Tool4Furry', description: '在线清理文本中的行尾空白、连续空行与换行符。支持实时预览、保留缩进、高级清理规则、LF/CRLF 转换及 TXT 下载，全部在浏览器本地完成。', h1: '文本清理', intro: '粘贴文本，实时查看清理结果。整理空白、空行和换行符，让文本更整洁。' },
    en: { title: 'Text Cleaner Online - Whitespace & Line Ending Cleanup | Tool4Furry', description: 'Clean trailing whitespace, blank lines and line endings online. Preview changes instantly, preserve indentation, choose LF or CRLF, and download a TXT file locally.', h1: 'Text Cleaner', intro: 'Paste your text and see a cleaner version instantly. Tidy up whitespace, blank lines and line endings in your browser.' },
  };
  for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
    const content = getToolPageContent(tool, region, toolPageContents, false, locale);
    expect(content).toMatchObject(expected[locale]);
    expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    expect(content.steps).toHaveLength(4); expect(content.limitations).toHaveLength(6); expect(content.faq).toHaveLength(4);
    expect(content.limitations![1]).toMatch(/不会默认移除正常的行首缩进|preserving leading indentation/);
    expect(content.limitations![4]).toMatch(/不再设置旧|limit has been removed/);
    expect(content.limitations![5]).toMatch(/不承诺保留|are not preserved/);
    expect(JSON.stringify(content)).not.toMatch(/JSON|YAML|AI 改写|富文本|rich.text|spell.check/i);
    if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
  expect(tool.copy.zh).toEqual({ title: '文本清理', description: '实时清理文本空白、空行与换行符，支持快速和高级模式。', summary: '粘贴文本实时清理，保留缩进并支持 LF/CRLF。' });
  expect(tool.copy.en).toEqual({ title: 'Text Cleaner', description: 'Clean whitespace, blank lines and line endings with live previews.', summary: 'Paste text, preview cleanup and choose LF or CRLF output.' });
});
it('publishes File Hash bilingual static SEO and concise metadata matching its five-algorithm worker', () => {
  const tool = tools.find(tool => tool.id === 'file-hash')!;
  expect(tool).toMatchObject({ id: 'file-hash', slug: 'file-hash', category: 'files', group: 'file-operations', roles: ['developer', 'studio'], mode: 'form', regions: ['cn', 'global'], status: 'published' });
  const expected = {
    zh: { title: '在线文件哈希计算器 - MD5、SHA-256 与批量校验 | Tool4Furry', description: '免费在线计算文件 MD5、SHA-1、SHA-256、SHA-512 和 CRC32。支持批量文件自动校验、实时进度、哈希比对、复制结果和 TXT 下载，全部在浏览器本地完成。', h1: '文件哈希', intro: '拖入文件，即刻计算哈希值。支持常用算法、批量处理与完整性比对，无需上传文件。' },
    en: { title: 'File Hash Calculator - MD5, SHA-256 & Batch Checksums | Tool4Furry', description: 'Calculate MD5, SHA-1, SHA-256, SHA-512 and CRC32 checksums for multiple files. Compare hashes, copy results or download a TXT list. No file uploads required.', h1: 'File Hash', intro: 'Drop files to calculate their checksums automatically. Choose an algorithm, compare results and export a list without uploading anything.' },
  };
  for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
    const content = getToolPageContent(tool, region, toolPageContents, false, locale);
    expect(content).toMatchObject(expected[locale]);
    expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    expect(content.steps).toHaveLength(4); expect(content.limitations).toHaveLength(6); expect(content.faq).toHaveLength(4);
    expect(content.limitations![0]).toMatch(/MD5.*SHA-1.*SHA-256.*SHA-512.*CRC32/);
    expect(content.limitations![2]).toMatch(/不再设置旧的 32 MiB|without the previous fixed 32 MiB/);
    expect(content.limitations![5]).toMatch(/非密码学|not cryptographic/);
    expect(JSON.stringify(content)).not.toMatch(/只支持 SHA-256|单文件最大|Maximum file size|md5sum|sha256sum/);
    if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
  expect(tool.copy.zh).toEqual({ title: '文件哈希', description: '批量计算 MD5、SHA 系列与 CRC32，支持本地哈希比对。', summary: '拖入文件自动计算哈希，支持多种算法与批量导出。' });
  expect(tool.copy.en).toEqual({ title: 'File Hash', description: 'Calculate MD5, SHA and CRC32 checksums locally for multiple files.', summary: 'Automatically hash files, compare checksums and export results.' });
});
it('keeps both implementation batches intact with fourteen Published and fifteen Draft tools', () => {
  expect(tools).toHaveLength(29);
  expect(firstBatchIds).toHaveLength(15);
  expect(firstBatchIds).toContain('pdf-merge');
  expect(firstBatchIds).toContain('pdf-split');
  expect(firstBatchIds).toContain('images-to-pdf');
  expect(firstBatchIds).toContain('zip-manager');
  expect(firstBatchIds).toContain('batch-file-renamer');
  expect(firstBatchIds).toContain('file-hash');
  expect(firstBatchIds).toContain('text-cleaner');
  expect(secondBatchIds).toHaveLength(7);
  expect(draftIds).toHaveLength(15);
  expect(tools.filter((t) => t.status === 'draft').map((t) => t.id)).toEqual(
    draftIds,
  );
  for (const region of ['cn', 'global'] as const) {
    expect(getAvailableTools(region, false)).toHaveLength(14);
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
        if (id === 'pdf-merge' || id === 'pdf-split' || id === 'images-to-pdf' || id === 'zip-manager' || id === 'batch-file-renamer' || id === 'file-hash' || id === 'text-cleaner') {
          expect(tool.status).toBe('published');
          expect(getToolPageContent(tool, region, toolPageContents, false, locale)).toBe(c);
          expect(c.steps).toHaveLength(4);
          expect(c.limitations).toHaveLength(6);
          expect(c.faq).toHaveLength(id === 'pdf-merge' ? 3 : 4);
          expect(c.features).toBeUndefined();
        } else {
          expect(tool.status).toBe('draft');
          expect(() => getToolPageContent(tool, region, toolPageContents, false, locale)).toThrow();
        }
      }
    }
  }
});

it('publishes the frozen PDF Split SEO in both locales through the existing static content map', () => {
  const expected = {
    zh: { title: '在线 PDF 拆分工具 - 预览选页与提取 PDF | Tool4Furry', description: '在线预览 PDF 页面，点击选择或输入页码范围，提取指定页面为一个 PDF，或将选中页面逐页导出为 ZIP。全部在浏览器本地处理，无需上传文件。', h1: 'PDF 拆分', intro: '预览每一页，选出需要的内容。将选中页面合成 PDF，或逐页打包下载。' },
    en: { title: 'Split PDF Online - Preview & Extract Pages | Tool4Furry', description: 'Preview PDF pages, select pages visually or enter page ranges, then download one PDF or a ZIP of individual pages. Processing happens locally in your browser.', h1: 'PDF Split', intro: 'See each page before you split. Choose what you need, then download one PDF or separate pages in a ZIP.' },
  };
  for (const locale of ['zh', 'en'] as const) {
    expect(toolPageContents['pdf-split'][locale]).toMatchObject(expected[locale]);
    expect(expected[locale].title.match(/Tool4Furry/g)).toHaveLength(1);
  }
  expect(tools.find(tool => tool.id === 'pdf-split')).toMatchObject({ category: 'documents', group: 'pdf-tools', roles: ['studio'], status: 'published', regions: ['cn', 'global'] });
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

it('delivers Images to PDF bilingual static SEO with its current resource and privacy policy', () => {
  const expected = {
    zh: {
      title: '图片转 PDF 在线工具 - 拖拽排序与本地生成 | Tool4Furry',
      description: '将多张 PNG、JPG 或 JPEG 图片合成为一份 PDF。支持图片预览、拖拽排序、放大查看和继续添加，保留图片原始比例，所有处理均在浏览器本地完成，无需上传文件。',
      h1: '图片转 PDF',
      intro: '把图片排成想要的顺序，再合成一份 PDF。预览、调整页序，然后生成下载。',
    },
    en: {
      title: 'Convert Images to PDF - Preview & Reorder | Tool4Furry',
      description: 'Combine PNG and JPEG images into one PDF. Preview images, drag to reorder pages, and download the result locally in your browser. No file uploads required.',
      h1: 'Images to PDF',
      intro: 'Arrange your images in the order you want, preview them, and turn them into a single PDF in your browser.',
    },
  };
  for (const locale of ['zh', 'en'] as const) {
    const tool = tools.find(tool => tool.id === 'images-to-pdf')!;
    const content = getToolPageContent(tool, 'cn', toolPageContents, false, locale);
    expect(content).toMatchObject(expected[locale]);
    expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    expect(content.steps).toHaveLength(4);
    expect(content.limitations).toHaveLength(6);
    expect(content.faq).toHaveLength(4);
  }
  expect(toolPageContents['images-to-pdf'].zh!.limitations).toContain('不设置固定的图片张数或累计体积配额；实际可处理规模取决于浏览器解码能力、设备内存及 PDF 库能力。');
  expect(toolPageContents['images-to-pdf'].en!.limitations).toContain('Files are processed locally in your browser without uploads or persistent storage. Some source image data or metadata may remain embedded in the PDF.');
  expect(JSON.stringify(toolPageContents['images-to-pdf'].en)).not.toMatch(/[\u4e00-\u9fff]/);
  expect(tools.find(tool => tool.id === 'images-to-pdf')).toMatchObject({
    id: 'images-to-pdf', slug: 'images-to-pdf', category: 'documents', group: 'pdf-tools',
    roles: ['studio', 'painter'], mode: 'form', status: 'published', regions: ['cn', 'global'],
  });
});

it('publishes ZIP Manager static SEO with accurate packaging, extraction and resource limits', () => {
  const tool = tools.find(tool => tool.id === 'zip-manager')!;
  expect(tool).toMatchObject({ id: 'zip-manager', slug: 'zip-manager', category: 'files', group: 'file-operations', roles: ['studio', 'developer'], mode: 'form', status: 'published', regions: ['cn', 'global'] });
  const expected = {
    zh: {
      title: '在线 ZIP 创建与解压工具 - 文件打包和提取 | Tool4Furry',
      description: '在浏览器本地创建和打开 ZIP 文件。支持文件夹打包、目录浏览、选择文件、单项提取和批量 ZIP 下载。无需上传服务器，保留文件目录结构。',
      h1: 'ZIP 管理', intro: '把文件整理成 ZIP，或打开已有压缩包，选择需要的内容下载。',
    },
    en: {
      title: 'ZIP Creator & Extractor - Browse Files Online | Tool4Furry',
      description: 'Create ZIP archives, browse folders, and extract selected files in your browser. Pack files with their folder paths or download selected ZIP contents without uploads.',
      h1: 'ZIP Manager', intro: 'Create a ZIP from your files, or open an existing archive to browse and download what you need.',
    },
  };
  for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
    const content = getToolPageContent(tool, region, toolPageContents, false, locale);
    expect(content).toMatchObject(expected[locale]);
    expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    expect(content.steps).toHaveLength(4); expect(content.limitations).toHaveLength(6); expect(content.faq).toHaveLength(4);
    expect(content.limitations?.join(' ')).toMatch(/500.*32 MiB.*96 MiB/);
    expect(content.limitations?.join(' ')).toMatch(/128 MiB/);
    expect(content.limitations?.join(' ')).toMatch(/64 MiB.*500/);
    expect(content.limitations?.join(' ')).toMatch(/ZIP64/);
    expect(content.limitations?.join(' ')).toMatch(/CRC32/);
    if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
  expect(toolPageContents['zip-manager'].zh!.limitations).toContain('批量提取会将所选文件重新打包为 ZIP，仍需满足创建 ZIP 的资源限制；不会直接写入本地文件夹。');
  expect(toolPageContents['zip-manager'].en!.faq![1].answer).toContain('smaller output is not guaranteed');
});

it('publishes the Visual Filename Composer SEO without advertising removed or direct-disk rename operations', () => {
  const tool=tools.find(tool=>tool.id==='batch-file-renamer')!;
  expect(tool).toMatchObject({id:'batch-file-renamer',slug:'batch-file-renamer',category:'files',group:'file-operations',roles:['studio','operations'],mode:'form',status:'published',regions:['cn','global']});
  const expected={zh:{title:'批量文件重命名在线工具 - 实时预览与序号命名 | Tool4Furry',description:'在浏览器本地批量重命名文件。直接设置统一名称、开启或关闭序号，实时预览新文件名。支持自定义编号与连接符，打包为 ZIP 下载，无需上传文件。',h1:'批量文件重命名',intro:'轻松整理一批文件的名称。编辑统一名称或序号，实时检查结果，再打包下载。'},en:{title:'Batch Rename Files Online - Preview & Number | Tool4Furry',description:'Rename multiple files in your browser. Enter an optional shared name, add sequence numbers, preview every result, and download a ZIP without uploading files.',h1:'Batch File Renamer',intro:'Give your files consistent names. Set an optional name and numbering pattern, preview the results, and download them together.'}};
  for(const region of ['cn','global'] as const) for(const locale of ['zh','en'] as const){
    const content=getToolPageContent(tool,region,toolPageContents,false,locale);
    expect(content).toMatchObject(expected[locale]); expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    expect(content.steps).toHaveLength(4); expect(content.limitations).toHaveLength(6); expect(content.faq).toHaveLength(4);
    expect(content.limitations?.join(' ')).toMatch(/100.*32 MiB.*96 MiB/);
    expect(JSON.stringify(content)).not.toMatch(/前缀|后缀|查找|替换|prefix|suffix|find\s*\/\s*replace/i);
    if(locale==='en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
  }
});
