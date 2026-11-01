import type { Locale } from '../i18n/locale';
import type { ToolPageContent } from './tool-content';
type Content = Record<Locale, ToolPageContent>;
const englishHeadings = {steps: 'How to Use', limitations: 'Supported Formats & Limitations', faq: 'Frequently Asked Questions'} as const;
export const imageCompressorContent: Content = {
  zh: {
    title: '在线图片压缩工具 - 批量压缩与大小调整 | Tool4Furry', description: '在线批量压缩 JPEG、PNG、WebP 和受支持的静态 AVIF 图片。快速调整压缩强度，或设置质量、目标大小与最长边，预览压缩效果并下载图片或 ZIP。全部在浏览器本地处理。',
    h1: '图片压缩', intro: '压缩单张或多张图片，比较画质与文件大小，满意后再下载。',
    steps: ['**添加图片：** 选择图片或文件夹，一次可以处理多张图片。', '**设置压缩：** 在快速模式中选择输出格式和压缩强度，或使用高级模式调整画质、目标大小与最长边。', '**预览与下载：** 查看每张图片的实际大小和压缩效果，对比原图与结果，逐张下载或打包为 ZIP。'],
    limitations: ['支持 JPEG、PNG、WebP 和部分静态 AVIF 图片输入；输出支持 PNG、JPEG、WebP，以及符合设备和尺寸限制的 AVIF。暂不支持动画图片和部分特殊格式。', '目标大小仅适用于 JPEG/WebP，不保证一定达到。PNG 不提供有损质量设置，部分图片在重新编码后也可能变大。', '图片仅在浏览器本地处理，不会上传到服务器。文件数量、大小和分辨率受设备限制；输出默认清理常见来源隐私元数据。'],
    faq: [
      {question: '可以将图片压缩到指定的 KB 吗？', answer: '可以在高级模式中为 JPEG 或 WebP 设置目标大小。工具会尝试生成接近目标的文件，但不能保证一定达到。最终会显示实际大小和压缩结果。'},
      {question: 'PNG 可以压缩吗？', answer: '可以尝试重新编码 PNG，但不一定会得到更小的文件。如果可以接受有损压缩，可主动选择 WebP 或 JPEG。需要保留透明背景时，不建议选择 JPEG。'},
      {question: '压缩后图片反而变大怎么办？', answer: '部分图片重新编码后可能变大。可以尝试降低质量、缩小尺寸或更换输出格式。工具会显示实际变化，原始文件不会被修改。'},
      {question: '图片会上传到服务器吗？', answer: '不会。图片读取、压缩、预览和下载全部在当前浏览器中完成，无需上传。关闭页面后，处理结果不会被持久保存。'},
    ],
  },
  en: {
    title: 'Online Image Compressor – Batch Image Compression | Tool4Furry', description: 'Compress JPEG, PNG, WebP and supported static AVIF images in your browser. Adjust compression strength, quality, target file size or dimensions, compare results, and download images or a ZIP. No uploads required.',
    h1: 'Image Compressor', intro: 'Compress one image or a whole batch, compare quality and file size, and download the results you like.', headings: englishHeadings,
    steps: ['**Add images:** Choose images or a folder to process multiple files at once.', '**Adjust compression:** Choose an output format and compression strength in Quick mode, or fine-tune quality, target size and longest side in Advanced mode.', '**Preview and download:** Check actual file sizes, compare originals with compressed results, and download images individually or together as a ZIP.'],
    limitations: ['Supports JPEG, PNG, WebP and selected static AVIF inputs. PNG, JPEG and WebP outputs are available, with AVIF output subject to device and dimension limits. Animated images and some specialized formats are not supported.', 'Target file sizes are available for JPEG and WebP but cannot be guaranteed. PNG has no lossy quality setting, and re-encoding some images may increase their size.', 'Images are processed entirely in your browser without being uploaded. File count, size and resolution limits depend on your device. Common source privacy metadata is removed by default.'],
    faq: [
      {question: 'Can I compress an image to a specific file size?', answer: 'You can set a target size for JPEG or WebP in Advanced mode. The tool attempts to get close to that size, but the result is not guaranteed. The actual output size is always shown.'},
      {question: 'Can PNG images be compressed?', answer: 'PNG images can be re-encoded, although the result may not be smaller. If lossy compression is acceptable, you can choose WebP or JPEG. Avoid JPEG when you need to preserve transparency.'},
      {question: 'What if the compressed image is larger?', answer: 'Some images become larger after re-encoding. Try a lower quality setting, smaller dimensions or another format. The tool reports the actual size change and leaves your original file untouched.'},
      {question: 'Are my images uploaded to a server?', answer: 'No. Images are read, compressed, previewed and downloaded directly in your browser without uploading them. Results are not stored permanently after you close the page.'},
    ],
  },
};
export const comicPageOrganizerContent: Content = {
  zh: {
    title: '漫画页整理 - 排序与 CBZ 打包 | Tool4Furry', description: '本地整理漫画和连续插画，导入图片或文件夹，自然排序、拖动页面、选择封面，生成有序 ZIP 或 CBZ 归档。', h1: '漫画页整理', intro: '把连续画面排好顺序，选好封面，打包带走。',
    steps: ['添加多张图片或选择文件夹，按文件名自然排序。', '拖动页面或使用前后移动按钮调整顺序，可多选删除并设置封面。', '逐页预览后下载 ZIP 或 CBZ，封面会放在第一页，文件名自动零填充。'],
    limitations: ['接收经过验证的静态图片，文件数量、大小和分辨率受当前设备限制。', '归档保留原始图片字节，不重新编码，也不清理来源元数据；请先确认作品中没有不希望分享的隐私信息。', 'CBZ 是标准 ZIP 容器。不同阅读器对图片格式的支持不同；不提供 PDF 或逐页图片加工。'],
    faq: [{question: '整理页面会降低图片质量吗？', answer: '不会。ZIP 和 CBZ 内保留来源文件的原始字节，只调整顺序和归档文件名。'}, {question: '封面如何排序？', answer: '设置为封面的页面会在导出时排到第一页，其余页面保持当前顺序。'}, {question: 'CBZ 可以在哪里打开？', answer: '可用支持 CBZ 和对应图片格式的漫画阅读器，也可以用 ZIP 解压工具打开。'}],
  },
  en: {
    title: 'Comic Page Organizer – ZIP & CBZ | Tool4Furry', description: 'Organize comic pages locally. Import images or folders, sort naturally, reorder pages, choose a cover, and export an ordered ZIP or CBZ archive.', h1: 'Comic Page Organizer', intro: 'Put your pages in order, choose a cover, and take the archive with you.', headings: englishHeadings,
    steps: ['Add multiple images or a folder and sort naturally by filename.', 'Drag pages or use move buttons to reorder them. Select multiple pages to remove and choose a cover.', 'Read the pages in sequence, then export ZIP or CBZ with the cover first and zero-padded filenames.'],
    limitations: ['Accepts validated static images within device file-count, size and resolution limits.', 'Archives preserve original image bytes without re-encoding or removing source metadata. Check for private information before sharing.', 'CBZ uses a standard ZIP container. Reader support for image formats varies. PDF and per-page image editing are not included.'],
    faq: [{question: 'Does organizing reduce image quality?', answer: 'No. ZIP and CBZ entries preserve the original file bytes. Only ordering and archive filenames change.'}, {question: 'Where does the cover appear?', answer: 'The chosen cover is exported as the first page. Other pages retain their current order.'}, {question: 'How do I open a CBZ?', answer: 'Use a comic reader that supports CBZ and the included image formats, or open it with a ZIP extraction tool.'}],
  },
};
export const imageWatermarkContent: Content = {
  zh: {
    title: '在线图片水印 - 文字与图片批量水印 | Tool4Furry', description: '在浏览器本地为图片添加文字或图片水印，调整位置、大小、透明度和边距，预览并下载 PNG、JPEG、WebP 或 ZIP。', h1: '图片水印', intro: '为作品添加文字或图片水印，预览后批量保存。',
    steps: ['添加一张或多张图片，选择文字水印或导入水印图片。', '设置文字颜色、大小或图片比例、透明度、九宫格位置和边距。', '预览构图，开始处理，并下载有效结果或 ZIP。'],
    limitations: ['输出 PNG、JPEG、WebP；JPEG 的透明区域会使用背景色填充。', '批量处理按每张原图的尺寸计算相同的水印规则，保留图片比例；水印不能保证阻止作品被复制。', '图片只在本地处理，受设备及水印图片限制；使用本站本地字体，不支持字体上传或远程字体。默认清理常见来源隐私元数据。'],
    faq: [{question: '能批量添加相同水印吗？', answer: '可以。所有文件共用当前文字或图片水印设置，逐张生成并验证输出。'}, {question: '透明图片水印会保留透明度吗？', answer: '会按水印图片的透明度与设置的不透明度组合绘制，最终背景还取决于所选输出格式。'}, {question: '原始图片会被修改吗？', answer: '不会。工具生成独立结果，原始文件保持不变。'}],
  },
  en: {
    title: 'Image Watermark – Text & Batch Watermarks | Tool4Furry', description: 'Add text or image watermarks locally. Adjust placement, size, opacity and margins, preview the composition, then download PNG, JPEG, WebP or a ZIP.', h1: 'Image Watermark', intro: 'Add a text or image watermark, preview it, and save your images in a batch.', headings: englishHeadings,
    steps: ['Add one or more images and choose text or an uploaded watermark image.', 'Set text color, size or image scale, opacity, a nine-position placement and margins.', 'Preview the composition, start processing, and download verified results individually or as a ZIP.'],
    limitations: ['Exports PNG, JPEG and WebP. Transparent areas in JPEG output are filled with a background color.', 'Batch settings are calculated for each source image while retaining its aspect ratio. Watermarks cannot guarantee protection against copying.', 'Processing is local and device limits apply, including a separate watermark-image limit. Uses local site fonts without font uploads or remote fonts. Common source privacy metadata is removed by default.'],
    faq: [{question: 'Can I apply the same watermark to several images?', answer: 'Yes. All files use the current text or image watermark settings and are processed and verified one at a time.'}, {question: 'Does an image watermark keep transparency?', answer: 'Its alpha channel is combined with the selected opacity. Final background behavior also depends on the output format.'}, {question: 'Is my original image changed?', answer: 'No. The tool generates a separate output and leaves the original file unchanged.'}],
  },
};
export const exifMetadataContent: Content = {
  zh: {
    title: '在线 EXIF 查看与批量清理 - 图片元数据 | Tool4Furry', description: '在线查看 JPEG、PNG、WebP 图片的 EXIF、拍摄时间、设备和 GPS 等信息。支持浏览器本地批量无损清理、清理前后字段对照、逐张下载与 ZIP 打包，无需上传图片。', h1: '图片元数据', intro: '查看图片携带的拍摄信息，清理不需要的元数据，安心分享作品。',
    steps: ['**添加图片：** 选择图片或文件夹，可以一次导入多张 JPEG、PNG、WebP 图片。', '**查看元数据：** 点击文件，在右侧查看可识别的拍摄时间、设备、GPS 等信息，以及需要注意的隐私字段。', '**清理与下载：** 单独清理或批量清理元数据，查看清理前后的字段变化，逐张下载或打包为 ZIP。'],
    limitations: ['支持静态 JPEG、PNG、WebP 图片。暂不支持 AVIF 无损清理、动画图片及部分特殊格式。', '清理仅针对能够安全识别和处理的来源元数据，必要的图片方向和色彩信息可能保留。不保证删除所有隐藏信息。', '清理过程不重新编码图片像素，原始文件不会被修改。所有处理均在浏览器本地完成，文件数量、大小及分辨率受设备限制。'],
    faq: [
      {question: '图片会上传到服务器吗？', answer: '不会。图片读取、元数据查看、清理和下载都在当前浏览器中完成，无需上传。处理结果不会被持久保存。'},
      {question: '清理 EXIF 会降低图片画质吗？', answer: '不会。受支持的元数据清理不重新编码图片像素，因此不会引入有损压缩。清理后的文件大小可能变化，必要的方向信息也可能保留。'},
      {question: '为什么没有显示 GPS 或拍摄时间？', answer: '有些图片本身不包含这些信息，也可能使用了当前工具无法可靠解析的元数据结构。工具只展示实际识别到的字段，不会推测缺失的信息。'},
      {question: '能保证彻底删除所有隐私信息吗？', answer: '不能。工具会清理受支持的常见 EXIF、GPS 等来源元数据，但无法保证清除所有未知私有字段、隐藏信息或直接存在于图片画面中的内容。无法安全清理的图片会明确提示失败。'},
    ],
  },
  en: {
    title: 'Online EXIF Viewer & Batch Metadata Cleaner | Tool4Furry', description: 'View EXIF, camera, date and GPS metadata in JPEG, PNG and WebP images. Remove supported private metadata in batches without re-encoding pixels. Compare fields and download cleaned images or a ZIP, all in your browser.', h1: 'EXIF Metadata', intro: 'See what information your images carry and remove unwanted metadata before sharing your work.', headings: englishHeadings,
    steps: ['**Add images:** Choose images or a folder to import multiple JPEG, PNG or WebP files.', '**Inspect metadata:** Select a file to view recognizable camera, date, GPS and other metadata fields, including potentially private details.', '**Clean and download:** Remove metadata from individual files or the entire batch, review the changes, and download cleaned images separately or as a ZIP.'],
    limitations: ['Supports static JPEG, PNG and WebP images. Lossless AVIF metadata cleaning, animated images and some specialized formats are not supported.', 'Only source metadata that can be safely recognized and processed is removed. Necessary orientation and supported color information may remain. Complete removal of all hidden information cannot be guaranteed.', 'Cleanup does not re-encode image pixels or modify your original files. Processing happens locally in your browser, subject to device file-count, size and resolution limits.'],
    faq: [
      {question: 'Are my images uploaded to a server?', answer: 'No. Images are read, inspected, cleaned and downloaded directly in your browser without uploading them. Results are not stored permanently.'},
      {question: 'Does removing EXIF metadata reduce image quality?', answer: 'No. Supported metadata cleanup does not re-encode image pixels, so it introduces no lossy compression. File sizes may change, and necessary orientation information may be preserved.'},
      {question: "Why can't I see GPS coordinates or the date taken?", answer: 'Some images do not contain these fields, while others use metadata structures that cannot be reliably parsed. The tool only displays information it can actually identify.'},
      {question: 'Does the tool remove all private information?', answer: 'No. It removes supported common source metadata, including recognizable EXIF and GPS information, but cannot guarantee removal of every unknown private field, hidden detail or information embedded in the image itself. Files that cannot be safely cleaned are explicitly rejected.'},
    ],
  },
};
