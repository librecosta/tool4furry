import type { ToolContentMap } from './tool-content';
// Astro-only editorial content. Never imported by the React implementation.
export const imageConverterContent: ToolContentMap[string] = {
  zh: {
    title: '在线图片格式转换器 - PNG、JPG、WebP、AVIF 互转 | Tool4Furry',
    h1: '在线图片格式转换器',
    description:
      '在浏览器本地批量转换 PNG、JPG、WebP 和 AVIF 图片，无需上传。支持常见格式互转、编码质量调整、图片预览和 ZIP 打包下载，默认清理常见隐私元数据。',
    intro: '轻松转换 PNG、JPEG、WebP 和 AVIF 图片，全部在浏览器本地完成。',
    steps: [
      '**添加图片**：选择或拖入 PNG、JPEG、WebP、AVIF 图片，也可以直接添加文件夹。支持批量处理，后续添加的图片会继续加入列表。',
      '**选择输出格式**：快速模式使用推荐设置自动转换；高级模式可以调整编码质量、JPEG 背景色和 AVIF 彩色边缘保真等选项。',
      '**查看转换结果**：预览原图与转换后的图片，比较文件大小和分辨率。每张图片都有独立的处理状态，失败的任务可以单独重试。',
      '**下载图片**：可以逐张下载，也可以在批量处理完成后，将成功转换的图片打包为 ZIP 下载。',
    ],
    limitations: [
      '支持 **PNG、JPEG、WebP、AVIF** 四种静态图片格式的双向转换。暂不支持 GIF、APNG 等动画，以及 HEIC、TIFF、SVG 等其他格式。文件数量、大小和分辨率限制请查看工具内的“支持格式与限制”。',
      '**AVIF 有独立的处理限制**：输入仅支持经过验证的静态 8-bit SDR 图片；输出目前仅对受支持的桌面设备开放，最多 4,194,304 像素、单边 4096px。转换不会自动缩小图片。',
      'JPEG 不支持透明背景，转换时会填充指定颜色，默认为白色。不同格式和质量设置可能影响画面细节、色彩与文件大小，转换后的图片不一定更小。',
      '默认移除常见的 EXIF、GPS 等来源隐私信息。高级模式可选择保留受支持的作者与版权字段，目前仅限 JPEG 来源转换为 JPEG、PNG 或 WebP。必要的方向与色彩信息可能保留；不保证完整元数据、专业色彩或来源凭证的保全。',
    ],
    faq: [
      {
        question: '图片会上传到服务器吗？',
        answer:
          '不会。图片的读取、转换和预览都在你的浏览器中完成。部分格式可能需要加载额外的编码组件，但图片文件本身不会上传。',
      },
      {
        question: '转换后的图片一定会更小吗？',
        answer:
          '不一定。压缩效果取决于原图内容、输出格式和质量设置。AVIF、WebP 通常能提供较好的压缩效率，但较高的质量要求也可能增加文件大小。',
      },
      {
        question: '为什么 AVIF 转换需要更长时间？',
        answer:
          'AVIF 编码通常需要更多计算资源，尤其是高分辨率图片。首次使用时，浏览器可能还需要加载编码组件；后续访问通常可以利用缓存，避免重复下载相同版本的资源。',
      },
      {
        question: 'PNG 转为 JPEG 后，透明背景会怎样？',
        answer:
          'JPEG 不支持透明通道。透明区域会与背景颜色合成，默认使用白色。你可以在高级模式中选择其他背景色。',
      },
      {
        question: '转换时会删除 EXIF 和 GPS 信息吗？',
        answer:
          '默认会清理常见的拍摄位置、设备信息和其他来源隐私元数据。高级模式可选择保留部分 JPEG 图片中的作者与版权信息，但不会因此保留 GPS、拍摄时间或完整 EXIF。请注意，元数据清理不等于删除画面中的水印或隐藏信息。',
      },
      {
        question: '为什么有些图片或输出格式不可用？',
        answer:
          '为了避免生成损坏、方向错误或内容不完整的图片，工具会检查文件结构、浏览器能力和处理资源。动画、部分特殊图片变体，以及超过 AVIF 输出限制的图片可能无法转换。遇到这种情况，可以尝试其他受支持的输出格式。',
      },
    ],
  },
  en: {
    title: 'Online Image Converter - PNG, JPG, WebP & AVIF | Tool4Furry',
    h1: 'Online Image Converter',
    description:
      'Batch convert PNG, JPG, WebP and AVIF images in your browser without uploading files. Adjust quality, preview results and download ZIPs. Common private metadata is removed by default.',
    intro: 'Convert PNG, JPEG, WebP and AVIF images right in your browser.',
    steps: [
      '**Add images**: Select or drag in PNG, JPEG, WebP or AVIF images, or add a folder. Batch processing is supported, and any images added later are appended to the list.',
      '**Choose an output format**: Quick mode converts automatically using recommended settings. Advanced mode lets you adjust encoding quality, the JPEG background color and options such as AVIF colored-edge preservation.',
      '**Review the results**: Preview the original and converted images, and compare file size and resolution. Each image has its own processing status, and failed tasks can be retried individually.',
      '**Download images**: Download images individually or, once batch processing is complete, download the successfully converted images together as a ZIP.',
    ],
    limitations: [
      'Convert static images to and from **PNG, JPEG, WebP and AVIF**. GIF, APNG and other animated formats, along with HEIC, TIFF, SVG and other formats, are not currently supported. See “Supported formats and limits” in the tool for file count, size and resolution limits.',
      '**AVIF has separate processing limits**: Input supports only verified static 8-bit SDR images. Output is currently available only on supported desktop devices, up to 4,194,304 pixels and 4096px on either side. Images are not automatically resized during conversion.',
      'JPEG does not support transparent backgrounds. Transparent areas are filled with the selected color, which is white by default. Format and quality settings may affect detail, color and file size; converted images may not be smaller.',
      'Common source privacy information, such as EXIF and GPS data, is removed by default. Advanced mode can preserve supported author and copyright fields, currently only when converting JPEG sources to JPEG, PNG or WebP. Necessary orientation and color information may remain; complete metadata, professional color fidelity and provenance credentials are not guaranteed to be preserved.',
    ],
    faq: [
      {
        question: 'Are my images uploaded to a server?',
        answer:
          'No. Images are read, converted and previewed entirely in your browser. Some formats may require downloading additional encoding components, but the image files themselves are not uploaded.',
      },
      {
        question: 'Will converted images always be smaller?',
        answer:
          'No. Compression depends on the image content, output format and quality settings. AVIF and WebP often offer good compression efficiency, but higher quality requirements may also increase file size.',
      },
      {
        question: 'Why does AVIF conversion take longer?',
        answer:
          'AVIF encoding generally requires more processing power, especially for high-resolution images. The first use may also require the browser to download encoding components. Subsequent visits can usually use cached resources to avoid downloading the same version again.',
      },
      {
        question: 'What happens to the transparent background when converting PNG to JPEG?',
        answer:
          'JPEG does not support an alpha channel. Transparent areas are composited with the background color, which is white by default. You can choose a different background color in Advanced mode.',
      },
      {
        question: 'Are EXIF and GPS data removed during conversion?',
        answer:
          'Common location, device and other source privacy metadata is removed by default. Advanced mode can preserve author and copyright information from some JPEG images, but this does not retain GPS, capture time or full EXIF data. Metadata cleanup does not remove watermarks or hidden information within the image itself.',
      },
      {
        question: 'Why are some images or output formats unavailable?',
        answer:
          'To avoid producing corrupt, incorrectly oriented or incomplete images, the tool checks file structure, browser capabilities and processing resources. Animations, some special image variants and images exceeding AVIF output limits may not be convertible. If this happens, try another supported output format.',
      },
    ],
  },
};
