import { batchTime } from '../file-naming';
import { fail, MiB, safeName } from '../general/bounds';
import { maxJsonInput } from './core';

export const jsonMime = 'application/json;charset=utf-8';
export const maxJsonFile = 32 * MiB;
export type OutputStyle = 'formatted' | 'minified';

export async function readJsonFile(file: File) {
  if (!/\.json$/i.test(file.name)) fail('请选择 .json 文件。', 'Choose a .json file.');
  if (file.size > maxJsonFile) fail('JSON 文件不能超过 32 MiB。', 'JSON files must be 32 MiB or smaller.');
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return fail('无法读取此文件。', 'This file could not be read.');
  }
  let text: string;
  try {
    // The default BOM behavior removes only the first UTF-8 BOM.
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n?/g, '\n');
  } catch {
    return fail('文件不是有效的 UTF-8。', 'The file is not valid UTF-8.');
  }
  if (text.length > maxJsonInput)
    fail('文件解码后的文本超出处理范围。', 'The decoded file exceeds the JSON input limit.');
  return text;
}

function jsonStem(filename: string) {
  const cleaned = filename.replace(/\.json$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '-')
    .trim().replace(/^[.]+|[.\s]+$/g, '');
  const encoder = new TextEncoder();
  let stem = '', bytes = 0;
  for (const char of cleaned) {
    bytes += encoder.encode(char).length;
    if (bytes > 140) break;
    stem += char;
  }
  stem = stem.replace(/[.\s]+$/g, '');
  return safeName(stem) ? stem : 'json';
}

export function createJsonNamer() {
  let previous = -Infinity;
  return (source: string, style: OutputStyle, now = new Date()) => {
    // Advance by a millisecond for repeated clicks or a backwards clock adjustment.
    previous = Math.max(previous + 1, now.getTime());
    const time = batchTime(new Date(previous));
    return jsonStem(source) + '-' + style + '-' + time.slice(0, -3) + '-' + time.slice(-3) + '.json';
  };
}
