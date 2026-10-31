import type { ToolPageContent } from './tool-content';
import type { Locale } from '../i18n/locale';
// Astro-only guide. Do not import this module from the interactive editor.
export const imageResizeCropContent: Record<Locale, ToolPageContent> = {
  zh: {
    title: '图片尺寸与裁剪 - 本地单张图片编辑 | Tool4Furry',
    h1: '图片尺寸与裁剪',
    description:
      '在浏览器本地自由裁剪或按比例裁剪单张图片，设置精确像素或百分比，预览并导出 PNG、JPEG、WebP。无需上传。',
    intro:
      '围绕画面主体调整构图，再指定需要的像素尺寸。单张图片在浏览器本地完成裁剪和缩放，导出前可随时查看构图。',
    features: [
      '自由裁剪及五种常用比例，支持拖动、触控与键盘微调。',
      '自然裁剪尺寸、精确宽高和百分比缩放；改变输出比例会调整构图，不拉伸画面。',
      '支持 PNG、JPEG、WebP 和受限静态 AVIF 输入，输出 PNG、JPEG 或 WebP。',
    ],
    steps: [
      '导入一张图片，初始选区和输出尺寸为完整原图。',
      '拖动选区、边缘或角点，或选择常用裁剪比例。',
      '保持比例设置像素尺寸，或解锁后应用宽高；也可以按当前裁剪区域的百分比缩放。',
      '选择格式、质量和 JPEG 背景色，导出后下载经过验证的结果。',
    ],
    limitations: [
      '本阶段只编辑一张图片，不提供批量、ZIP、旋转、透视、AI 放大、历史记录或持久化。',
      '动画、HDR、高位深或无法可靠验证的容器会被拒绝；AVIF 仅支持现有内核验证过的静态子集，且不提供 AVIF 输出。',
      '输入、输出受设备资源预算约束；不会自动缩小或切换格式绕过限制，放大不会增加真实细节。',
      '默认清理常见隐私元数据，不保留作者/版权编辑或完整来源信息，不保证专业色彩保真。',
    ],
    faq: [
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
    title: 'Image Resize & Crop - Local Single Image Editor | Tool4Furry',
    h1: 'Image Resize & Crop',
    description:
      'Crop one image freely or to an aspect ratio, set exact pixels or a percentage, preview and export PNG, JPEG or WebP locally without uploads.',
    intro:
      'Frame your subject and set the pixel dimensions you need. Crop and resize one image locally in your browser, with a live composition preview before export.',
    features: [
      'Free cropping and five common aspect ratios with pointer, touch and keyboard controls.',
      'Natural crop dimensions, exact width and height, or percentage scaling. A new output ratio reframes the crop without stretching.',
      'PNG, JPEG, WebP and supported static AVIF input; PNG, JPEG or WebP output.',
    ],
    steps: [
      'Import one image. The initial crop and output dimensions cover the full original.',
      'Drag the selection, edges or corners, or select a crop aspect ratio.',
      'Set pixels with the ratio locked, unlock and apply dimensions, or scale relative to the current crop.',
      'Choose a format, quality and JPEG background, then export and download the validated result.',
    ],
    limitations: [
      'This stage edits one image only. No batches, ZIP, rotation, perspective, AI enlargement, history or persistence.',
      'Animation, HDR, high bit depth and unverifiable containers are rejected. AVIF input is limited to the existing validated static subset; AVIF output is unavailable.',
      'Device resource budgets apply to input and output. Dimensions or formats are never silently changed to bypass limits. Enlargement adds no original detail.',
      'Common privacy metadata is removed by default. No author/copyright editing, full source metadata preservation or professional color fidelity guarantee.',
    ],
    faq: [
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
