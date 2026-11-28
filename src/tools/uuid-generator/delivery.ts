import Papa from 'papaparse';
import { batchTime } from '../file-naming';
import { fail } from '../general/bounds';
import { uuidLimits } from './core';
import type { ReportRow } from './inspection';

export const deliveryFormats = ['txt', 'json', 'csv', 'sql'] as const;
export type DeliveryFormat = typeof deliveryFormats[number];
export const separators = { line: '\n', comma: ',', space: ' ' };
export type Separator = keyof typeof separators;
export const mime: Record<DeliveryFormat, string> = {
  txt: 'text/plain;charset=utf-8',
  json: 'application/json;charset=utf-8',
  csv: 'text/csv;charset=utf-8',
  sql: 'application/sql;charset=utf-8',
};

export function serializeUuids(values: readonly string[], format: DeliveryFormat, separator: Separator = 'line') {
  if (format === 'json') return JSON.stringify(values);
  if (format === 'csv') return Papa.unparse({ fields: ['uuid'], data: values.map(value => [value]) });
  if (format === 'sql') return values.map(value => "'" + value.replaceAll("'", "''") + "'").join(',\n');
  return values.join(separators[separator]);
}

export function serializeReport(rows: readonly ReportRow[], format: 'json' | 'csv') {
  const result = format === 'json' ? JSON.stringify(rows) : Papa.unparse({
    fields: ['line', 'input', 'normalized', 'status', 'version', 'variant', 'duplicate', 'timestamp_unit', 'timestamp_raw', 'unix_ms', 'utc'],
    data: rows.map(row => [row.line, row.input, row.normalized, row.status, row.version, row.variant,
      row.duplicate, row.time?.unit ?? null, row.time?.ticks ?? null, row.time?.unixMs ?? null, row.time?.utc ?? null]),
  }, { escapeFormulae: /^[=+@\t\r]|^-(?!\d+$)/ });
  if (new TextEncoder().encode(result).length > uuidLimits.reportBytes)
    fail('验证报告超过 16 MiB。', 'The validation report exceeds 16 MiB.');
  return result;
}

export async function readUuidFile(file: File) {
  if (file.size > uuidLimits.inputBytes)
    fail('文本文件超过 2 MiB。', 'The text file exceeds 2 MiB.');
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail('请选择有效的 UTF-8 文本文件。', 'Choose a valid UTF-8 text file.');
  }
}

export function createUuidNamer() {
  let previous = '', sequence = 0;
  return (stem: string, format: DeliveryFormat, now = new Date()) => {
    const time = batchTime(now);
    const stamp = time.slice(0, -3) + '-' + time.slice(-3);
    sequence = stamp === previous ? sequence + 1 : 1;
    previous = stamp;
    return stem + '-' + stamp + (sequence > 1 ? '-' + sequence : '') + '.' + format;
  };
}
