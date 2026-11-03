import { canvasSize } from '../general/canvas-output';
import { fail } from '../general/bounds';
export function frameSize(
  width: string,
  source: { width: number; height: number },
) {
  if (!/^\d+$/.test(width))
    fail('输出宽度须为整数像素。', 'Output width must use integer pixels.');
  return canvasSize(
    Number(width),
    Math.max(1, Math.round((Number(width) * source.height) / source.width)),
  );
}
export function frameTimes(
  duration: number,
  interval: string,
  size: { width: number; height: number },
) {
  const step = Number(interval);
  if (
    !/^\d+(?:\.\d+)?$/.test(interval) ||
    !Number.isFinite(step) ||
    step < 0.1 ||
    step > 1800 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 1800
  )
    fail(
      '间隔须为 0.1–1800 秒，视频最长 30 分钟。',
      'Interval must be 0.1–1,800 seconds; video limit is 30 minutes.',
    );
  canvasSize(size.width, size.height);
  const count = Math.ceil(duration / step);
  if (count > 40 || count * size.width * size.height > 80000000)
    fail(
      '批量最多 40 帧、累计 8000 万输出像素，请增加间隔或减小尺寸。',
      'Batch limit: 40 frames and 80 million output pixels. Increase the interval or reduce dimensions.',
    );
  return Array.from({ length: count }, (_, i) => i * step);
}
