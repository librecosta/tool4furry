import { batchTime } from '../file-naming';
import { LocalError } from '../general/bounds';
import { limits, type ExtractFormat } from './protocol';

export const mime: Record<ExtractFormat, string> = {
  txt: 'text/plain;charset=utf-8', json: 'application/json;charset=utf-8', csv: 'text/csv;charset=utf-8',
};

export async function readTestText(file: File) {
  if (file.size > limits.text * 4) throw new LocalError('文件超出文本预算。', 'The file exceeds the text budget.');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
  catch { throw new LocalError('无法读取文件。请选择 UTF-8 文本。', 'Could not read the file. Choose UTF-8 text.'); }
  if (text.length > limits.text) throw new LocalError('测试文本超过 2 Mi UTF-16 单元。', 'The test text exceeds 2 Mi UTF-16 code units.');
  return text;
}

export function createRegexNamer() {
  let previous = '', sequence = 0;
  return (source: string, format: ExtractFormat, now = new Date()) => {
    const time = batchTime(now);
    const stamp = time.slice(0, -3) + '-' + time.slice(-3);
    sequence = time === previous ? sequence + 1 : 1;
    previous = time;
    let stem = Array.from(source.replace(/\.[^.]+$/, '').trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '-')
      .replace(/^[.\s]+|[.\s]+$/g, '')).slice(0, 40).join('');
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = '_' + stem;
    return (stem || 'regex') + '-' + stamp + (sequence > 1 ? '-' + sequence : '') + '.' + format;
  };
}
