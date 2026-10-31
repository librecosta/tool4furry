import type { Locale } from '../../i18n/locale';
import type { ComparisonLabels } from './ImageComparisonDialog';

export const imagePreviewMessages = {
  zh: {
    preview: '图片预览', original: '原图', output: '结果', compare: '对比',
    closePreview: '关闭图片预览', maximizePreview: '全屏预览', restorePreview: '退出全屏预览',
    previewToggle: '预览内容', outputUnavailable: '结果尚未就绪或已失效。',
    viewer: {
      fit: '适应窗口', actual: '100% 实际尺寸', zoomIn: '放大图片', zoomOut: '缩小图片', reset: '重置视图',
      viewport: '图片查看区域', instructions: '滚轮或双指缩放，拖动平移。方向键移动，+/- 缩放，0 适应窗口，1 实际尺寸。',
      loading: '正在加载预览…', error: '图片预览无法加载，请重新选择图片或生成结果。',
    },
  },
  en: {
    preview: 'Image preview', original: 'Original', output: 'Output', compare: 'Compare',
    closePreview: 'Close image preview', maximizePreview: 'Fullscreen preview', restorePreview: 'Exit fullscreen preview',
    previewToggle: 'Preview content', outputUnavailable: 'Output is not ready or is out of date.',
    viewer: {
      fit: 'Fit to window', actual: '100% actual size', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view',
      viewport: 'Image viewing area', instructions: 'Scroll or pinch to zoom; drag to pan. Arrow keys pan, +/- zoom, 0 fits, and 1 shows actual size.',
      loading: 'Loading preview…', error: 'The image preview could not load. Choose the image again or generate a new result.',
    },
  },
} satisfies Record<Locale, ComparisonLabels>;
