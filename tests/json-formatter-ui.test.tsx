import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { EditorView } from '@codemirror/view';
import { beforeEach, expect, it, vi } from 'vitest';
import JsonFormatter from '../src/tools/json-formatter/JsonFormatter';
import { parseJson } from '../src/tools/json-formatter/core';
import { createJsonWorkerHandler, type JsonRequest, type JsonResponse } from '../src/tools/json-formatter/protocol';
import { saveBlob } from '../src/tools/general/ui';
import { editorDOM } from './fixtures/editor-dom';
import { setViewport } from './setup';

vi.mock('../src/tools/general/ui', async original => ({
  ...(await original<typeof import('../src/tools/general/ui')>()),
  saveBlob: vi.fn(),
}));

const clipboard = vi.fn().mockResolvedValue(undefined);
const operations: JsonRequest[] = [];
let failNext = false;
class TestWorker {
  private handle = createJsonWorkerHandler();
  onmessage: ((event: MessageEvent<JsonResponse>) => void) | null = null;
  onerror: Worker['onerror'] = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminate() {}
  postMessage(request: JsonRequest) {
    operations.push(request);
    const fail = failNext;
    failNext = false;
    setTimeout(() => {
      if (fail) this.onmessageerror?.({} as MessageEvent);
      else this.onmessage?.({ data: this.handle(request) } as MessageEvent<JsonResponse>);
    }, 0);
  }
}

beforeEach(() => {
  editorDOM();
  setViewport();
  vi.stubGlobal('Worker', TestWorker);
  vi.clearAllMocks();
  operations.length = 0;
  failNext = false;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});

const setup = (locale: 'en' | 'zh' = 'en') => render(
  <StrictMode><Tooltip.Provider><JsonFormatter locale={locale} region="cn" /></Tooltip.Provider></StrictMode>,
);
const button = (name: string) => screen.getByRole('button', { name });
const activate = (name: string) => fireEvent.click(button(name));
const editor = (name: string) => EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
const original = () => editor('Original JSON');
const output = () => editor('Result').state.doc.toString();
const download = () => button('Download JSON') as HTMLButtonElement;
const ready = () => waitFor(() => expect(download().disabled).toBe(false));

function edit(text: string, anchor = text.length) {
  const view = original();
  act(() => view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor },
    userEvent: 'input.paste',
  }));
}

function file(name: string, bytes: Uint8Array, read?: () => Promise<ArrayBuffer>) {
  const item = new File([Uint8Array.from(bytes)], name);
  Object.defineProperty(item, 'arrayBuffer', { value: read ?? (() => Promise.resolve(Uint8Array.from(bytes).buffer)) });
  return item;
}
function select(item: File) {
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [item] } });
}
function blobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

it('starts with valid JSON, keeps two CodeMirror views and remembers advanced settings on mode transitions', async () => {
  setup();
  expect(document.querySelectorAll('.cm-editor')).toHaveLength(2);
  expect(document.querySelector('textarea')).toBeNull();
  expect(screen.getByText('Sample JSON')).toBeTruthy();
  expect(button('Quick').getAttribute('aria-pressed')).toBe('true');
  expect(button('Format').getAttribute('aria-pressed')).toBe('true');
  await ready();
  const left = original(), right = editor('Result');
  expect(left.state.readOnly).toBe(false);
  expect(right.state.readOnly).toBe(true);
  expect(output()).toContain('\n  "project": "Tool4Furry"');
  const source = '{"hello":{"value":false}}';
  edit(source);
  expect(download().disabled).toBe(true);
  await ready();
  expect(output()).toBe('{\n  "hello": {\n    "value": false\n  }\n}');
  activate('Minify');
  await ready();
  expect(output()).toBe(source);
  activate('Advanced');
  activate('Format');
  activate('4 spaces');
  await ready();
  expect(output()).toContain('\n        "value": false');
  activate('Quick');
  await ready();
  expect(output()).toContain('\n    "value": false');
  activate('Advanced');
  await ready();
  expect(button('4 spaces').getAttribute('aria-pressed')).toBe('true');
  expect(output()).toContain('\n        "value": false');
  expect(original()).toBe(left);
  expect(editor('Result')).toBe(right);
  expect(left.state.doc.toString()).toBe(source);
  expect(operations.filter(request => request.kind === 'format' && request.source === source)).toHaveLength(1);
});

it('clears stale output immediately, exposes a precise jump and recovers without rewriting input', async () => {
  setup();
  await ready();
  const invalid = '{\n  "a": 1,\n}';
  edit(invalid, 5);
  expect(download().disabled).toBe(true);
  expect(button('Copy result')).toHaveProperty('disabled', true);
  expect(output()).toBe('');
  expect(await screen.findByText('Remove the trailing comma.')).toBeTruthy();
  expect(original().state.selection.main.head).toBe(5);
  expect(original().contentDOM.querySelector('[class*="errorMark"]')?.textContent).toBe('}');
  activate('Line 3, column 1');
  expect(original().state.selection.main.head).toBe(12);
  expect(document.activeElement).toBe(original().contentDOM);
  expect(original().state.doc.toString()).toBe(invalid);
  edit('[1');
  await screen.findByText('Close the array with a bracket.');
  expect(original().contentDOM.querySelector('[class*="endMarker"]')).toBeTruthy();
  edit('false');
  await ready();
  expect(original().contentDOM.querySelector('[class*="errorMark"],[class*="endMarker"]')).toBeNull();
  expect(output()).toBe('false');
  failNext = true;
  edit('null');
  expect(await screen.findByText('Background JSON processing failed. Try again.')).toBeTruthy();
  expect(download().disabled).toBe(true);
  expect(output()).toBe('');
  activate('Clear input');
  expect(original().state.doc.toString()).toBe('');
  expect(screen.getByText('Invalid JSON')).toBeTruthy();
  activate('Load sample');
  await ready();
});

it('shows duplicate keys, special paths and only the current array page without reformatting', async () => {
  setup();
  const source = '{"a.b":[' + Array.from({ length: 101 }, (_, index) => index === 0 ? '9007199254740993' : index).join(',')
    + '],"same":false,"same":null,"__proto__":{"constructor":"<img src=x>"}}';
  edit(source);
  await ready();
  activate('Advanced');
  const formats = operations.filter(data => data.kind === 'format').length;
  activate('Tree');
  const tree = screen.getByRole('region', { name: 'JSON structure' });
  expect(await within(tree).findByRole('button', { name: 'Expand "a.b"' })).toBeTruthy();
  expect(within(tree).getAllByText('"same"')).toHaveLength(2);
  expect(within(tree).getByText('false')).toBeTruthy();
  expect(within(tree).getByText('null')).toBeTruthy();
  activate('Expand "a.b"');
  expect(await within(tree).findByText('9007199254740993')).toBeTruthy();
  expect(within(tree).getByText('[39]')).toBeTruthy();
  expect(within(tree).queryByText('[40]')).toBeNull();
  fireEvent.click(within(tree).getByText('[0]'));
  expect(await within(tree).findByText('$["a.b"][0]')).toBeTruthy();
  activate('Close');
  activate('Next');
  expect(await within(tree).findByText('[40]')).toBeTruthy();
  expect(within(tree).queryByText('[0]')).toBeNull();
  activate('Collapse "a.b"');
  expect(within(tree).queryByText('[40]')).toBeNull();
  activate('Expand "__proto__"');
  expect(await within(tree).findByText('"<img src=x>"')).toBeTruthy();
  expect(tree.querySelector('img')).toBeNull();
  expect(operations.filter(data => data.kind === 'format')).toHaveLength(formats);
  activate('Copy result');
  await screen.findByText('Copied');
  expect(clipboard).toHaveBeenLastCalledWith(expect.stringContaining('    9007199254740993,'));
  edit('[] trailing');
  expect(screen.queryByRole('region', { name: 'JSON structure' })).toBeNull();
  expect(download().disabled).toBe(true);
});

it('imports real tokens, preserves content on read failure, exports UTF-8 and avoids filename collisions', async () => {
  setup();
  await ready();
  const encode = (value: string) => new TextEncoder().encode(value);
  let resolveOld!: (buffer: ArrayBuffer) => void;
  select(file('slow.json', new Uint8Array(), () => new Promise(resolve => { resolveOld = resolve; })));
  expect(download().disabled).toBe(true);
  const text = '{"n":9007199254740993,"x":"你好 🐾","n":-0}';
  fireEvent.drop(button('Import JSON'), { dataTransfer: {
    types: ['Files'], files: [file(' ..a?: .json', encode('\uFEFF\r\n' + text))],
  } });
  await ready();
  expect(original().state.doc.toString()).toBe('\n' + text);
  await act(async () => resolveOld(encode('[5]').buffer as ArrayBuffer));
  expect(original().state.doc.toString()).toBe('\n' + text);
  select(file('broken.json', new Uint8Array([0xff])));
  expect(await screen.findByText('The file is not valid UTF-8.')).toBeTruthy();
  await ready();
  expect(original().state.doc.toString()).toContain(text);
  activate('Minify');
  await ready();
  const formatCount = operations.length;
  const now = new Date(2026, 10, 22, 17, 30, 0, 123);
  vi.setSystemTime(now);
  try {
    activate('Download JSON');
    activate('Download JSON');
  } finally {
    vi.useRealTimers();
  }
  const [[first, filename], [second, other]] = vi.mocked(saveBlob).mock.calls;
  expect(first.type).toBe('application/json;charset=utf-8');
  expect(second.type).toBe(first.type);
  expect(filename).toBe('a---minified-20261122-173000-123.json');
  expect(other).toBe('a---minified-20261122-173000-124.json');
  for (const blob of [first, second]) {
    const result = await blobText(blob);
    expect(result).toBe(text);
    expect(parseJson(result).nodes).toHaveLength(4);
  }
  expect(operations).toHaveLength(formatCount);
});

it('localizes status, modes and diagnostics in Chinese', async () => {
  setup('zh');
  expect(screen.getByText('示例 JSON')).toBeTruthy();
  expect(await screen.findByText('JSON 有效')).toBeTruthy();
  const left = editor('原始 JSON');
  act(() => left.dispatch({ changes: { from: 0, to: left.state.doc.length, insert: '[0,]' } }));
  expect(await screen.findByText('末尾不能有多余逗号。')).toBeTruthy();
  expect(button('第 1 行，第 4 列')).toBeTruthy();
});

it('reads long paths and source values a page at a time without splitting Unicode characters', async () => {
  setup();
  const key = 'a'.repeat(2044) + '🐾' + ' ending';
  const value = 'b'.repeat(2046) + '🐾' + ' tail';
  edit(JSON.stringify({ [key]: value }));
  await ready();
  activate('Advanced');
  activate('Tree');
  const tree = screen.getByRole('region', { name: 'JSON structure' });
  fireEvent.click(await within(tree).findByText(/"a{45}.*…/));
  const paths = await within(tree).findByRole('group', { name: 'Path pages' });
  const values = within(tree).getByRole('group', { name: 'Value pages' });
  expect(tree.querySelector('code')?.textContent).toBe('$["' + 'a'.repeat(2044));
  expect(tree.querySelector('pre')?.textContent).toBe('"' + 'b'.repeat(2046));
  fireEvent.click(within(paths).getByRole('button', { name: 'Next' }));
  fireEvent.click(within(values).getByRole('button', { name: 'Next' }));
  expect(tree.querySelector('code')?.textContent).toBe('🐾 ending"]');
  expect(tree.querySelector('pre')?.textContent).toBe('🐾 tail"');
});
