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
    title: '漫画页整理 - 排序与 CBZ 打包 | Tool4Furry', description: '本地整理漫画和连续插画，导入图片或文件夹，在画廊中拖动页面、重置排序和多选删除，生成有序 ZIP 或 CBZ 归档。', h1: '漫画页整理', intro: '把连续画面排好顺序，打包带走。',
    steps: ['添加多张图片或选择文件夹，按文件名自然排序。', '在画廊中拖动图片调整顺序，可多选删除；重置排序会按文件名与相对路径重新整理全部图片。', '逐页预览后选择 ZIP、CBZ 或 PDF 并下载，当前第一张就是首页。ZIP/CBZ 文件名自动零填充。'],
    limitations: ['接收经过验证的静态图片，文件数量、大小和分辨率受当前设备限制。', 'ZIP/CBZ 保留原始图片字节，不重新编码，也不清理来源元数据；请先确认作品中没有不希望分享的隐私信息。', 'CBZ 是标准 ZIP 容器，阅读器格式支持各异。大归档需要浏览器支持直接保存文件；PDF 有独立处理上限，部分格式需要转换。'],
    faq: [{question: '整理页面会降低图片质量吗？', answer: '不会。ZIP 和 CBZ 内保留来源文件的原始字节，只调整顺序和归档文件名。'}, {question: '归档首页如何决定？', answer: '归档使用当前画廊顺序，第一张有效图片就是首页。拖动图片即可调整。'}, {question: 'CBZ 可以在哪里打开？', answer: '可用支持 CBZ 和对应图片格式的漫画阅读器，也可以用 ZIP 解压工具打开。'}],
  },
  en: {
    title: 'Comic Page Organizer – ZIP & CBZ | Tool4Furry', description: 'Organize comic pages locally. Import images or folders, drag pages in a gallery, reset their order, remove selected pages, and export an ordered ZIP or CBZ archive.', h1: 'Comic Page Organizer', intro: 'Put your pages in order and take the archive with you.', headings: englishHeadings,
    steps: ['Add multiple images or a folder and sort naturally by filename.', 'Drag images in the gallery to reorder them or select several to remove. Reset Order naturally sorts all current filenames and folder paths.', 'Read the pages, choose ZIP, CBZ or PDF, and download in the same order. ZIP/CBZ entries use zero-padded filenames.'],
    limitations: ['Accepts validated static images within device file-count, size and resolution limits.', 'ZIP/CBZ preserve original image bytes without re-encoding or removing source metadata. Check for private information before sharing.', 'CBZ uses a standard ZIP container; reader format support varies. Large archives require direct file saving support. PDF has separate limits and may convert some image formats.'],
    faq: [{question: 'Does organizing reduce image quality?', answer: 'No. ZIP and CBZ entries preserve the original file bytes. Only ordering and archive filenames change.'}, {question: 'Which image comes first in the archive?', answer: 'The archive follows the gallery order. Its first valid image is the first page. Drag images to change that order.'}, {question: 'How do I open a CBZ?', answer: 'Use a comic reader that supports CBZ and the included image formats, or open it with a ZIP extraction tool.'}],
  },
};
export const imageWatermarkContent: Content = {
  zh: {
    title: '在线图片加水印 - 文字、Logo 与批量平铺 | Tool4Furry',
    description: '在线为图片添加文字或 Logo 水印，支持批量处理、旋转平铺、位置与透明度调整。支持安全静态 SVG 水印素材，导出 PNG、JPEG、WebP 或受限 AVIF，全部在浏览器本地完成。',
    h1: '图片水印',
    intro: '为作品添加文字或 Logo 水印，实时调整效果，轻松批量保存。',
    steps: [
      '**添加图片：** 选择一张或多张图片，支持 PNG、JPEG、WebP 和部分静态 AVIF。',
      '**设置水印：** 添加文字或上传 Logo，调整颜色、透明度和位置。高级模式还可以设置旋转角度、平铺密度与水印大小。',
      '**预览与下载：** 实时查看水印效果，选择输出格式，批量生成后逐张下载或打包为 ZIP。',
    ],
    limitations: [
      '支持文字水印和 PNG、JPEG、WebP、部分静态 AVIF 图片水印，也支持符合安全限制的静态 SVG Logo。复杂 SVG、动画和部分特殊格式暂不支持。',
      '输出支持 PNG、JPEG、WebP，以及符合设备与尺寸限制的 AVIF。JPEG 不支持透明背景，透明区域将使用设置的背景色填充。',
      '图片只在浏览器本地处理，文件数量、大小及分辨率受设备限制。输出默认清理常见来源隐私元数据。水印可以帮助标识作品，但不能保证阻止复制或移除。',
    ],
    faq: [
      {
        question: '可以一次给多张图片添加相同水印吗？',
        answer: '可以。导入多张图片后，统一设置文字或 Logo 水印，工具会逐张处理。完成后可以单独下载，也可以打包为 ZIP。',
      },
      {
        question: '可以制作倾斜、平铺的水印吗？',
        answer: '可以。在高级模式中选择单个或平铺水印，调整旋转角度。平铺模式提供稀疏、标准和密集三种密度，适用于文字与图片水印。',
      },
      {
        question: '可以使用 SVG Logo 作为水印吗？',
        answer: '可以使用符合安全限制的静态 SVG 图形。工具支持部分常见的矢量形状、路径和渐变，但不支持脚本、动画、外部资源或复杂 SVG 结构。如果文件无法读取，可以先将 Logo 转换为 PNG。',
      },
      {
        question: '图片会上传到服务器吗？',
        answer: '不会。图片读取、水印预览、绘制和导出都在当前浏览器中完成，无需上传。原始图片不会被修改，生成的文件由你自行下载保存。',
      },
    ],
  },
  en: {
    title: 'Online Image Watermark Tool – Text, Logo & Batch | Tool4Furry',
    description: 'Add text or logo watermarks to images in your browser. Apply watermarks in batches, adjust rotation, tiled patterns, position and opacity, and export PNG, JPEG, WebP or supported AVIF images. Safe static SVG logos are supported.',
    h1: 'Image Watermark',
    intro: 'Add text or logo watermarks to your artwork, fine-tune the result, and save multiple images with ease.',
    headings: englishHeadings,
    steps: [
      '**Add images:** Choose one or more PNG, JPEG, WebP or supported static AVIF images.',
      '**Customize your watermark:** Add text or upload a logo, then adjust color, opacity and placement. Advanced mode also offers rotation, tiled patterns and watermark sizing.',
      '**Preview and download:** See the result live, choose an output format, and process your images. Download files individually or together as a ZIP.',
    ],
    limitations: [
      'Supports text watermarks and image watermarks using PNG, JPEG, WebP, selected static AVIF and supported safe static SVG logos. Complex SVG files, animations and some specialized formats are not supported.',
      'Exports PNG, JPEG, WebP and AVIF on supported devices within output limits. JPEG does not support transparency, so transparent areas are filled with the selected background color.',
      'Processing takes place locally in your browser, subject to device file-count, size and resolution limits. Common source privacy metadata is removed by default. Watermarks can identify your work but cannot guarantee protection against copying or removal.',
    ],
    faq: [
      {
        question: 'Can I watermark multiple images at once?',
        answer: 'Yes. Add multiple images and apply the same text or logo watermark settings to the batch. Download individual results or save them together as a ZIP.',
      },
      {
        question: 'Can I create rotated or tiled watermarks?',
        answer: 'Yes. Advanced mode supports single and tiled layouts, rotation, and three tiling densities: Sparse, Standard and Dense. These options work with both text and image watermarks.',
      },
      {
        question: 'Can I use an SVG logo as a watermark?',
        answer: 'Supported static SVG graphics can be used as logos. Common shapes, paths and some gradients are supported, while scripts, animations, external resources and complex SVG structures are rejected. If your SVG is unsupported, convert it to PNG first.',
      },
      {
        question: 'Are my images uploaded to a server?',
        answer: 'No. Images are read, previewed, processed and exported directly in your browser without uploading them. Your original files remain unchanged, and you choose where to save the results.',
      },
    ],
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
