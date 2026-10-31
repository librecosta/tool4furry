import type { ToolPageContent } from './tool-content';
import type { Locale } from '../i18n/locale';
// Astro-only guide. Do not import this module from the interactive editor.
export const imageResizeCropContent: Record<Locale, ToolPageContent> = {
  zh: {
    title: '在线图片裁剪与尺寸调整 - 批量缩放 | Tool4Furry',
    h1: '图片尺寸与裁剪',
    description:
      '在线裁剪图片、调整宽高，或按宽度、高度、最长边及百分比批量缩放。支持 PNG、JPEG、WebP 和部分静态 AVIF 输入，图片在浏览器本地处理，无需上传。',
    intro: '自由裁剪、调整尺寸或批量处理图片，全部在浏览器本地完成。',
    steps: [
      '**添加图片：** 选择或拖入图片，可进行单张编辑，也可以一次处理多张图片。',
      '**单张编辑：** 拖动裁剪区域调整构图，选择常用裁剪比例，并设置需要的输出尺寸和格式。',
      '**批量缩放：** 按宽度、高度、最长边或百分比统一调整多张图片的尺寸，点击开始处理。',
      '**预览与下载：** 查看原图与处理效果，单张图片可以直接下载；批量结果支持逐张下载或打包为 ZIP。',
    ],
    limitations: [
      '支持 PNG、JPEG、WebP 和部分静态 AVIF 图片导入，可导出 PNG、JPEG 或 WebP。暂不支持动画图片，以及部分 HDR、高位深等特殊图片。',
      '批量缩放会保留每张图片的完整画面和原有比例，不会自动裁剪。需要调整构图时，请使用单张编辑。',
      '文件数量、大小及分辨率存在处理限制，具体可在工具内查看。放大图片不会增加原有的画面细节。',
      '默认清理常见的来源隐私元数据，例如拍摄位置和设备信息，但不保证清除所有隐藏信息或保留全部原始色彩信息。',
    ],
    faq: [
      {
        question: '图片会上传到服务器吗？',
        answer:
          '不会。图片的读取、处理和导出都在当前浏览器中完成，无需上传。关闭页面后，编辑内容不会被持久保存。',
      },
      {
        question: '可以先裁剪图片，再调整尺寸吗？',
        answer:
          '可以。在单张编辑中选择裁剪区域，再设置需要的宽度和高度，工具会根据当前构图生成图片，无需分两次处理。',
      },
      {
        question: '批量缩放会裁掉图片内容吗？',
        answer:
          '不会。批量模式会保留每张图片的完整画面，并按原有比例调整尺寸。如果需要裁剪某张图片，可以切换到单张编辑。',
      },
      {
        question: '“不放大原图”是什么意思？',
        answer:
          '当目标尺寸大于原图时，工具会保留原有像素尺寸，避免无意义的放大。例如，将最长边设为 1200px，原本只有 800×600 的图片就不会被放大。',
      },
      {
        question: '导出时使用的是缩小后的预览图吗？',
        answer:
          '不是。工作区可能使用较小的图片来保持操作流畅，但最终导出会根据原始图片和当前设置生成，不会直接将屏幕上的预览截图作为结果。',
      },
      {
        question: '图片的透明背景会保留吗？',
        answer:
          'PNG 和 WebP 支持透明背景，实际保留情况取决于来源图片与输出格式。JPEG 不支持透明背景，转换为 JPEG 时会使用背景颜色填充透明区域，默认是白色。',
      },
    ],
  },
  en: {
    title: 'Image Cropper & Resizer – Batch Resize | Tool4Furry',
    h1: 'Image Resize & Crop',
    description:
      'Crop and resize images online, or batch resize by width, height, longest side or percentage. Supports PNG, JPEG, WebP and selected static AVIF images, processed locally in your browser.',
    intro: 'Crop, resize or batch process images right in your browser.',
    headings: {
      steps: 'How to Use',
      limitations: 'Supported Formats & Limitations',
      faq: 'Frequently Asked Questions',
    },
    steps: [
      '**Add images:** Choose images from your device or drag them into the tool. Edit images individually or process multiple files in batch mode.',
      '**Crop and resize:** Drag the crop area to adjust the composition, choose an aspect ratio, and set your preferred output dimensions and format.',
      '**Batch resize:** Resize multiple images by width, height, longest side or percentage, then start processing.',
      '**Preview and download:** Compare original images with their results. Download images individually or save successfully processed files together as a ZIP.',
    ],
    limitations: [
      'Import PNG, JPEG, WebP and supported static AVIF images. Export to PNG, JPEG or WebP. Animated images and some HDR or high-bit-depth formats are not supported.',
      "Batch resizing preserves each image's full frame and aspect ratio without cropping. Use single-image editing when you need to adjust the composition.",
      'Limits apply to file count, file size and resolution. See the tool for details. Enlarging an image does not restore missing detail.',
      'Common source metadata, such as location and camera information, is removed by default. Complete removal of hidden information or exact preservation of original color data cannot be guaranteed.',
    ],
    faq: [
      {
        question: 'Are my images uploaded to a server?',
        answer:
          'No. Images are read, processed and exported directly in your browser without uploading them. Your edits are not saved permanently and are lost when you close the page.',
      },
      {
        question: 'Can I crop and resize an image in one go?',
        answer:
          'Yes. In single-image mode, select the area you want to keep and set your desired width and height. The tool combines cropping and resizing into a single export.',
      },
      {
        question: 'Will batch resizing crop my images?',
        answer:
          'No. Batch mode preserves the entire image and its original aspect ratio. To adjust the composition of a particular image, switch to single-image editing.',
      },
      {
        question: 'What does "Don\'t upscale images" mean?',
        answer:
          'If your target dimensions are larger than the original image, the tool keeps its original pixel dimensions instead of enlarging it. For example, an 800×600 image stays at 800×600 when the maximum side is set to 1200px.',
      },
      {
        question: 'Does exporting use the smaller preview image?',
        answer:
          'No. The workspace may use a smaller preview to keep editing responsive, but the final image is generated from the original file using your current crop and resize settings.',
      },
      {
        question: 'Will my image keep its transparent background?',
        answer:
          'PNG and WebP support transparency, depending on the source image and selected output format. JPEG does not support transparency, so transparent areas are filled with a background color, which is white by default.',
      },
    ],
  },
};
