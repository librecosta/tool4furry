import type { ToolContentMap } from './tool-content';
// Astro-only editorial content. Never imported by the React implementation.
export const imageConverterContent: ToolContentMap[string] = {
  zh: {
    title: '在线图片格式转换器 - PNG、JPG、WebP 转换 | Tool4Furry',
    h1: '在线图片格式转换器',
    description:
      '在浏览器本地转换静态 PNG、JPG 与 WebP 图片。支持快速推荐设置与高级质量调整，输出格式以浏览器实际支持为准。',
    intro:
      '添加多张图片或文件夹，使用推荐设置转换格式，或调整质量和 JPEG 背景。可用输出格式由浏览器实测决定。',
    steps: [
      '选择或拖入多张静态 PNG、JPEG、WebP 或受支持的 AVIF，也可添加文件夹，后续添加会追加到列表。每个文件独立检查真实结构、动画、尺寸和方向。',
      '快速模式默认 WebP 85；不支持 WebP 输出时选择 PNG。新增图片或点击格式推荐后按序自动转换；高级模式调整参数后点击“转换全部”。',
      '检查原图与输出的真实格式、分辨率和大小。修改编码参数会令旧结果过期，修改文件名不会重复编码。',
      '在文件行逐项预览和下载当前已验证结果，无需等待其他文件完成。多文件任务结束后可下载成功结果的 ZIP。快速模式同格式优先无损清理常见隐私元数据；无法可靠清理时会提示，可主动使用高级模式重新编码。',
    ],
    limitations: [
      '批量静态图片转换，当前数量、大小和尺寸限制见工具内“支持格式与限制”。AVIF 仅接受经过验证的 8-bit SDR 静态结构；输出仅桌面可用，最多 2048×2048。不会自动缩小，不支持 APNG、动画 WebP、多帧 AVIF、GIF、HEIC、TIFF 或 SVG。',
      'JPEG 使用指定的不透明背景，默认白色。PNG/WebP/AVIF 支持透明；有损输出不保证像素或文件大小相同。',
      '默认移除常见隐私元数据，可能保留必要的方向与色彩信息；不清除像素水印或隐写内容。重新编码可能改变色彩，不提供专业色彩或来源凭证保全保证。',
      '运行时验证 PNG/JPEG/WebP 输出能力；AVIF 输出按需加载编码器，Quick 同格式也会重新编码以移除来源元数据。输入可解码不表示同格式一定可编码。大图处理可能较慢，请保留原文件。',
    ],
    faq: [
      {
        question: 'PNG 转 JPEG 后透明背景去哪了？',
        answer:
          '透明和半透明像素会与 JPEG 背景合成，默认白色；高级模式可指定 #RRGGBB 背景。',
      },
      {
        question: '转换后一定更小吗？',
        answer:
          '不一定。格式、图片内容、编码器与质量都会影响大小，结果可能变大，界面按真实字节展示差异。',
      },
      {
        question: '图片会上传吗？',
        answer:
          '不会。读取、检查、解码、编码和预览都在当前浏览器内完成，离开页面释放该工具持有的资源。',
      },
      {
        question: '为什么不能输出 WebP？',
        answer:
          '输出选项取决于浏览器实际编码与回解码验证。检测失败时禁用该选项，可以重试检测或使用支持的 PNG/JPEG。',
      },
    ],
  },
  en: {
    title: 'Online Image Converter - PNG, JPG & WebP | Tool4Furry',
    h1: 'Online Image Converter',
    description:
      'Convert static PNG, JPG and WebP images locally in your browser. Quick presets and advanced quality controls; output formats depend on browser support.',
    intro:
      'Add images or a folder for quick conversion, or adjust quality and JPEG background. Available export formats are checked in your browser.',
    steps: [
      'Choose or drop multiple static PNG, JPEG, WebP or supported AVIF images, or add a folder. Later imports append to the list. Each file is checked for structure, animation, dimensions and orientation.',
      'Quick starts with WebP quality 85, or PNG when WebP export is unavailable. New images and format presets convert automatically in order; in Advanced, adjust settings and click Convert all.',
      'Compare actual formats, resolution and sizes. Encoding changes make old results stale; renaming does not re-encode.',
      'Preview and download each current verified result from its file row without waiting for other files. Once all tasks finish, download successful results as a ZIP. For the same format, Quick prefers lossless removal of common private metadata. If reliable cleanup is unavailable, it reports an error; you can explicitly re-encode in Advanced.',
    ],
    limitations: [
      'Static image batches; see Supported formats and limits in the tool for current count, size and dimension limits. AVIF accepts verified static 8-bit SDR structures only; export is desktop-only, up to 2048×2048. No automatic resizing, APNG, animated WebP, multi-frame AVIF, GIF, HEIC, TIFF or SVG.',
      'JPEG uses an opaque background, white by default. PNG/WebP/AVIF can retain transparency; lossy output is not guaranteed pixel-identical or smaller.',
      'Common private metadata is removed by default; necessary orientation and color information may remain. Pixel watermarks and steganography are not removed. Re-encoding may change colors; professional color or provenance preservation is not guaranteed.',
      'PNG/JPEG/WebP export is tested at runtime. AVIF export loads its encoder on demand; Quick re-encodes even same-format AVIF to remove source metadata. Input decoding does not imply encoding support. Large images may take longer. Keep your original files.',
    ],
    faq: [
      {
        question: 'What happens to transparency when converting PNG to JPEG?',
        answer:
          'Transparent and semi-transparent pixels are composited over the JPEG background. The default is white; Advanced accepts a #RRGGBB background.',
      },
      {
        question: 'Will conversion always make the file smaller?',
        answer:
          'No. Format, content, encoder and quality affect size. Output may grow; the interface reports the actual byte difference.',
      },
      {
        question: 'Are my images uploaded?',
        answer:
          'No. Reading, validation, decoding, encoding and preview stay in this browser. Leaving the page releases the resources owned by this tool.',
      },
      {
        question: 'Why is WebP export unavailable?',
        answer:
          'Options depend on actual browser encoding and decoding checks. Failed formats are disabled; retry detection or use a supported PNG/JPEG output.',
      },
    ],
  },
};
