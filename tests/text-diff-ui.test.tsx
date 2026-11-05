import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import TextDiff from '../src/tools/text-diff/TextDiff';
import { compareLines } from '../src/tools/text-diff/core';
import { diffReport } from '../src/tools/text-diff/report';
import type { DiffRequest, DiffResponse } from '../src/tools/text-diff/comparison';
import { saveBlob } from '../src/tools/general/ui';
import { editorDOM } from './fixtures/editor-dom';
import { setViewport } from './setup';

vi.mock('../src/tools/general/ui', async original => ({ ...(await original<typeof import('../src/tools/general/ui')>()), saveBlob: vi.fn() }));
const clipboard = vi.fn().mockResolvedValue(undefined);
let failNext = false, hold = false;
class TestWorker {
  static all: TestWorker[] = [];
  onmessage: ((event: MessageEvent<DiffResponse>) => void) | null = null;
  onerror = null; onmessageerror = null;
  terminate = vi.fn();
  input?: DiffRequest;
  constructor() { TestWorker.all.push(this); }
  postMessage(input: DiffRequest) {
    this.input = input;
    const response: DiffResponse = failNext ? { error: 'timeout' } : { result: compareLines(input.left, input.right, input.ignore) };
    failNext = false;
    if (!hold) setTimeout(() => this.onmessage?.({ data: response } as MessageEvent<DiffResponse>), 0);
  }
}
beforeEach(() => {
  editorDOM(); setViewport(); vi.clearAllMocks(); TestWorker.all = []; failNext = hold = false;
  vi.stubGlobal('Worker', TestWorker);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});
afterEach(() => vi.unstubAllGlobals());
const setup = (locale: 'en' | 'zh' = 'en') => render(<Tooltip.Provider><TextDiff locale={locale} region="cn" /></Tooltip.Provider>);
const editor = (name: string) => EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
function input(name: string, value: string) {
  act(() => { const view = editor(name); view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value }, userEvent: 'input.paste' }); });
}
const rows = () => [...document.querySelectorAll('[data-diff-type]')].map(row => [row.getAttribute('data-diff-type'), row.getAttribute('data-old-line'), row.getAttribute('data-new-line'), row.querySelector('[title]')?.textContent]);
const ready = () => waitFor(() => expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty('disabled', false));
it('uses two editable CodeMirror panes and automatically renders the insertion regression with exact line numbers', async () => {
  setup();
  expect(document.querySelectorAll('.cm-editor')).toHaveLength(2);
  expect(document.querySelector('textarea')).toBeNull();
  expect(screen.queryByRole('button', { name: /Start|Compare/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty('disabled', true);
  input('Original', '123\n134'); input('Revised', '123\n2\n134');
  await ready();
  expect(screen.getByText('+1 added · −0 removed')).toBeTruthy();
  expect(rows()).toEqual([['equal', '1', '1', '123'], ['added', null, '2', '2'], ['equal', '2', '3', '134']]);
  expect(editor('Original').state.readOnly).toBe(false);
  expect(editor('Revised').state.readOnly).toBe(false);
});
it('updates deletion, replacement, blank lines and EOF independently without extra content rows', async () => {
  setup(); input('Original', 'a\nb\nc'); input('Revised', 'a\nc'); await ready();
  expect(rows()).toEqual([['equal', '1', '1', 'a'], ['removed', '2', null, 'b'], ['equal', '3', '2', 'c']]);
  input('Revised', 'a\nearth\nc'); await ready();
  expect(rows().filter(row => row[0] !== 'equal').map(row => row[3])).toEqual(['b', 'earth']);
  input('Revised', 'a\n\nb\nc'); await ready();
  expect(rows().filter(row => row[0] === 'added')).toEqual([['added', null, '2', '']]);
  input('Revised', 'a\nb\nc\n'); await ready();
  expect(screen.getByText('Same line content; EOF newline differs')).toBeTruthy();
  expect(rows()).toHaveLength(3);
  expect(document.querySelector('[data-eof-change]')?.textContent).toContain('no → yes');
});
it('projects changes with context without recomputing, while ignore-whitespace preserves actual source text', async () => {
  setup(); const original = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
  input('Original', original); input('Revised', original.replace('line 15', 'changed')); await ready();
  const count = TestWorker.all.length;
  fireEvent.click(screen.getByRole('button', { name: 'Changes only' }));
  expect(rows()).toHaveLength(6);
  expect(screen.getByText(/13 unchanged lines hidden/)).toBeTruthy();
  expect(TestWorker.all).toHaveLength(count);
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  input('Original', '  a \t'); input('Revised', '  a'); await ready();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ignore trailing whitespace' })); await ready();
  expect(rows()).toEqual([['equal', '1', null, '  a \t'], ['equal', null, '1', '  a']]);
  expect(editor('Original').state.doc.toString()).toBe('  a \t');
  expect(screen.getByText('No differences')).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ignore trailing whitespace' })); await ready();
  expect(rows().map(row => row[0])).toEqual(['removed', 'added']);
});
it('copies and downloads the full readable report and fresh TXT names without recomputing', async () => {
  setup(); input('Original', '中文\nold.bin'); input('Revised', '中文\nnew.bin\n'); await ready();
  const count = TestWorker.all.length, expected = diffReport(compareLines('中文\nold.bin', '中文\nnew.bin\n'));
  const viewer = screen.getByRole('region', { name: 'Differences' });
  expect(within(viewer).getByRole('button', { name: 'Copy difference report' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Copy difference report' }));
  await waitFor(() => expect(clipboard).toHaveBeenCalledExactlyOnceWith(expected));
  fireEvent.click(screen.getByRole('button', { name: 'Download TXT' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download TXT' }));
  const calls = vi.mocked(saveBlob).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][0].type).toBe('text/plain;charset=utf-8');
  expect(calls[0][1]).toMatch(/^text-diff-\d{8}-\d{6}-\d{3}(?:-\d+)?\.txt$/);
  expect(calls[1][1]).not.toBe(calls[0][1]);
  expect(await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(calls[0][0]); })).toBe(expected);
  expect(TestWorker.all).toHaveLength(count);
});
it('invalidates immediately, rejects obsolete responses, preserves the other editor on clear, and destroys active work', async () => {
  const app = setup(); input('Original', 'original'); input('Revised', 'first'); await ready();
  hold = true;
  input('Revised', 'second');
  expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty('disabled', true);
  expect(rows()).toHaveLength(0);
  await waitFor(() => expect(TestWorker.all.at(-1)?.input?.right).toBe('second'));
  const stale = TestWorker.all.at(-1)!, callback = stale.onmessage!;
  input('Revised', 'latest');
  expect(stale.terminate).toHaveBeenCalledOnce();
  hold = false;
  act(() => callback({ data: { result: compareLines('original', 'second') } } as MessageEvent<DiffResponse>));
  await ready();
  expect(rows().some(row => row[3] === 'second')).toBe(false);
  expect(rows().some(row => row[3] === 'latest')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Clear original' })); await ready();
  expect(editor('Original').state.doc.toString()).toBe('');
  expect(editor('Revised').state.doc.toString()).toBe('latest');
  hold = true; input('Revised', 'running');
  await waitFor(() => expect(TestWorker.all.at(-1)?.input?.right).toBe('running'));
  const active = TestWorker.all.at(-1)!;
  app.unmount(); expect(active.terminate).toHaveBeenCalledOnce();
});
it('removes successful output on failure, retains editors through theme changes and reports clipboard failures', async () => {
  setup(); input('Original', 'left'); input('Revised', 'right'); await ready();
  const original = editor('Original'), revised = editor('Revised');
  document.documentElement.dataset.appearance = 'dark';
  expect(editor('Original')).toBe(original); expect(editor('Revised')).toBe(revised);
  clipboard.mockRejectedValueOnce(new Error('denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy difference report' }));
  await screen.findByText('Copy failed. Download the TXT or select text to copy.');
  failNext = true; input('Revised', 'failure');
  await screen.findByRole('alert');
  expect(rows()).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty('disabled', true);
  expect(editor('Revised').state.doc.toString()).toBe('failure');
});
it('uses Chinese labels and bounds DOM rendering for large results without truncating exports', async () => {
  setup('zh');
  const large = Array.from({ length: 6000 }, (_, i) => `第 ${i} 行`).join('\n');
  input('原文', large); input('新文本', large + '\n尾行');
  await waitFor(() => expect(screen.getByRole('button', { name: '下载 TXT' })).toHaveProperty('disabled', false));
  expect(screen.getByText('+1 新增 · −0 删除')).toBeTruthy();
  expect(rows().length).toBeLessThan(100);
  fireEvent.click(screen.getByRole('button', { name: '复制差异报告' }));
  await waitFor(() => expect(clipboard).toHaveBeenCalled());
  expect(clipboard.mock.calls[0][0]).toContain('\t6001\t+\t尾行');
});
