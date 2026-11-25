import { LocalError } from '../general/bounds';
import { convertTable } from './core';
import type { OutputTable } from './output';
import type { WorkRequest, WorkResponse } from './protocol';

const send = (message: WorkResponse) => self.postMessage(message);
let table: OutputTable | undefined;
let lastPercent = -1;

self.onmessage = async ({ data }: MessageEvent<WorkRequest>) => {
  try {
    if (data.type === 'convert') {
      const converted = await convertTable(data.source, data.conversion, percent => {
        if (percent === lastPercent) return;
        lastPercent = percent;
        send({ type: 'progress', percent });
      }, preview => send({ type: 'input', preview }));
      table = converted.table;
      send({ type: 'result', result: converted.result });
    } else if (data.type === 'page' && table) {
      const page = await table.page(data.offset, data.size, data.column, data.width);
      send({ type: 'page', id: data.id, page });
    } else if (data.type === 'cell' && table) {
      const value = await table.cell(data.row, data.column);
      send({ type: 'cell', id: data.id, value });
    }
  } catch (error) {
    const problem = error instanceof LocalError ? error : new LocalError(
      '处理失败。请检查输入或尝试较小的数据集。', 'Processing failed. Check the input or try a smaller dataset.',
    );
    send({ type: 'error', id: 'id' in data ? data.id : undefined, zh: problem.zh, en: problem.en });
  }
};
