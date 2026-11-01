import type { ComparisonLabels } from '../image/ImageComparisonDialog';
const zh = {
  title: '图片压缩', close: '关闭', import: '选择图片或拖放到这里', append: '追加图片', limits: '支持格式与限制', perFile: '每张',
  limitText: '支持静态 PNG、JPEG、WebP 和部分 AVIF。动画和部分特殊图片不受支持；图片仅在本地处理。',
  settings: '压缩设置', mode: '压缩方式', recommended: '推荐压缩', quality: '调整质量', target: '目标大小',
  format: '输出格式', targetLabel: '每张图片的目标大小', unit: '单位', longest: '最长边（像素，可选）',
  longestHint: '留空保留原始尺寸；只缩小，不放大。', qualityLabel: '图像质量', maxQuality: '质量上限',
  targetHint: '目标大小不保证达到；处理后显示实际结果。', pngHint: 'PNG 不使用有损质量。需要更小文件时，可选择 JPEG 或 WebP。',
  background: 'JPEG 背景色', start: '开始压缩', cancel: '取消处理', clear: '清空列表', zip: '下载 ZIP',
  zipPartial: 'ZIP 将包含当前已完成的结果。', tasks: '图片列表', preview: '预览', download: '下载', retry: '重试', remove: '移除',
  original: '原图', output: '结果', validating: '检查中', queued: '等待中', processing: '处理中', stale: '待处理', error: '处理失败',
  reduced: '已减小', larger: '文件变大', unchanged: '大小未减小', missed: '未达目标', saved: '节省', increase: '增加',
  invalid: '请输入有效数值。目标为 1 KB–128 MB，最长边为 1–10000 的整数。', rejected: '以下文件超过数量或大小限制：',
  failed: '无法处理此图片。请检查格式、尺寸或编码支持后重试。', budget: '结果累计大小超过限制，请下载并移除已完成的图片后重试。',
  timeout: '处理超时，请减小尺寸后重试。', zipError: 'ZIP 未生成：请等待处理完成，或减少文件后重试。',
  completed: '已处理', failedCount: '失败', imageError: '图片无法显示，请重试。',
};
export const messages: Record<'zh' | 'en', typeof zh> = {zh, en: {
  title: 'Image Compressor', close: 'Close', import: 'Choose images or drop them here', append: 'Add images', limits: 'Supported formats & limits', perFile: 'per file',
  limitText: 'Supports static PNG, JPEG, WebP and selected AVIF images. Animations and some specialized images are unsupported. Images stay on your device.',
  settings: 'Compression settings', mode: 'Compression method', recommended: 'Recommended', quality: 'Adjust quality', target: 'Target size',
  format: 'Output format', targetLabel: 'Target size per image', unit: 'Unit', longest: 'Longest side (pixels, optional)',
  longestHint: 'Leave blank for original dimensions. Images are only reduced, never enlarged.', qualityLabel: 'Image quality', maxQuality: 'Maximum quality',
  targetHint: 'Size targets are not guaranteed. Actual results are shown after processing.', pngHint: 'PNG has no lossy quality setting. Choose JPEG or WebP for smaller files.',
  background: 'JPEG background', start: 'Start compression', cancel: 'Cancel processing', clear: 'Clear list', zip: 'Download ZIP',
  zipPartial: 'The ZIP will include the currently completed results.', tasks: 'Image list', preview: 'Preview', download: 'Download', retry: 'Retry', remove: 'Remove',
  original: 'Original', output: 'Output', validating: 'Checking', queued: 'Waiting', processing: 'Processing', stale: 'Ready to process', error: 'Failed',
  reduced: 'Smaller', larger: 'File grew', unchanged: 'No size reduction', missed: 'Target not met', saved: 'saved', increase: 'larger',
  invalid: 'Enter a valid number. Target: 1 KB–128 MB. Longest side: an integer from 1 to 10000.', rejected: 'These files exceed the count or size limits:',
  failed: 'This image could not be processed. Check its format, dimensions or encoder support, then retry.', budget: 'Completed results exceed the size limit. Download and remove completed images, then retry.',
  timeout: 'Processing timed out. Try smaller dimensions.', zipError: 'ZIP was not created. Wait for processing to finish, or reduce the file count and retry.',
  completed: 'Processed', failedCount: 'Failed', imageError: 'The image could not be displayed. Please retry.',
}};
export const comparisonLabels: Record<'zh' | 'en', ComparisonLabels> = {
  zh: {preview: '图片预览', original: '原图', output: '结果', compare: '对比', previewToggle: '查看方式', outputUnavailable: '尚无有效结果', closePreview: '关闭预览', maximizePreview: '放大预览', restorePreview: '还原预览',
    viewer: {fit: '适应画面', actual: '100%', zoomIn: '放大', zoomOut: '缩小', reset: '重置视图', viewport: '图片视图', instructions: '拖动查看图片，使用工具栏缩放。', loading: '正在加载…', error: '图片无法显示。'}},
  en: {preview: 'Image preview', original: 'Original', output: 'Output', compare: 'Compare', previewToggle: 'Preview mode', outputUnavailable: 'No current output yet', closePreview: 'Close preview', maximizePreview: 'Maximize preview', restorePreview: 'Restore preview',
    viewer: {fit: 'Fit image', actual: '100%', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view', viewport: 'Image view', instructions: 'Drag to pan and use the toolbar to zoom.', loading: 'Loading…', error: 'The image could not be displayed.'}},
};
