import { comicPdf } from '../comic-page-organizer/pdf';
import { LocalError } from '../general/bounds';
import type { ImageResources } from '../image/resources';
import type { ImageSource } from '../image/types';
import { imagesPdfBudget, imagesPdfLimits } from './policy';

export async function imagesPdf(sources: readonly ImageSource[], resources: ImageResources, signal: AbortSignal, progress: (count: number) => void) {
  let completed = 0;
  try {
    // PDF default user-space dimensions must fit 14,400 units. Scale page
    // coordinates only; directly embedded PNG/JPEG pixels remain unchanged.
    return await comicPdf(sources, resources, imagesPdfLimits, imagesPdfBudget, signal, count => { completed = count; progress(count); }, {maxPageEdge: 14400});
  } catch (error) {
    if (signal.aborted) throw error;
    const name = sources[completed]?.file.name;
    throw new LocalError(name ? `无法处理「${name}」：图片可能损坏、不受支持或超出浏览器解码/内存能力。` : 'PDF 生成或验证失败，可能超出浏览器内存或 PDF 库能力。图片和排序已保留，可重试。',
      name ? `Could not process “${name}”: the image may be damaged, unsupported or beyond the browser’s decode/memory capacity.` : 'PDF creation or validation failed, possibly due to browser memory or PDF library capacity. Your images and order are preserved for retry.');
  }
}
