import type { ToolPageContent } from './tool-content';
export const paletteExtractorContent: Record<'zh' | 'en', ToolPageContent> = {
  zh: {
    title: '图片调色板提取 - 编辑配色与分享图 | Tool4Furry',
    h1: '图片调色板提取',
    description:
      '从图片中自动发现配色，在浏览器本地编辑色卡、复制 HEX 与 RGB，并使用三套模板制作 PNG 分享图。图片无需上传。',
    intro:
      '添加一张作品，发现其中的配色。调整提色倾向、手动取色与编辑色卡，再下载调色板或制作分享图。',
    steps: [
      '添加 PNG、JPEG、WebP 或受支持的静态 AVIF，工具会自动提取配色。',
      '选择提色倾向与 3–10 个目标颜色。可以输入 HEX、从图片取色、新增、删除或调整色卡顺序。',
      '复制色值、下载基础色卡，或打开“制作分享图”，选择模板、填写标题并下载 PNG。支持的浏览器也可以分享图片。',
    ],
    limitations: [
      '一次处理一张静态图片，数量较少的颜色不会强行补齐。文件大小、像素与单边限制以工具内提示为准。动画与无法可靠验证的特殊格式不支持。',
      '自动分析最长边不超过 640px，手动取色来自最长边不超过 1600px 的方向校正预览。结果用于创作参考，不承诺专业色彩保真。',
      '完全透明像素不参与提色，低透明度边缘默认过滤；全图只有半透明内容时会适度降低阈值。',
      '图片与配色只在浏览器本地处理，不持久保存。分享图使用有界预览作品，导出为固定尺寸 PNG；请保留原图。',
    ],
    faq: [
      {
        question: '作品会上传吗？',
        answer:
          '不会。读取图片、提色、编辑及分享图绘制都在你的浏览器中完成。系统分享只会在你主动选择分享图片后交由设备处理。',
      },
      {
        question: '为什么提取颜色少于目标数量？',
        answer:
          '单色或少色图片会返回较少的代表色，避免用近重复颜色凑数。你仍可以手动新增颜色，最终调色板支持 1–10 色。',
      },
      {
        question: '手动编辑后更改提色倾向会怎样？',
        answer:
          '重新提取会生成新的自动调色板。有手动编辑时会先确认；取消则保留当前配色。模板和标题变化不会重置色卡。',
      },
      {
        question: '可以生成分享链接吗？',
        answer:
          '不生成在线链接。你可以下载 PNG，或在支持文件分享的浏览器中使用系统分享。',
      },
    ],
  },
  en: {
    title: 'Palette Extractor - Edit Colors & Share Artwork | Tool4Furry',
    h1: 'Palette Extractor',
    description:
      'Discover colors from images locally, edit swatches, copy HEX and RGB values, and create PNG artwork with three sharing templates. No image uploads.',
    intro:
      'Add an artwork to discover its colors. Choose a color direction, sample and edit swatches, then download a palette or create a share image.',
    steps: [
      'Add a PNG, JPEG, WebP or supported static AVIF. Colors are extracted automatically.',
      'Choose a direction and 3–10 target colors. Enter HEX values, sample from the image, add, remove or reorder swatches.',
      'Copy values, download a basic palette, or choose Create share image to select a template, add a title and download a PNG. Supported browsers can also share the image.',
    ],
    limitations: [
      'One static image at a time. Images with few distinct colors may return fewer swatches. File, pixel and edge limits are shown in the tool. Animation and unsupported variants are rejected.',
      'Analysis uses a maximum 640px edge; manual sampling uses an oriented preview up to 1600px. Colors are a creative reference, not a promise of professional color fidelity.',
      'Fully transparent pixels are ignored. Low-alpha edges are filtered by default; the threshold is lowered for images containing only translucent content.',
      'Images and palettes are processed locally without persistent storage. Share artwork uses the bounded image preview and fixed PNG dimensions. Keep your original image.',
    ],
    faq: [
      {
        question: 'Is my artwork uploaded?',
        answer:
          'No. Reading, extracting, editing and drawing all happen in your browser. System sharing only hands the image to your device after you choose to share it.',
      },
      {
        question: 'Why are there fewer colors than requested?',
        answer:
          'Single-color and limited-color images return fewer representative swatches instead of near duplicates. You can manually add colors; the edited palette supports 1–10 colors.',
      },
      {
        question: 'What happens if I change direction after editing?',
        answer:
          'Extraction generates a new automatic palette. You will be asked to confirm before replacing manual edits. Cancelling keeps your palette; template and title changes never reset it.',
      },
      {
        question: 'Can I create a share link?',
        answer:
          'No online links are generated. Download a PNG, or use system sharing in a browser that supports sharing image files.',
      },
    ],
  },
};
