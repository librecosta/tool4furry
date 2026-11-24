import { LocalError, MiB } from '../general/bounds';

export const inputLimit = 2 * 1024 * MiB;
export const memoryLimit = 256 * MiB;
export const galleryLimit = 300;
export const pixelLimit = 40_000_000;
export const zipEntryLimit = 65_534;
export const zipByteLimit = 0xfffffffe;

export type Size = { width: number; height: number };
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ImageSettings = { size: Size; format: ImageFormat; quality: number };
export type SizePreset = 'original' | '1080' | '720' | 'custom';
export type Mode = 'single' | 'interval' | 'count' | 'every';
export type FramePlan =
  | { mode: 'single'; timestamp: number }
  | { mode: 'every'; start: number; end: number }
  | { mode: 'interval' | 'count'; start: number; end: number; count: number; step: number };

export const videoErrors = {
  inputSize: ['请选择不超过 2 GiB 的非空视频文件。', 'Choose a nonempty video file up to 2 GiB.'],
  invalid: ['无法读取视频容器。文件可能损坏或格式不受支持。', 'Could not read the container. The file may be damaged or its format unsupported.'],
  noTrack: ['文件没有视频轨道。', 'This file has no video track.'],
  unsupported: ['此浏览器无法解码该视频轨道。', 'This browser cannot decode the video track.'],
  decode: ['无法读取画面。视频可能损坏或超出设备的解码能力。', 'Could not decode the frame. The video may be damaged or exceed the device’s decoding capacity.'],
  time: ['请输入视频范围内的有效时间。', 'Enter a valid time within the video.'],
  range: ['终点须晚于起点，且两者都在视频范围内。', 'The end must follow the start, and both must be within the video.'],
  sampling: ['请输入有效的采样间隔、采样频率或整数数量。', 'Enter a valid sampling interval, sampling rate or integer count.'],
  dimensions: ['输出须为有效尺寸，最多 4000 万像素。请减小尺寸。', 'Output must use valid dimensions up to 40 megapixels. Reduce the dimensions.'],
  encode: ['无法以所选格式生成图片。请选择其他格式或减小尺寸。', 'Could not encode the selected image format. Try another format or reduce the dimensions.'],
  gallery: ['画廊已达 300 帧或 256 MiB。请删除现有帧、缩小范围或仅导出 ZIP。', 'The gallery reached 300 frames or 256 MiB. Remove frames, shorten the range or export ZIP only.'],
  zipBudget: ['ZIP 超出可用容量。请选择直接保存、缩小范围或减小输出尺寸。', 'The ZIP exceeds the available budget. Save directly to a file, shorten the range or reduce output dimensions.'],
  zipFormat: ['ZIP 超出经典 ZIP 的 4 GiB 或 65,534 项边界。请拆分提取范围。', 'The archive exceeds classic ZIP limits of 4 GiB or 65,534 entries. Split the extraction range.'],
  write: ['无法保存文件。请检查存储空间和文件权限。', 'Could not save the file. Check free space and file permissions.'],
  empty: ['选定范围内没有可提取的显示帧。', 'There are no displayable frames to extract in this range.'],
  sheet: ['联系表超过像素预算。请选择更少的帧或减小缩略图。', 'The contact sheet exceeds the pixel budget. Select fewer frames or smaller thumbnails.'],
} as const;

export class VideoError extends LocalError {
  constructor(readonly code: keyof typeof videoErrors) {
    const [zh, en] = videoErrors[code];
    super(zh, en);
  }
}

export const microseconds = (seconds: number) => Math.round(seconds * 1_000_000);
const seconds = (units: number) => units / 1_000_000;

export function parseTime(input: string): number {
  const parts = input.trim().split(':');
  const last = parts.pop()!;
  if (parts.length > 2 || !/^\d+(?:\.\d{1,6})?$/.test(last) ||
    parts.some(part => !/^\d+$/.test(part)) || (parts.length && Number(last) >= 60) ||
    (parts.length === 2 && Number(parts[1]) >= 60)) throw new VideoError('time');
  const time = Number(last) + (Number(parts.pop()) || 0) * 60 + (Number(parts.pop()) || 0) * 3600;
  if (!Number.isSafeInteger(microseconds(time))) throw new VideoError('time');
  return time;
}

export function displayTime(time: number, digits = 3) {
  const factor = 10 ** digits;
  const units = Math.max(0, Math.round(time * factor));
  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(units / (3600 * factor));
  const minutes = pad(Math.floor(units / (60 * factor)) % 60);
  const whole = pad(Math.floor(units / factor) % 60);
  return (hours ? pad(hours) + ':' : '') + minutes + ':' + whole +
    (digits ? '.' + String(units % factor).padStart(digits, '0') : '');
}

export function relativeTime(timestamp: number, origin: number) {
  return seconds(Math.max(0, microseconds(timestamp) - microseconds(origin)));
}

export function outputSize(source: Size, preset: SizePreset, custom: Size): Size {
  if (preset === 'original') return checkSize(source);
  const short = preset === 'custom' ? 0 : Number(preset);
  const box = preset === 'custom' ? checkSize(custom) : source.height > source.width
    ? { width: short, height: Math.round(short * 16 / 9) }
    : { width: Math.round(short * 16 / 9), height: short };
  return checkSize(fitSize(source, box));
}

export function fitSize(source: Size, bounds: Size): Size {
  const scale = Math.min(1, bounds.width / source.width, bounds.height / source.height);
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export function checkSize(size: Size): Size {
  if (![size.width, size.height].every(n => Number.isInteger(n) && n > 0 && n <= 16384) ||
    size.width * size.height > pixelLimit) throw new VideoError('dimensions');
  return size;
}

export function framePlan(settings: {
  mode: Mode; start: string; end: string; interval: string; sampling: 'seconds' | 'fps'; count: string;
}, duration: number, timestamp?: number): FramePlan {
  if (settings.mode === 'single') {
    if (timestamp === undefined || !Number.isFinite(timestamp)) throw new VideoError('time');
    return { mode: 'single', timestamp };
  }
  const first = microseconds(parseTime(settings.start));
  const last = microseconds(parseTime(settings.end));
  if (last <= first || last > microseconds(duration)) throw new VideoError('range');
  const start = seconds(first), end = Math.min(duration, seconds(last));
  if (settings.mode === 'every') return { mode: 'every', start, end };
  if (settings.mode === 'count') {
    const count = Number(settings.count);
    if (!/^\d+$/.test(settings.count) || !Number.isSafeInteger(count) || count < 1) throw new VideoError('sampling');
    return { mode: 'count', start, end, count, step: (last - first) / count };
  }
  const value = Number(settings.interval);
  if (!/^\d+(?:\.\d{1,6})?$/.test(settings.interval) || value <= 0) throw new VideoError('sampling');
  const step = settings.sampling === 'fps' ? 1_000_000 / value : microseconds(value);
  const count = Math.ceil((last - first) / step);
  if (!Number.isFinite(step) || step > Number.MAX_SAFE_INTEGER || step < 1000 || !Number.isSafeInteger(count)) throw new VideoError('sampling');
  return { mode: 'interval', start, end, count, step };
}

export function* sampleTimes(plan: Extract<FramePlan, {count: number}>, origin: number) {
  const start = microseconds(plan.start), end = microseconds(plan.end);
  for (let i = 0; i < plan.count; i++) {
    const time = start + Math.floor(i * plan.step);
    if (time >= end) break;
    yield origin + seconds(time);
  }
}

export function sourceName(name: string) {
  const clean = name.replace(/\.[^.]+$/, '').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim();
  return Array.from(clean).slice(0, 32).join('') || 'video';
}

export function frameName(name: string, time: number, serial: number, format: ImageFormat) {
  return sourceName(name) + '-' + displayTime(time, 6).replaceAll(':', '-') + '-' +
    String(serial).padStart(4, '0') + '.' + (format === 'jpeg' ? 'jpg' : format);
}

export type SheetSettings = { columns: number; thumbnail: number; timestamps: boolean; format: 'png' | 'jpeg' };
export function sheetLayout(count: number, settings: SheetSettings) {
  const { columns, thumbnail, timestamps } = settings;
  if (!Number.isInteger(count) || count < 1 || count > galleryLimit ||
    !Number.isInteger(columns) || columns < 1 || columns > 12 ||
    !Number.isInteger(thumbnail) || thumbnail < 96 || thumbnail > 640) throw new VideoError('sheet');
  const cols = Math.min(count, columns), rows = Math.ceil(count / cols);
  const gap = 12, header = 77, imageHeight = Math.round(thumbnail * .72);
  const row = imageHeight + gap + (timestamps ? 21 : 0);
  const width = cols * (thumbnail + gap) + gap, height = header + rows * row;
  if (width * height > pixelLimit || height > 16384) throw new VideoError('sheet');
  return { width, height, gap, header, row, cols, imageHeight };
}
