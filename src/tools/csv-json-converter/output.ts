import { fail } from '../general/bounds';
import { CsvRecords } from './csv';
import { editorLimit, outputLimit, previewText, utf8, type Conversion, type Delimiter } from './settings';

export function utf8Length(text: string) {
  let length = text.length;
  for (const match of text.matchAll(/[^\x00-\x7F]/gu)) {
    const point = match[0];
    length += point.length === 2 || point.charCodeAt(0) >= 0x800 ? 2 : 1;
  }
  return length;
}

export class OutputBuffer {
  private readonly encoder = new TextEncoder();
  private parts: Blob[] = [];
  private pending: string[] = [];
  private pendingLength = 0;
  private prefix: string[] = [];
  private prefixLength = 0;
  bytes = 0;

  ensureFits(bytes: number) {
    if (this.bytes + bytes > outputLimit) fail('转换结果超过 64 MiB。', 'The converted output exceeds 64 MiB.');
  }

  append(text: string) {
    const bytes = utf8Length(text);
    this.ensureFits(bytes);
    this.bytes += bytes;
    this.pending.push(text);
    this.pendingLength += text.length;
    if (this.pendingLength >= 256 * 1024 || this.pending.length >= 4096) this.flush();
    if (this.prefixLength <= editorLimit) {
      const part = text.slice(0, editorLimit + 1 - this.prefixLength);
      if (part) this.prefix.push(part);
      this.prefixLength += part.length;
    }
  }

  private flush() {
    if (!this.pendingLength) return;
    this.parts.push(new Blob([this.encoder.encode(this.pending.join(''))]));
    this.pending = [];
    this.pendingLength = 0;
  }

  finish(type: string) {
    this.flush();
    return {
      blob: new Blob(this.parts, { type }),
      preview: previewText(this.prefix.join('')),
    };
  }
}

export const indexStride = 50;
export type ByteRange = { start: number; end: number };

export class OutputTable {
  constructor(
    private blob: Blob,
    readonly headers: string[],
    private groups: ByteRange[],
    private conversion: Conversion,
    private delimiter: Delimiter,
  ) {}

  async *groupRows(first: number, count: number) {
    const end = first + count;
    for (let group = Math.floor(first / indexStride); group < Math.ceil(end / indexStride); group++) {
      const range = this.groups[group];
      if (!range) break;
      const part = this.blob.slice(range.start, range.end);
      const startRow = group * indexStride;
      // Keep the decode bounded by one group and avoid parsing unrelated rows.
      const start = Math.max(0, first - startRow);
      const stop = end - startRow;
      if (this.conversion.direction === 'csv-json') {
        const text = utf8().decode(await part.arrayBuffer());
        const rows: (Record<string, unknown> | unknown[])[] = JSON.parse('[' + text + ']');
        for (const row of rows.slice(start, stop)) yield row;
      } else {
        const rows: string[][] = [];
        const parser = new CsvRecords(this.delimiter, batch => { rows.push(...batch); });
        parser.push(utf8().decode(await part.arrayBuffer()));
        parser.finish();
        for (const row of rows.slice(start, stop)) yield row;
      }
    }
  }

  value(row: Record<string, unknown> | unknown[], column: number): string {
    const value = Array.isArray(row) ? row[column] : row[this.headers[column]];
    return value === null ? 'null' : String(value ?? '');
  }

  async page(offset: number, size: number, column: number, width: number) {
    const short = (value: string) => value.length > 180 ? value.slice(0, 178) + '…' : value;
    const headers = this.headers.slice(column, column + width).map(short);
    const rows: string[][] = [];
    for await (const row of this.groupRows(offset, size)) {
      rows.push(headers.map((_, index) => short(this.value(row, column + index))));
    }
    return { headers, rows };
  }

  async cell(row: number, column: number) {
    if (row === -1) return this.headers[column];
    for await (const record of this.groupRows(row, 1)) return this.value(record, column);
    return '';
  }
}
