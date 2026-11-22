import { batchTime } from '../file-naming';
import { safeName } from '../general/bounds';
import type { SubtitleFormat } from './core';

export function subtitleStem(source = '') {
  const cleaned = source.replace(/\.(srt|vtt)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim().replace(/^[.]+|[.\s]+$/g, '');
  const encoder = new TextEncoder();
  let stem = '', bytes = 0;
  for (const char of cleaned) {
    bytes += encoder.encode(char).length;
    if (bytes > 150) break;
    stem += char;
  }
  stem = stem.replace(/[.\s]+$/g, '');
  return safeName(stem) && !/^nul(?:\.|$)/i.test(stem) ? stem : 'subtitles';
}

export function createSubtitleNamer() {
  let previous = '', collision = 0;
  return (source: string | undefined, format: SubtitleFormat, now = new Date()) => {
    const time = batchTime(now);
    const stamp = time.slice(0, -3) + '-' + time.slice(-3);
    collision = stamp === previous ? collision + 1 : 0;
    previous = stamp;
    return subtitleStem(source) + '-' + stamp + (collision ? '-' + (collision + 1) : '') + '.' + format;
  };
}

export const subtitleMime = { srt: 'application/x-subrip;charset=utf-8', vtt: 'text/vtt;charset=utf-8' };
