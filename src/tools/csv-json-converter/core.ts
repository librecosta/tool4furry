import Papa from 'papaparse';
import { boundedText, fail } from '../general/bounds';
export type Table = { headers: string[]; rows: string[][]; output: string };
export function convertTable(
  input: string,
  mode: 'csv-json' | 'json-csv',
  delimiter: string,
): Table {
  boundedText(input, 1000000);
  if (![',', ';', '\t'].includes(delimiter))
    fail('无效分隔符。', 'Invalid delimiter.');
  let headers: string[], rows: string[][];
  if (mode === 'csv-json') {
    const parsed = Papa.parse<string[]>(input.replace(/^\uFEFF/, ''), {
      delimiter,
      dynamicTyping: false,
      skipEmptyLines: true,
    });
    if (parsed.errors.length)
      fail(
        `CSV 解析错误：${parsed.errors[0].message}`,
        `CSV parse error: ${parsed.errors[0].message}`,
      );
    [headers, ...rows] = parsed.data;
  } else {
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch {
      fail('JSON 语法无效。', 'Invalid JSON syntax.');
    }
    if (
      !Array.isArray(data) ||
      !data.length ||
      data.length > 10000 ||
      data.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
    )
      fail(
        'JSON 必须是非空对象数组，最多 10000 行。',
        'JSON must be a nonempty array of objects, up to 10,000 rows.',
      );
    headers = [...new Set(data.flatMap((row) => Object.keys(row)))];
    rows = data.map((row) =>
      headers.map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        if (
          typeof value === 'object' ||
          (typeof value === 'number' &&
            (!Number.isFinite(value) ||
              (Number.isInteger(value) && !Number.isSafeInteger(value))))
        )
          fail(
            '字段须为字符串、布尔值、null 或安全数值。',
            'Fields must be strings, booleans, null or safe numbers.',
          );
        return String(value);
      }),
    );
  }
  if (
    !headers?.length ||
    headers.length > 100 ||
    headers.some((h) => !h.trim()) ||
    new Set(headers).size !== headers.length
  )
    fail(
      '字段名不能为空、重复或超过 100 列。',
      'Headers must be nonempty, unique and limited to 100 columns.',
    );
  if (rows.length > 10000 || rows.length * headers.length > 200000)
    fail(
      '表格超过 10000 行或 200000 个单元格。',
      'Table exceeds 10,000 rows or 200,000 cells.',
    );
  const mismatch = rows.findIndex((row) => row.length !== headers.length);
  if (mismatch >= 0)
    fail(
      `第 ${mismatch + 2} 行字段数量不匹配。`,
      `Field count mismatch on row ${mismatch + 2}.`,
    );
  const output =
    mode === 'csv-json'
      ? JSON.stringify(
          rows.map((row) =>
            Object.fromEntries(headers.map((h, i) => [h, row[i]])),
          ),
          null,
          2,
        )
      : Papa.unparse(
          { fields: headers, data: rows },
          { delimiter, newline: '\r\n' },
        );
  if (output.length > 4000000)
    fail('结果超过 400 万字符。', 'Output exceeds four million characters.');
  return { headers, rows, output };
}
