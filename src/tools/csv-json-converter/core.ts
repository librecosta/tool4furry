import { fail } from '../general/bounds';
import { maxJsonInput } from '../json-formatter/core';
import { CsvRecords, csvLine, detectDelimiter } from './csv';
import { columnName, jsonRows, rowWidthError, validUnicode } from './json-data';
import { indexStride, OutputBuffer, OutputTable, utf8Length, type ByteRange } from './output';
import { chunkSize, csvLimit, editorLimit, previewText, utf8, type Conversion, type Source, type SourcePreview, type TableResult } from './settings';

export function inferCell(text: string, infer: boolean, emptyNull: boolean) {
  if (text === '') return emptyNull ? null : '';
  if (!infer) return text;
  if (text === 'true' || text === 'false') return text === 'true';
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) || text.length > 64 || text === '-0') return text;
  const number = Number(text);
  if (!Number.isFinite(number) || (Number.isInteger(number) && !Number.isSafeInteger(number))) return text;
  const canonical = text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
  return String(number) === canonical ? number : text;
}

function invalidEncoding(): never {
  return fail('文件不是有效的 UTF-8。', 'The file is not valid UTF-8.');
}

function decode(decoder: TextDecoder, bytes?: ArrayBuffer, stream = false) {
  try {
    return decoder.decode(bytes, { stream });
  } catch {
    return invalidEncoding();
  }
}

function checkSource(source: Source, conversion: Conversion) {
  const csv = conversion.direction === 'csv-json';
  if (typeof source !== 'string' && source.size > (csv ? csvLimit : maxJsonInput * 3 + 3))
    fail(csv ? 'CSV 文件上限为 64 MiB。' : 'JSON 文件超过 UTF-8 输入预算。',
      csv ? 'CSV files are limited to 64 MiB.' : 'The JSON file exceeds the UTF-8 input budget.');
}

export async function inputPreview(source: Source): Promise<SourcePreview> {
  if (typeof source === 'string') return previewText(source);
  const end = Math.min(source.size, 4 * editorLimit + 4);
  const bytes = await source.slice(0, end).arrayBuffer();
  return previewText(decode(utf8(), bytes, end < source.size).replace(/^\uFEFF/, ''));
}

async function* readChunks(source: Source, progress: (value: number) => void) {
  if (typeof source === 'string') {
    for (let offset = 0; offset < source.length;) {
      let end = Math.min(source.length, offset + chunkSize);
      if (end < source.length && /[\uD800-\uDBFF]/.test(source[end - 1])) end--;
      yield validUnicode(source.slice(offset, end));
      offset = end;
      progress(offset / source.length);
    }
  } else {
    const decoder = utf8();
    for (let offset = 0; offset < source.size;) {
      const end = Math.min(source.size, offset + chunkSize);
      yield decode(decoder, await source.slice(offset, end).arrayBuffer(), end < source.size);
      offset = end;
      progress(offset / source.size);
    }
  }
}

// Formula escapes are applied before both the table and file are produced.
const escapeFormula = (value: string) =>
  /^[\t\r\n]|^\s*[=+\-@]/u.test(value) ? "'" + value : value;

export async function convertTable(
  source: Source,
  conversion: Conversion,
  progress: (percent: number) => void = () => {},
  onInput?: (preview: SourcePreview) => void,
): Promise<{ result: TableResult; table: OutputTable }> {
  checkSource(source, conversion);
  if (onInput) onInput(await inputPreview(source));
  const writer = new OutputBuffer();
  const groups: ByteRange[] = [];
  let groupStart = 0;
  let headers: string[] = [];
  let records = 0;
  let inputLines = 0;
  let previousCR = false;
  let delimiter = conversion.settings.delimiter === 'auto' ? ',' : conversion.settings.delimiter;

  const countLines = (text: string) => {
    if (!text) return;
    if (!inputLines) inputLines = 1;
    for (const match of text.matchAll(/\r\n|[\r\n]/g))
      if (!(previousCR && match.index === 0 && match[0] === '\n')) inputLines++;
    previousCR = text.endsWith('\r');
  };
  const startRow = (separator: string, hasHeader = false) => {
    if (records && records % indexStride === 0) groups.push({ start: groupStart, end: writer.bytes });
    if (records || hasHeader) writer.append(separator);
    if (records % indexStride === 0) groupStart = writer.bytes;
    records++;
  };
  const finishGroup = () => {
    if (records) groups.push({ start: groupStart, end: writer.bytes });
  };
  let mime: string;
  if (conversion.direction === 'csv-json') {
    const options = conversion.settings;
    const indentation = ' '.repeat(options.indent);
    let record = 0;
    let keys: string[] = [];
    let bytes = 0;
    const encode = (value: string | number | boolean | null) => {
      if (typeof value === 'string' && value.length >= chunkSize) {
        // Count escapes before allocating a potentially oversized string for one cell.
        let bytes = utf8Length(value) + 2;
        for (const match of value.matchAll(/["\\\u0000-\u001f]/g))
          bytes += /["\\\b\f\n\r\t]/.test(match[0]) ? 1 : 5;
        writer.ensureFits(bytes);
      }
      return JSON.stringify(value);
    };
    const rows = (batch: string[][]) => {
      for (const row of batch) {
        if (++record === 1) {
          headers = options.header ? row : row.map((_, index) => columnName(index));
          if (options.shape === 'objects') {
            if (headers.some(label => !label.trim()) || new Set(headers).size !== headers.length)
              fail('对象数组的表头必须非空且不重复。', 'Object-array headers must be nonempty and unique.');
            keys = headers.map(encode);
          }
          if (options.header) continue;
        }
        if (row.length !== headers.length) rowWidthError(record, headers.length, row.length);
        const object = options.shape === 'objects';
        if (!records && indentation) writer.append('\n');
        startRow(indentation ? ',\n' : ',');
        writer.append(indentation + (object ? '{' : '['));
        const pad = indentation ? '\n' + indentation.repeat(2) : '';
        for (let index = 0; index < row.length; index++) {
          writer.append((index ? ',' : '') + pad);
          if (object) {
            writer.append(keys[index]);
            writer.append(indentation ? ': ' : ':');
          }
          writer.append(encode(inferCell(row[index], options.infer, options.emptyNull)));
        }
        writer.append((indentation ? '\n' + indentation : '') + (object ? '}' : ']'));
      }
    };

    let scanner: CsvRecords | undefined;
    let initial = true;
    writer.append('[');
    for await (const chunk of readChunks(source, value => progress(Math.floor(value * 98)))) {
      if (typeof source === 'string') {
        bytes += utf8Length(chunk);
        if (bytes > csvLimit) fail('CSV 输入上限为 64 MiB。', 'CSV input is limited to 64 MiB.');
      }
      const text = initial ? chunk.replace(/^\uFEFF/, '') : chunk;
      if (chunk) initial = false;
      countLines(text);
      if (!scanner && text) {
        delimiter = options.delimiter === 'auto'
          ? detectDelimiter(text, (typeof source === 'string' ? source.length : source.size) <= chunkSize)
          : options.delimiter;
        scanner = new CsvRecords(delimiter, rows);
      }
      scanner?.push(text);
    }
    scanner?.finish();
    finishGroup();
    writer.append(records && indentation ? '\n]' : ']');
    mime = 'application/json;charset=utf-8';
  } else {
    const options = conversion.settings;
    let units = 0;
    const parts: string[] = [];
    for await (const text of readChunks(source, value => progress(Math.floor(value * 44)))) {
      units += text.length;
      if (units > maxJsonInput + 1) fail('JSON 输入上限为 16 Mi UTF-16 代码单元。', 'JSON input is limited to 16 Mi UTF-16 code units.');
      countLines(text);
      parts.push(text);
    }
    const model = jsonRows(parts.join('').replace(/^\uFEFF/, ''), options.flatten);
    parts.length = 0;
    const escape = options.escapeFormulae ? escapeFormula : (value: string) => value;
    headers = model.columns.map(escape);
    const hasHeader = options.header && !!headers.length;
    if (options.bom) writer.append('\uFEFF');
    if (hasHeader) writer.append(csvLine(headers, delimiter));
    for (const row of model.rows()) {
      startRow(options.newline, hasHeader);
      writer.append(csvLine(row.map(escape), delimiter));
      if (records % 256 === 0) progress(45 + Math.floor(54 * records / model.records));
    }
    finishGroup();
    mime = delimiter === '\t' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8';
  }
  const file = writer.finish(mime);
  return {
    result: { ...file, records, columns: headers.length, delimiter, inputLines },
    table: new OutputTable(file.blob, headers, groups, conversion, delimiter),
  };
}
