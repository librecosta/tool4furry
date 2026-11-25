import Papa from 'papaparse';
import { fail } from '../general/bounds';
import { chunkSize, delimiters, type Delimiter } from './settings';

/** Frame complete CSV records across UTF-8 chunks. Only record separators are normalized. */
export class CsvRecords {
  private state: 'start' | 'unquoted' | 'quoted' | 'afterQuote' = 'start';
  private skipLf = false;
  private pieces: string[] = [];
  private batch: string[] = [];
  private batchLength = 0;
  private records = 0;

  constructor(private delimiter: Delimiter, private accept: (rows: string[][]) => void) {}

  push(text: string) {
    let from = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (this.skipLf) {
        this.skipLf = false;
        if (char === '\n') {
          from = i + 1;
          continue;
        }
      }

      if (this.state === 'quoted') {
        if (char === '"') this.state = 'afterQuote';
      } else if (char === this.delimiter) {
        this.state = 'start';
      } else if (char === '\n' || char === '\r') {
        this.add(text.slice(from, i));
        from = i + 1;
        this.skipLf = char === '\r';
        this.state = 'start';
      } else if (char === '"') {
        if (this.state === 'unquoted') this.invalidQuote();
        this.state = 'quoted';
      } else {
        if (this.state === 'afterQuote') this.invalidQuote();
        this.state = 'unquoted';
      }
    }
    if (from < text.length) this.pieces.push(text.slice(from));
    this.flush();
  }

  finish() {
    if (this.state === 'quoted') this.invalidQuote();
    if (this.pieces.length) this.add('');
    this.flush();
  }

  private invalidQuote(): never {
    this.flush();
    return fail(
      '第 ' + (this.records + 1) + ' 条 CSV 记录的引号无效。',
      'Invalid quoting in CSV record ' + (this.records + 1) + '.',
    );
  }

  private add(last: string) {
    this.pieces.push(last);
    const record = this.pieces.join('');
    this.pieces = [];
    this.batch.push(record);
    this.records++;
    this.batchLength += record.length;
    if (this.batch.length >= 2048 || this.batchLength >= chunkSize) this.flush();
  }

  private flush() {
    if (!this.batch.length) return;
    this.accept(parseCsvBatch(this.batch.join('\n'), this.delimiter));
    this.batch = [];
    this.batchLength = 0;
  }
}

export function parseCsvBatch(text: string, delimiter: Delimiter) {
  // Sentinel records keep empty rows and prevent Papa from treating a field BOM as a file BOM.
  const parsed = Papa.parse<string[]>('x\n' + text + '\nx', {
    delimiter, newline: '\n', skipEmptyLines: false,
  });
  if (parsed.errors.length)
    fail('CSV 记录无效。', 'Invalid CSV record.');
  return parsed.data.slice(1, -1);
}

export function detectDelimiter(sample: string, complete: boolean): Delimiter {
  const scores = delimiters.map(delimiter => {
    const widths: number[] = [];
    const scan = new CsvRecords(delimiter, rows => {
      for (const row of rows) {
        if (widths.length === 20) break;
        widths.push(row.length);
      }
    });
    try {
      // Inspect logical records, including multiline quoted cells.
      scan.push(sample);
      if (complete) scan.finish();
    } catch {
      // An invalid candidate can still have complete records before the error.
    }
    const width = widths[0] ?? 0;
    return { delimiter, width, score: widths.filter(value => value === width).length };
  }).filter(item => item.width > 1).sort((a, b) => b.score - a.score);
  if (!scores.length) {
    if (complete || /[\r\n]/.test(sample)) return ',';
  } else if (scores[0].score !== scores[1]?.score) {
    return scores[0].delimiter;
  }
  return fail('无法确定 CSV 分隔符，请手动选择。', 'Could not determine the CSV delimiter. Choose it manually.');
}

export function csvLine(row: string[], delimiter: Delimiter) {
  // A one-field empty record must remain distinguishable from a final record separator.
  return row.length === 1 && row[0] === '' ? '""' : Papa.unparse([row], { delimiter, quotes: (value, column) => column === 0 && value.startsWith('\uFEFF') });
}
