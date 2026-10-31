import type { ToolPageContent } from './tool-content';
import type { Locale } from '../i18n/locale';
// Astro-only guide. Do not import this module from the interactive editor.
export const imageResizeCropContent: Record<Locale, ToolPageContent> = {
  zh: {
    title: '图片尺寸与裁剪 - 本地裁剪与批量缩放 | Tool4Furry',
    h1: '图片尺寸与裁剪',
    description:
      '在浏览器本地裁剪单张图片或批量缩放多张图片，按宽度、高度、最长边或百分比处理，下载 PNG、JPEG、WebP 和 ZIP。无需上传。',
    intro: '自由裁剪、调整尺寸或批量处理图片，全部在浏览器本地完成。',
    features: [
      '自由裁剪及五种常用比例，支持拖动、触控与键盘微调。',
      '自然裁剪尺寸、精确宽高和百分比缩放；改变输出比例会调整构图，不拉伸画面。',
      '批量按宽度、高度、最长边或百分比缩放，默认不放大小图；逐项下载或打包 ZIP。',
      '支持 PNG、JPEG、WebP 和受限静态 AVIF 输入，输出 PNG、JPEG 或 WebP。',
    ],
    steps: [
      '选择或拖入图片；首次一张进入单图，多张进入批量，后续追加不会自动切换模式。',
      '单张模式选择图片，拖动选区、边缘或角点，或选择常用裁剪比例；切换图片保留各自草稿。',
      '设置目标尺寸与格式，点击下载图片。高级模式可解锁宽高、按选区百分比缩放，以及调整质量、JPEG 背景和文件名；按 Enter 或移出输入区域确认尺寸。',
      '批量模式选择缩放规则、格式、质量和 JPEG 背景，点击开始处理。成功项可独立下载，全部结束后可下载仅含成功项的 ZIP。',
    ],
    limitations: [
      '批量只缩放完整原图，不使用单图裁剪。不提供旋转、透视、AI 放大、历史记录或持久化。',
      '动画、HDR、高位深或无法可靠验证的容器会被拒绝；AVIF 仅支持现有内核验证过的静态子集，且不提供 AVIF 输出。',
      '输入、输出受设备资源预算约束；不会自动缩小或切换格式绕过限制，放大不会增加真实细节。',
      '默认清理常见隐私元数据，不保留作者/版权编辑或完整来源信息，不保证专业色彩保真。',
    ],
    faq: [
      {
        question: '部分批量文件失败怎么办？',
        answer:
          '其他文件会继续处理。可重试失败项，或在全部任务结束后下载只包含成功项的 ZIP。修改规则会立即使旧批量结果失效。',
      },
      {
        question: '图片会上传吗？',
        answer: '不会。图片只在当前浏览器内处理，关闭页面后不会保留编辑草稿。',
      },
      {
        question: '解锁宽高会拉伸图片吗？',
        answer:
          '不会。提交不同宽高比时，会以当前选区中心为优先调整裁剪构图，使其匹配目标比例。像素坐标按整数取整。',
      },
      {
        question: '裁剪后尺寸怎样变化？',
        answer:
          '尚未自定义时跟随裁剪的自然像素尺寸。自定义尺寸后保留有效宽度，并根据后续裁剪比例重新计算高度；百分比始终基于当前裁剪区域。',
      },
      {
        question: '导出使用预览图吗？',
        answer:
          '不会。预览使用有界的方向校正图片；导出直接从已验证原图一次绘制裁剪和缩放，再编码和复检。',
      },
    ],
  },
  en: {
    title: 'Image Resize & Crop - Local Crop & Batch Resize | Tool4Furry',
    h1: 'Image Resize & Crop',
    description:
      'Crop a single image or batch resize images by width, height, longest edge or percentage. Download PNG, JPEG, WebP and ZIP locally without uploads.',
    intro: 'Crop, resize or batch process images right in your browser.',
    features: [
      'Free cropping and five common aspect ratios with pointer, touch and keyboard controls.',
      'Natural crop dimensions, exact width and height, or percentage scaling. A new output ratio reframes the crop without stretching.',
      'Batch resize by width, height, longest edge or percentage, with no enlargement by default. Download individual results or ZIP.',
      'PNG, JPEG, WebP and supported static AVIF input; PNG, JPEG or WebP output.',
    ],
    steps: [
      'Choose or drop images. One initial file opens single mode; multiple files open batch mode. Appending files keeps the current mode.',
      'In single mode, select an image and drag the selection, edges or corners, or choose an aspect ratio. Each image keeps its own draft.',
      'Set the size and format, then download your image. Advanced settings include unlocked dimensions, crop percentage, quality, JPEG background and a filename label. Press Enter or leave the dimension fields to confirm edits.',
      'In batch mode, choose a resize rule, format, quality and JPEG background, then start processing. Download successes individually, or pack successful results into ZIP after all tasks finish.',
    ],
    limitations: [
      'Batch mode resizes full originals and ignores single-image crops. No rotation, perspective, AI enlargement, history or persistence.',
      'Animation, HDR, high bit depth and unverifiable containers are rejected. AVIF input is limited to the existing validated static subset; AVIF output is unavailable.',
      'Device resource budgets apply to input and output. Dimensions or formats are never silently changed to bypass limits. Enlargement adds no original detail.',
      'Common privacy metadata is removed by default. No author/copyright editing, full source metadata preservation or professional color fidelity guarantee.',
    ],
    faq: [
      {
        question: 'What if some batch files fail?',
        answer:
          'Other files continue. Retry failed files, or download a ZIP containing successful results after every task finishes. Changing rules immediately invalidates old batch results.',
      },
      {
        question: 'Are images uploaded?',
        answer:
          'No. Images are processed in this browser. The edit is not retained when you close the page.',
      },
      {
        question: 'Does unlocking dimensions stretch pixels?',
        answer:
          'No. Applying a different ratio reframes the crop around its current center where possible. Source pixel coordinates are rounded to integers.',
      },
      {
        question: 'How do dimensions follow cropping?',
        answer:
          'Until customized, output follows the natural crop size. After customization, width is retained and height follows later crop changes. Percentage scaling always uses the current crop.',
      },
      {
        question: 'Is the preview used for export?',
        answer:
          'No. The preview is a bounded, oriented image. Export draws directly from the validated original, combining crop and resize in one operation before encoding and validation.',
      },
    ],
  },
};
