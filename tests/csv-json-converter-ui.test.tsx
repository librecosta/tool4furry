import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { EditorView } from '@codemirror/view';
import { beforeEach, expect, it, vi } from 'vitest';
import CsvJsonConverter from '../src/tools/csv-json-converter/CsvJsonConverter';
import { convertTable } from '../src/tools/csv-json-converter/core';
import { LocalError } from '../src/tools/general/bounds';
import type { OutputTable } from '../src/tools/csv-json-converter/output';
import type { WorkRequest, WorkResponse } from '../src/tools/csv-json-converter/protocol';
import { csvSample, editorLimit, jsonSample } from '../src/tools/csv-json-converter/settings';
import { editorDOM } from './fixtures/editor-dom';
import { setViewport } from './setup';

const workers: TestWorker[] = [];
let hold = false;
class TestWorker extends EventTarget {
  onmessage?: (message: MessageEvent<WorkResponse>) => void;
  private table?: OutputTable;
  terminate = vi.fn();
  constructor() {
    super();
    workers.push(this);
  }
  send(data: WorkResponse) {
    const message = new MessageEvent('message', { data });
    this.onmessage?.(message);
    this.dispatchEvent(message);
  }
  async postMessage(work: WorkRequest) {
    try {
      if (work.type === 'convert' && !hold) {
        const { result, table } = await convertTable(work.source, work.conversion);
        this.table = table;
        this.send({ type: 'result', result });
      } else if (work.type === 'page' && this.table) {
        const page = await this.table.page(work.offset, work.size, work.column, work.width);
        this.send({ type: 'page', id: work.id, page });
      }
    } catch (error) {
      if (error instanceof LocalError) this.send({ type: 'error', zh: error.zh, en: error.en });
      else throw error;
    }
  }
}

const copy = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  editorDOM();
  setViewport();
  workers.length = 0;
  hold = false;
  copy.mockClear();
  vi.stubGlobal('Worker', TestWorker);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
});
const setup = () => render(<StrictMode><Tooltip.Provider><CsvJsonConverter locale="en" region="global" /></Tooltip.Provider></StrictMode>);
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const click = (name: string) => fireEvent.click(button(name));
const waitReady = (format = 'JSON') => waitFor(() => expect(button('Download ' + format).disabled).toBe(false));
const editor = (name: string) => EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
const doc = (name: string) => editor(name).state.doc.toString();
function edit(text: string) {
  const view = editor('CSV input');
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, userEvent: 'input.paste' }));
}

it('preserves per-direction drafts, invalidates stale output, and swaps the full result explicitly', async () => {
  setup();
  expect(doc('CSV input')).toBe(csvSample);
  await waitReady();
  edit('id,note\r\n001,"one\r\ntwo"');
  expect(button('Swap input and result').disabled).toBe(true);
  await waitReady();
  expect(JSON.parse(doc('JSON result'))).toEqual([{ id: '001', note: 'one\r\ntwo' }]);
  click('JSON → CSV');
  expect(doc('JSON input')).toBe(jsonSample);
  click('CSV → JSON');
  expect(doc('CSV input')).toBe('id,note\r\n001,"one\r\ntwo"');
  await waitReady();
  click('Copy result');
  expect(copy).toHaveBeenCalledWith(doc('JSON result'));
  click('Swap input and result');
  await waitReady('CSV');
  expect(JSON.parse(doc('JSON input'))).toEqual([{ id: '001', note: 'one\r\ntwo' }]);
  expect(doc('CSV result')).toBe('id,note\r\n001,"one\r\ntwo"');
});

it('terminates the worker on cancellation and unmount, and ignores a superseded task', async () => {
  const { unmount } = setup();
  await waitReady();
  const obsolete = workers.at(-1)!;
  hold = true;
  edit('id\nnext');
  click('Cancel conversion');
  expect(button('Download JSON').disabled).toBe(true);
  expect(obsolete.terminate).toHaveBeenCalled();
  act(() => obsolete.send({ type: 'progress', percent: 90 }));
  expect(screen.getByText('Conversion cancelled')).toBeTruthy();
  hold = false;
  click('Convert again');
  await waitReady();
  expect(JSON.parse(doc('JSON result'))).toEqual([{ id: 'next' }]);
  const active = workers.at(-1)!;
  unmount();
  expect(active.terminate).toHaveBeenCalled();
});

it('shows later table pages, then disables complete-only actions for a partial result', async () => {
  setup();
  edit('id\n' + Array.from({ length: 104 }, (_, index) => 'item_' + index).join('\n'));
  await waitReady();
  click('Table');
  await screen.findByText('item_49');
  click('Next page');
  await screen.findByText('item_99');
  click('Next page');
  await screen.findByText('item_103');
  expect(button('Next page').disabled).toBe(true);
  edit('a\n' + 'x'.repeat(editorLimit - 4));
  await waitReady();
  expect(button('Copy result').disabled).toBe(true);
  expect(button('Swap input and result').disabled).toBe(true);
  expect(screen.getByText('Partial result preview. Download the complete file.')).toBeTruthy();
});
