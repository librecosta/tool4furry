import type { Conversion, Source, SourcePreview, TablePage, TableResult } from './settings';

export type WorkRequest =
  | { type: 'convert'; source: Source; conversion: Conversion }
  | { type: 'page'; id: number; offset: number; size: number; column: number; width: number }
  | { type: 'cell'; id: number; row: number; column: number };
export type WorkResponse =
  | { type: 'input'; preview: SourcePreview }
  | { type: 'progress'; percent: number }
  | { type: 'result'; result: TableResult }
  | { type: 'page'; id: number; page: TablePage }
  | { type: 'cell'; id: number; value: string }
  | { type: 'error'; id?: number; zh: string; en: string };
