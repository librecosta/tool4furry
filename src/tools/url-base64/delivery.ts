import { batchTime } from '../file-naming';
import type { CodecOptions } from './core';

export const codecMime = 'text/plain;charset=utf-8';

export function createCodecNamer() {
  let previous = -Infinity;
  return ({ family, direction }: CodecOptions, date = new Date()) => {
    previous = Math.max(date.getTime(), previous + 1);
    const time = batchTime(new Date(previous));
    return family + '-' + direction + 'd-' + time.slice(0, -3) + '-' + time.slice(-3) + '.txt';
  };
}
