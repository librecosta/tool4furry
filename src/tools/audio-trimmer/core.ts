import { MiB } from '../general/bounds';

export const inputBudget = 512 * MiB;
export const blobBudget = 256 * MiB;
export const audioAccept = 'audio/*,.mp3,.wav,.wave,.flac,.m4a,.aac,.ogg,.opus,.oga,.webm,.mka';

export type AudioInfo = {
  frames: number;
  sampleRate: number;
  channels: number;
  origin: number;
};

export type Mode = 'keep' | 'remove';
export type Span = { from: number; to: number; output: number };
export type CutPlan = {
  spans: Span[];
  frames: number;
  fadeIn: number;
  fadeOut: number;
};

export const formats = {
  mp3: { codec: 'mp3', mime: 'audio/mpeg', bitrates: [128, 192, 256, 320], defaultRate: 192 },
  wav: { codec: 'pcm-s16', mime: 'audio/wav', bitrates: [], defaultRate: 0 },
  flac: { codec: 'flac', mime: 'audio/flac', bitrates: [], defaultRate: 0 },
  m4a: { codec: 'aac', mime: 'audio/mp4', bitrates: [128, 192, 256], defaultRate: 192 },
  ogg: { codec: 'opus', mime: 'audio/ogg', bitrates: [96, 128, 192], defaultRate: 128 },
} as const;
export type Format = keyof typeof formats;
export type Encoding = { format: Format; bitrate: number; sampleRate: number };

export function parseTime(text: string) {
  const parts = text.trim().split(':');
  const seconds = parts.pop() ?? '';
  if (!/^\d+(?:\.\d{1,3})?$/.test(seconds) || parts.length > 2) return NaN;
  const tail = Number(seconds);
  if (parts.length === 0) return tail;
  if (tail >= 60 || !parts.every(part => /^\d+$/.test(part))) return NaN;
  const minutes = Number(parts.pop());
  if (parts.length && minutes >= 60) return NaN;
  return (Number(parts[0] ?? 0) * 60 + minutes) * 60 + tail;
}

export function displayTime(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor(ms / 60_000) % 60;
  const pad = (value: number, places = 2) => String(value).padStart(places, '0');
  return (hours ? pad(hours) + ':' : '') + pad(minutes) + ':' +
    pad(Math.floor(ms / 1000) % 60) + '.' + pad(ms % 1000, 3);
}

export function makePlan(info: AudioInfo, mode: Mode, start: number, end: number, fadeIn: number, fadeOut: number) {
  const { frames, sampleRate } = info;
  const from = Math.round(start * sampleRate), to = Math.round(end * sampleRate);
  if (![from, to].every(Number.isSafeInteger) || from < 0 || to > frames || from >= to)
    return { error: 'range' } as const;
  const spans: Span[] = mode === 'keep' ? [{ from, to, output: 0 }] : [
    { from: 0, to: from, output: 0 }, { from: to, to: frames, output: from },
  ].filter(span => span.from < span.to);
  const length = spans.reduce((total, span) => total + span.to - span.from, 0);
  if (!length) return { error: 'empty' } as const;
  const input = Math.round(fadeIn * sampleRate), output = Math.round(fadeOut * sampleRate);
  if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output) ||
      fadeIn < 0 || fadeOut < 0 || input + output > length) return { error: 'fade' } as const;
  return { plan: { spans, frames: length, fadeIn: input, fadeOut: output } satisfies CutPlan };
}

export function gainAt(plan: CutPlan, position: number) {
  if (position < plan.fadeIn) return plan.fadeIn > 1 ? position / (plan.fadeIn - 1) : 0;
  const remaining = plan.frames - position - 1;
  if (remaining < plan.fadeOut) return plan.fadeOut > 1 ? remaining / (plan.fadeOut - 1) : 0;
  return 1;
}

// Seeking into a removed interval goes to the next surviving sample, if one exists.
export function outputAt(plan: CutPlan, source: number) {
  for (const span of plan.spans) {
    if (source < span.to) return span.output + Math.max(0, source - span.from);
  }
  return plan.frames;
}

export function sourceAt(plan: CutPlan, output: number) {
  for (const span of plan.spans) {
    if (output < span.output + span.to - span.from) return span.from + Math.max(0, output - span.output);
  }
  return plan.spans[plan.spans.length - 1].to;
}

export function estimatedBytes(plan: CutPlan, info: AudioInfo, encoding: Encoding) {
  const { format, bitrate, sampleRate } = encoding;
  if (format === 'wav' || format === 'flac')
    return Math.ceil(plan.frames * sampleRate / info.sampleRate) * info.channels * (format === 'flac' ? 3 : 2) + 128;
  return Math.ceil(plan.frames / info.sampleRate * bitrate * 125 + 4096);
}

export function filenameFor(name: string, format: Format) {
  return (name.replace(/\.[^.]+$/, '') || 'audio') + '-trimmed.' + format;
}
