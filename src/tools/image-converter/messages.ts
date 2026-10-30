import type { Locale } from '../../i18n/locale';
import type { ImageErrorCode } from '../image/types';
import {
  mobileImageLimits,
  zipOutputBytes,
  avifOutputLimits,
  type ImageLimits,
} from '../image/limits';
const zhMessages = {
  local: '图片只在当前浏览器内处理，不会上传。',
  fileDetails: '支持格式与限制',
  pick: '选择图片或拖放到这里',
  addImages: '添加图片',
  addFolder: '添加文件夹',
  folderUnavailable: '当前浏览器不支持选择文件夹，请使用添加图片。',
  clear: '清空列表',
  clearDescription: '移除所有文件和转换结果？此操作不会删除设备上的原文件。',
  clearConfirm: '清空',
  cancel: '取消',
  generateAll: '转换全部',
  zip: {
    download: '下载 ZIP',
    packing: '正在打包…',
    retry: '重试下载 ZIP',
    wait: '等待所有任务完成；过期结果需重新生成。',
    settings: '请先修正设置或文件名标签。',
    empty: '没有可打包的有效结果。',
    success: '成功',
    failedCount: '失败',
    budget: `ZIP 超过 ${zipOutputBytes / 1024 ** 2} MiB，请使用单项下载。`,
    changed: '工作区结果或设置已变化，请重新打包。',
    failed: '打包失败，请重试。仍可逐项下载。',
  },
  intakeAccepted: '已添加',
  intakeSkipped: '已跳过',
  intakeReasons: {
    type: '不支持的类型',
    size: '',
    count: '',
    total: '',
  },
  remove: '移除图片',
  file: '添加图片',
  settings: '转换设置',
  preview: '图片预览',
  tasks: '文件任务',
  closePreview: '关闭图片预览',
  maximizePreview: '全屏预览',
  restorePreview: '退出全屏预览',
  previewToggle: '预览内容',
  outputUnavailable: '输出尚未就绪或已过期。',
  viewer: {
    fit: '适应窗口',
    actual: '100% 实际尺寸',
    zoomIn: '放大图片',
    zoomOut: '缩小图片',
    reset: '重置视图',
    viewport: '图片查看区域',
    instructions:
      '滚轮或双指缩放，拖动平移。方向键移动，+/- 缩放，0 适应窗口，1 实际尺寸。',
    loading: '正在加载预览…',
    error: '图片预览无法加载，请重新选择图片或生成结果。',
  },
  taskStatus: {
    validating: '验证中',
    queued: '待生成',
    processing: '处理中',
    ready: '已就绪',
    stale: '需重新生成',
    error: '转换失败',
  },
  formats: '输出格式',
  quick: '快速',
  advanced: '高级',
  modes: '设置模式',
  restore: '恢复当前格式推荐',
  quality: '编码质量',
  smallerFile: '较小文件',
  higherQuality: '较高质量',
  precise: '精确质量（1–100）',
  avif444: '彩色边缘保真',
  preserveAuthorship: '保留作者与版权信息',
  authorshipHint: '默认移除常见 EXIF/GPS 等隐私信息。启用后仅保留 JPEG 来源中已验证的作者、版权字段；GPS、设备、拍摄时间仍移除，不保留完整 EXIF、XMP、IPTC 或 C2PA。不支持的文件会逐项报错。',
  authorshipUnavailable: '仅支持 JPEG 来源 → JPEG、PNG、WebP；AVIF 暂不支持保留。',
  avif444Hint: '使用 4:4:4 色度采样，适合彩色文字与线条；文件可能变大。',
  avifLimits: '',
  qualityError: '请输入 1–100 的整数。',
  background: 'JPEG 背景色',
  pickBackground: '选择 JPEG 背景色',
  backgroundError: '使用 #RRGGBB 格式，例如 #FFFFFF。',
  filename: '文件名标签（可选）',
  filenameExample: '文件名示例：',
  filenameError:
    '标签最多 40 个 UTF-8 字节，不能含路径/控制字符、保留名称、首尾空格或结尾句点。',
  unavailable: '此浏览器无法验证该格式输出。',
  retryCapability: '重新检测输出能力',
  none: '暂无可用的默认输出格式，请重试检测或选择可用格式。',
  retry: '重试当前设置',
  download: '下载结果',
  cleanedDownload: '下载清理结果',
  originalDownload: '下载原图',
  original: '原图',
  output: '输出',
  previewError: '预览加载失败。请重新选择图片或生成结果。',
  limitations:
    '仅静态 PNG/JPEG/WebP/AVIF，分辨率不变。AVIF 仅接受经验证的 8-bit SDR 结构，特殊变体可能不可用。默认移除常见隐私元数据，可能保留必要的方向与色彩信息；不清除像素水印或隐写内容。重新编码可能改变色彩或使文件变大。',
  budget: '',
  disabledCount: '',
  disabledSize: '',
  disabledType: '文件类型不支持。',
  errors: {
    empty: '文件为空，请重新选择。',
    bytes: '',
    dimensions: '',
    unsupported: '仅接受静态 PNG、JPEG、WebP、AVIF；此文件不属于支持范围。',
    corrupt: '图片结构损坏、截断或不符合支持范围，请换一张完整图片。',
    animated: '不支持 APNG、动画 WebP 或多帧 AVIF；不会把第一帧当作转换结果。',
    decode: '浏览器无法正确解码这张图片或其方向，请换图或换浏览器。',
    encode: '浏览器未能完成编码，请重试或选择另一输出格式。',
    output: '输出的真实格式、尺寸或可解码性不符，已阻止下载。',
    metadata: '无法可靠地无损清理此文件的元数据。可主动切换到高级模式重新编码；画质、色彩和大小可能变化。',
    metadataSource: '保留作者与版权仅支持 JPEG 来源 → JPEG、PNG、WebP。请取消保留或选择支持的格式；其他文件可继续处理。',
    metadataFields: '无法安全保留此文件的作者或版权字段：目前仅支持每项最多 1023 字节的标准 EXIF ASCII 文本。请取消保留后重试。',
    orientation: '此 WebP 或 AVIF 的方向组合暂不受支持，无法保证方向正确；请使用其他来源图片。',
    avifVariant: '此 AVIF 的结构、色彩或位深暂不受支持。仅接受经验证的静态 8-bit SDR 图片。',
    avifBudget: '图片超过 AVIF 输出上限，不会自动缩小；请主动选择其他输出格式。',
    avifDevice: 'AVIF 输出暂仅开放给可识别的桌面设备；移动端及未知设备暂不可用。',
    avifLoad: 'AVIF 编码器加载失败，请检查网络后重试。文件仍只在本地处理。',
    avifTimeout: 'AVIF 编码超时，已停止处理并释放编码器。可重试或主动选择其他格式。',
    timeout: '处理超时，请稍候再试或重新加载页面。大图片可能需要更长时间。',
    cancelled: '操作已取消。',
  } satisfies Record<ImageErrorCode, string>,
};
const en: typeof zhMessages = {
  local: 'Images stay in this browser. Nothing is uploaded.',
  fileDetails: 'Supported formats and limits',
  pick: 'Choose images or drop them here',
  addImages: 'Add images',
  addFolder: 'Add folder',
  folderUnavailable:
    'Folder selection is unavailable in this browser. Use Add images instead.',
  clear: 'Clear list',
  clearDescription:
    'Remove all files and conversion results? Original files on your device will not be deleted.',
  clearConfirm: 'Clear',
  cancel: 'Cancel',
  generateAll: 'Convert all',
  zip: {
    download: 'Download ZIP',
    packing: 'Packing…',
    retry: 'Retry ZIP download',
    wait: 'Wait for all tasks to finish. Regenerate stale results first.',
    settings: 'Correct settings or the filename label first.',
    empty: 'No valid results to package.',
    success: 'Succeeded',
    failedCount: 'Failed',
    budget: `ZIP exceeds ${zipOutputBytes / 1024 ** 2} MiB. Download files individually.`,
    changed: 'Workspace results or settings changed. Please package again.',
    failed: 'Packaging failed. Retry or download files individually.',
  },
  intakeAccepted: 'Added',
  intakeSkipped: 'Skipped',
  intakeReasons: {
    type: 'unsupported type',
    size: '',
    count: '',
    total: '',
  },
  remove: 'Remove image',
  file: 'Add images',
  settings: 'Conversion settings',
  preview: 'Image preview',
  tasks: 'File tasks',
  closePreview: 'Close image preview',
  maximizePreview: 'Fullscreen preview',
  restorePreview: 'Exit fullscreen preview',
  previewToggle: 'Preview content',
  outputUnavailable: 'Output is not ready or is out of date.',
  viewer: {
    fit: 'Fit to window',
    actual: '100% actual size',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
    viewport: 'Image viewing area',
    instructions:
      'Scroll or pinch to zoom; drag to pan. Arrow keys pan, +/- zoom, 0 fits, and 1 shows actual size.',
    loading: 'Loading preview…',
    error:
      'The image preview could not load. Choose the image again or generate a new result.',
  },
  taskStatus: {
    validating: 'Checking',
    queued: 'Queued',
    processing: 'Processing',
    ready: 'Ready',
    stale: 'Regenerate',
    error: 'Failed',
  },
  formats: 'Output format',
  quick: 'Quick',
  advanced: 'Advanced',
  modes: 'Settings mode',
  restore: 'Restore this format’s defaults',
  quality: 'Encoding quality',
  smallerFile: 'Smaller file',
  higherQuality: 'Higher quality',
  precise: 'Exact quality (1–100)',
  avif444: 'Preserve colored edges',
  preserveAuthorship: 'Preserve author and copyright information',
  authorshipHint: 'Common EXIF/GPS privacy data is removed by default. When enabled, only verified author and copyright fields from JPEG sources are retained. GPS, device and capture time are still removed; this does not preserve full EXIF, XMP, IPTC or C2PA. Unsupported files fail individually.',
  authorshipUnavailable: 'Supported only from JPEG to JPEG, PNG or WebP. Preservation is unavailable for AVIF.',
  avif444Hint: 'Use 4:4:4 chroma sampling for colored text and lines. Files may be larger.',
  avifLimits: '',
  qualityError: 'Enter an integer from 1 to 100.',
  background: 'JPEG background',
  pickBackground: 'Choose JPEG background color',
  backgroundError: 'Use #RRGGBB, for example #FFFFFF.',
  filename: 'Filename label (optional)',
  filenameExample: 'Filename example:',
  filenameError:
    'Use at most 40 UTF-8 bytes. Avoid paths, control characters, reserved names, surrounding spaces and trailing dots.',
  unavailable: 'This browser could not verify export in this format.',
  retryCapability: 'Check export support again',
  none: 'No default export format is available. Retry detection or select a supported format.',
  retry: 'Retry current settings',
  download: 'Download result',
  cleanedDownload: 'Download cleaned result',
  originalDownload: 'Download original',
  original: 'Original',
  output: 'Output',
  previewError:
    'The preview could not load. Choose the image again or generate a new result.',
  limitations:
    'Static PNG/JPEG/WebP/AVIF, with unchanged resolution. AVIF accepts verified 8-bit SDR structures only; special variants may be unavailable. Common private metadata is removed by default; necessary orientation and color information may remain. Pixel watermarks and steganography are not removed. Re-encoding may change colors or increase file size.',
  budget: '',
  disabledCount: '',
  disabledSize: '',
  disabledType: 'Unsupported file type.',
  errors: {
    empty: 'The file is empty. Choose another image.',
    bytes: '',
    dimensions: '',
    unsupported:
      'Only static PNG, JPEG, WebP and AVIF are accepted. This file is outside the supported scope.',
    corrupt:
      'The image is truncated, damaged or outside the supported structure. Choose a complete image.',
    animated:
      'APNG, animated WebP and multi-frame AVIF are unsupported. The first frame will not be substituted.',
    decode:
      'The browser could not decode this image or its orientation correctly. Try another image or browser.',
    encode:
      'The browser could not encode the image. Retry or choose another output format.',
    output:
      'Actual output format, dimensions or decoding did not match. Download was blocked.',
    metadata:
      'This file cannot be cleaned reliably without re-encoding. You can explicitly use Advanced to re-encode; quality, colors and size may change.',
    orientation:
      'This WebP or AVIF orientation combination is not supported reliably. Use another source image.',
    avifVariant: 'This AVIF structure, color profile or bit depth is unsupported. Only verified static 8-bit SDR images are accepted.',
    metadataSource: 'Author and copyright preservation supports JPEG sources to JPEG, PNG or WebP only. Turn preservation off or choose a supported format; other files can continue.',
    metadataFields: 'These author or copyright fields cannot be safely retained. Only standard EXIF ASCII text up to 1023 bytes per field is supported. Turn preservation off and retry.',
    avifBudget: 'The image exceeds AVIF export limits and will not be resized. Explicitly choose another output format.',
    avifDevice: 'AVIF export is currently available only on recognized desktop devices, not mobile or unknown devices.',
    avifLoad: 'The AVIF encoder could not load. Check your connection and retry. Files are still processed locally.',
    avifTimeout: 'AVIF encoding timed out. The encoder was stopped and released. Retry or explicitly choose another format.',
    timeout:
      'Processing timed out. Wait and retry, or reload this page. Large images may take longer.',
    cancelled: 'The operation was cancelled.',
  },
};
/** All visible bounds come from the same immutable limits used by this workspace. */
export function getConverterMessages(locale: Locale, limits: ImageLimits) {
  const t = locale === 'zh' ? zhMessages : en;
  const zh = locale === 'zh';
  const perFile = limits.bytes / 1024 ** 2;
  const total = limits.totalBytes / 1024 ** 2;
  const pixels = zh
    ? `${limits.pixels / 10_000} 万像素`
    : `${limits.pixels / 1_000_000} million pixels`;
  const size = zh
    ? `单文件超过 ${perFile} MiB`
    : `over ${perFile} MiB per file`;
  return {
    ...t,
    avifLimits: zh
      ? `AVIF 输出：仅桌面，最多 ${avifOutputLimits.pixels.toLocaleString('en-US')} 像素、单边 ${avifOutputLimits.edge}px；单任务 ${avifOutputLimits.timeout / 1000} 秒。`
      : `AVIF export: desktop only, up to ${avifOutputLimits.pixels.toLocaleString('en-US')} pixels, ${avifOutputLimits.edge}px per edge and ${avifOutputLimits.timeout / 1000}s per task.`,
    budget: zh
      ? `最多 ${limits.files} 张，累计 ${total} MiB；单张 ${perFile} MiB、${pixels}、单边 ${limits.edge}px。大图处理可能较慢，请保留原文件。`
      : `Up to ${limits.files} images, ${total} MiB total; ${perFile} MiB, ${pixels} and ${limits.edge}px per image. Large images may take longer. Keep your originals.`,
    disabledCount: zh
      ? `最多接收 ${limits.files} 张图片。`
      : `Up to ${limits.files} images per workspace.`,
    disabledSize: size,
    intakeReasons: {
      ...t.intakeReasons,
      size,
      count: zh ? `超过 ${limits.files} 张图片` : `over ${limits.files} images`,
      total: zh ? `累计超过 ${total} MiB` : `over ${total} MiB total`,
    },
    errors: {
      ...t.errors,
      bytes: zh
        ? `文件超过 ${perFile} MiB，请选择较小的图片。`
        : `The file exceeds ${perFile} MiB. Choose a smaller image.`,
      dimensions: zh
        ? `图片超过 ${pixels} 或单边 ${limits.edge}px，不会自动缩小。`
        : `The image exceeds ${pixels} or ${limits.edge}px per edge. It will not be resized automatically.`,
    },
  };
}
export const converterMessages = {
  zh: getConverterMessages('zh', mobileImageLimits),
  en: getConverterMessages('en', mobileImageLimits),
};
