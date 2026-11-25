export const MiB = 1024 ** 2;
export const csvLimit = 64 * MiB;
export const outputLimit = 64 * MiB;
export const editorLimit = 256 * 1024;
export const chunkSize = 256 * 1024;
export const pageSizes = [50, 100, 200] as const;
export const columnPageSize = 48;

export const delimiters = [',', ';', '\t', '|'] as const;
export type Delimiter = typeof delimiters[number];
export type Direction = 'csv-json' | 'json-csv';
export type CsvSettings = {
  delimiter: Delimiter | 'auto';
  header: boolean;
  infer: boolean;
  shape: 'objects' | 'arrays';
  emptyNull: boolean;
  indent: 0 | 2 | 4;
};
export type JsonSettings = {
  delimiter: Delimiter;
  header: boolean;
  flatten: boolean;
  newline: '\n' | '\r\n';
  bom: boolean;
  escapeFormulae: boolean;
};
export type Conversion =
  | { direction: 'csv-json'; settings: CsvSettings }
  | { direction: 'json-csv'; settings: JsonSettings };

export const csvDefaults: CsvSettings = {
  delimiter: 'auto', header: true, infer: false, shape: 'objects', emptyNull: false, indent: 2,
};
export const jsonDefaults: JsonSettings = {
  delimiter: ',', header: true, flatten: false, newline: '\r\n', bom: false, escapeFormulae: false,
};

export const csvSample = 'id,name,role,active\n001,Avery,Designer,true\n002,Rowan,Developer,true\n003,Morgan,Animator,false\n004,Quinn,Composer,true';
export const jsonSample = JSON.stringify([
  { id: '001', name: 'Avery', role: 'Designer', active: true },
  { id: '002', name: 'Rowan', role: 'Developer', active: true },
  { id: '003', name: 'Morgan', role: 'Animator', active: false },
  { id: '004', name: 'Quinn', role: 'Composer', active: true },
], null, 2);

export type Source = string | File;
export type SourcePreview = { text: string; partial: boolean };
export type TableResult = {
  blob: Blob;
  preview: SourcePreview;
  records: number;
  columns: number;
  delimiter: Delimiter;
  inputLines: number;
};
export type TablePage = { headers: string[]; rows: string[][] };
export const utf8 = () => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

export function previewText(text: string): SourcePreview {
  // Truncate only the preview and keep surrogate pairs intact.
  const highSurrogate = /[\uD800-\uDBFF]/.test(text[editorLimit - 1] ?? '');
  return { text: text.slice(0, editorLimit - Number(highSurrogate)), partial: text.length > editorLimit };
}
