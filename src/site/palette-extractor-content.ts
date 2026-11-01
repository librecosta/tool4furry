import type { ToolPageContent } from './tool-content';

export const paletteExtractorContent: Record<'zh' | 'en', ToolPageContent> = {
  zh: {
    title: '在线图片取色与调色板提取 - 配色分享图 | Tool4Furry',
    description:
      '从图片中自动提取配色，手动取色、编辑色卡、复制 HEX 和 RGB，下载调色板或生成图片与色带组合的 PNG 分享图。全部在浏览器本地完成。',
    h1: '图片调色板提取',
    intro: '从作品中发现配色，调整每一种颜色，再把图片与色带一起保存下来。',
    steps: [
      '**添加图片：** 选择或拖入一张图片，工具会自动提取其中的主要颜色。',
      '**提取配色：** 选择均衡、鲜明、明亮等提色倾向，设置 3–10 个目标颜色。',
      '**调整色卡：** 在图片上取色，或通过颜色选择器、HEX 输入修改颜色。还可以新增、删除、调整顺序和复制色值。',
      '**下载与分享：** 下载基础色卡，或将作品与色带组合成分享图。选择排列方向、输出比例和展示颜色数，最后下载 PNG。',
    ],
    limitations: [
      '支持 PNG、JPEG、WebP 和部分静态 AVIF 图片。一次处理一张，暂不支持动画及部分特殊图片格式。',
      '文件大小和分辨率存在设备相关的处理限制，具体可在工具内查看。',
      '完全透明的图片无法提取颜色。自动提取会忽略透明区域，并尽量减少相近颜色的重复。提取结果适合创作参考，不保证专业级色彩精度。',
      '所有处理均在浏览器本地完成，编辑内容不会持久保存。分享图用于展示作品配色，不代替原始图片；固定输出比例可能裁剪部分画面。',
    ],
    faq: [
      {
        question: '图片会上传到服务器吗？',
        answer:
          '不会。图片读取、颜色提取、编辑和分享图生成都在当前浏览器中完成，无需上传。',
      },
      {
        question: '为什么提取出的颜色少于设置的数量？',
        answer:
          '如果图片中可区分的颜色较少，工具不会为了凑数添加大量相似色。你可以手动增加颜色，最终调色板支持 1–10 色。',
      },
      {
        question: '可以自己选择或修改颜色吗？',
        answer:
          '可以。你可以在图片上拖动取色标记，直接选取需要的颜色，也可以通过颜色选择器或 HEX 输入修改色卡。',
      },
      {
        question: '重新提取会覆盖我调整过的颜色吗？',
        answer:
          '会。重新提取会生成新的调色板。如果已经手动修改过颜色，工具会先询问是否覆盖。取消操作即可保留现有配色。',
      },
      {
        question: '制作分享图会裁剪原图吗？',
        answer:
          '选择「原图比例」时，在支持的尺寸范围内会完整保留作品画面。选择固定比例时，部分画面可能被裁切，你可以在预览中移动或缩放图片调整构图。分享图会将图片与色带组合后导出为 PNG。',
      },
    ],
  },
  en: {
    title: 'Image Color Palette Extractor & Picker | Tool4Furry',
    description:
      'Extract colors from images, pick and edit swatches, copy HEX and RGB values, and create PNG palette cards with your artwork. Everything runs locally in your browser.',
    h1: 'Palette Extractor',
    intro:
      'Discover the colors in your artwork, fine-tune your palette, and bring your image and colors together in a shareable card.',
    headings: {
      steps: 'How to Use',
      limitations: 'Supported Formats & Limitations',
      faq: 'Frequently Asked Questions',
    },
    steps: [
      '**Add an image:** Choose or drag in an image. The tool automatically extracts its main colors.',
      '**Extract your palette:** Choose a color direction, such as Balanced, Colorful or Bright, and select 3–10 target colors.',
      '**Refine your colors:** Pick colors directly from the image, use the color picker or enter HEX values. Add, remove, reorder or copy swatches as needed.',
      '**Download your palette:** Save a simple palette card, or combine your artwork with a color strip. Choose the layout, output ratio and number of colors, then download a PNG.',
    ],
    limitations: [
      'Supports PNG, JPEG, WebP and selected static AVIF images. One image at a time. Animations and some specialized image formats are not supported.',
      'File size and resolution limits depend on your device. Check the tool for the applicable limits.',
      'Fully transparent images cannot be analyzed. Transparent areas are ignored, and similar colors may be combined. Extracted colors are intended for creative reference rather than color-critical work.',
      'All processing happens locally in your browser, without persistent storage. Share cards are intended to present artwork and its palette, not replace the original image. Fixed output ratios may crop parts of the artwork.',
    ],
    faq: [
      {
        question: 'Are my images uploaded to a server?',
        answer:
          'No. Your images are read, analyzed, edited and rendered directly in your browser without uploading them.',
      },
      {
        question: 'Why did I get fewer colors than requested?',
        answer:
          'If an image has only a few distinct colors, the tool avoids filling your palette with near duplicates. You can add colors manually, with up to 10 swatches in your edited palette.',
      },
      {
        question: 'Can I pick or edit colors myself?',
        answer:
          'Yes. Drag the sampling markers over your image to choose colors, or use the color picker and HEX input to adjust individual swatches.',
      },
      {
        question: 'Will extracting again overwrite my edits?',
        answer:
          "Yes. Re-extracting generates a new palette. If you've edited your colors, the tool asks for confirmation before replacing them. Cancel to keep your current palette.",
      },
      {
        question: 'Will creating a share card crop my artwork?',
        answer:
          'The Original Image option preserves the full composition within supported output limits. Fixed aspect ratios may crop the artwork, but you can move or zoom the image in the preview before downloading your PNG.',
      },
    ],
  },
};
