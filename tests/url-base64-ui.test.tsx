import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { EditorView } from '@codemirror/view';
import { redo, undo } from '@codemirror/commands';
import { StrictMode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { saveBlob } from '../src/tools/general/ui';
import UrlBase64 from '../src/tools/url-base64/UrlBase64';
import { editorDOM } from './fixtures/editor-dom';
import { setViewport } from './setup';

vi.mock('../src/tools/general/ui', async original => ({
  ...(await original<typeof import('../src/tools/general/ui')>()),
  saveBlob: vi.fn(),
}));
const clipboard = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  editorDOM();
  setViewport();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});

const sample = '你好 & Tool4Furry';
const sampleOutput = '%E4%BD%A0%E5%A5%BD%20%26%20Tool4Furry';
function setup(locale: 'en' | 'zh' = 'en') {
  return render(
    <StrictMode>
      <Tooltip.Provider>
        <UrlBase64 locale={locale} region={locale === 'zh' ? 'cn' : 'global'} />
      </Tooltip.Provider>
    </StrictMode>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.click(button(name));
const selected = (name: string) => expect(button(name).getAttribute('aria-pressed')).toBe('true');
const editor = (name = 'Input') => EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
const value = (name = 'Input') => editor(name).state.doc.toString();
const output = (text: string) => waitFor(() => expect(value('Result')).toBe(text));
const edit = (text: string, name = 'Input') => act(() => {
  const view = editor(name);
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, userEvent: 'input.paste' });
});
const unavailable = () => {
  for (const name of ['Copy result', 'Download TXT', 'Swap & reverse']) expect(button(name)).toHaveProperty('disabled', true);
  expect(value('Result')).toBe('');
};
function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

it('starts Quick / URL / Encode with the actual sample and two stable CodeMirror instances', async () => {
  setup();
  selected('Quick');
  selected('URL');
  selected('Encode');
  expect(value()).toBe(sample);
  expect(editor('Result').state.readOnly).toBe(true);
  expect(document.querySelectorAll('.cm-editor')).toHaveLength(2);
  expect(document.querySelector('textarea, select')).toBeNull();
  expect(screen.queryByRole('group', { name: 'URL type' })).toBeNull();
  await output(sampleOutput);
  expect(screen.getByText('Converted')).toBeTruthy();
  expect(screen.getByText('15 characters')).toBeTruthy();
  const inputEditor = editor();
  const resultEditor = editor('Result');

  edit('🦊?');
  unavailable();
  expect(screen.getByText('Processing…')).toBeTruthy();
  await output('%F0%9F%A6%8A%3F');
  expect(screen.getByText('2 characters')).toBeTruthy();
  press('Base64');
  expect(value()).toBe('🦊?');
  await output('8J+mij8=');
  press('Decode');
  expect(value()).toBe('🦊?');
  unavailable();
  await screen.findByText('The input contains characters outside the selected Base64 alphabet.');
  press('Load sample');
  expect(value()).toBe('5L2g5aW9');
  await output('你好');
  press('Encode');
  expect(value()).toBe('5L2g5aW9');
  press('Load sample');
  expect(value()).toBe('你好');
  await output('5L2g5aW9');
  expect(editor()).toBe(inputEditor);
  expect(editor('Result')).toBe(resultEditor);
});

it('uses advanced URL variants and re-applies saved rules when returning from Quick', async () => {
  setup();
  press('Advanced');
  const controls = within(screen.getByRole('group', { name: 'URL type' }));
  for (const name of ['URL component', 'Full URL', 'Form value']) expect(controls.getByRole('button', { name })).toBeTruthy();
  edit('HTTPS://Example.org/你好?b=1&a=2#片');
  press('Full URL');
  await output('HTTPS://Example.org/%E4%BD%A0%E5%A5%BD?b=1&a=2#%E7%89%87');
  press('Swap & reverse');
  selected('Full URL');
  selected('Decode');
  await output('HTTPS://Example.org/你好?b=1&a=2#片');
  press('Encode');
  edit('a b+c&d=e');
  press('Form value');
  await output('a+b%2Bc%26d%3De');
  press('Quick');
  expect(screen.queryByRole('button', { name: 'Form value' })).toBeNull();
  expect(value()).toBe('a b+c&d=e');
  await output('a%20b%2Bc%26d%3De');
  press('Advanced');
  selected('Form value');
  await output('a+b%2Bc%26d%3De');
  press('Swap & reverse');
  expect(value()).toBe('a+b%2Bc%26d%3De');
  await output('a b+c&d=e');
});

it('remembers each Base64 alphabet and padding preference and accepts valid padded or unpadded decoding', async () => {
  setup();
  press('Base64');
  press('Advanced');
  selected('Standard Base64');
  selected('Pad with =');
  edit('\u{10FFFF}');
  await output('9I+/vw==');
  press('Base64URL');
  selected('Omit padding');
  await output('9I-_vw');
  press('Pad with =');
  await output('9I-_vw==');
  press('Standard Base64');
  press('Omit padding');
  await output('9I+/vw');
  press('Base64URL');
  selected('Pad with =');
  await output('9I-_vw==');
  press('Quick');
  await output('9I+/vw==');
  press('Advanced');
  selected('Base64URL');
  await output('9I-_vw==');
  press('Swap & reverse');
  selected('Decode');
  expect(value()).toBe('9I-_vw==');
  await output('\u{10FFFF}');
  edit('9I-_vw');
  await output('\u{10FFFF}');
  edit('9I+_vw==');
  unavailable();
  await screen.findByText('The input contains characters outside the selected Base64 alphabet.');
  press('Encode');
  selected('Pad with =');
  press('Standard Base64');
  selected('Omit padding');
});

it('swaps exact text twice including carriage returns, keeps Undo/Redo, and clears stale results on error', async () => {
  setup();
  await output(sampleOutput);
  const inputEditor = editor();
  const encoded = '%EF%BB%BFa%0D%0Ab%0Dc%F0%9F%A6%8A%00';
  const decoded = '\uFEFFa\r\nb\rc🦊\x00';
  edit(decoded);
  await output(encoded);
  press('Swap & reverse');
  expect(value()).toBe(encoded);
  selected('Decode');
  unavailable();
  await output(decoded);
  press('Swap & reverse');
  expect(value()).toBe(decoded);
  selected('Encode');
  await output(encoded);
  expect(editor()).toBe(inputEditor);

  edit('next');
  await output('next');
  act(() => { expect(undo(inputEditor)).toBe(true); });
  expect(value()).toBe(decoded);
  await output(encoded);
  act(() => { expect(redo(inputEditor)).toBe(true); });
  await output('next');

  press('Decode');
  edit('%ZZ');
  unavailable();
  await screen.findByText('Invalid URL escape. Check the two hexadecimal digits after each %.');
  edit('%ED%A0%80');
  await screen.findByText('The escaped URL bytes are not valid UTF-8 text.');
  expect(value()).toBe('%ED%A0%80');
  unavailable();
  edit('%20');
  await output(' ');
  press('Clear input');
  expect(value()).toBe('');
  unavailable();
  expect(screen.queryByText('Converted')).toBeNull();
  expect(editor()).toBe(inputEditor);
});

it('copies and downloads the exact current UTF-8 output, including CR, BOM and NUL', async () => {
  setup();
  press('Base64');
  press('Decode');
  edit('77u/YQ0K8J+migA=');
  const text = '\uFEFFa\r\n🦊\x00';
  await output(text);
  press('Copy result');
  await screen.findByText('Copied');
  expect(clipboard).toHaveBeenCalledExactlyOnceWith(text);
  clipboard.mockRejectedValueOnce(new Error('Denied'));
  press('Copy result');
  await screen.findByText('Copy failed. Select and copy the result manually.');
  expect(value('Result')).toBe(text);
  press('Download TXT');
  press('Download TXT');
  const calls = vi.mocked(saveBlob).mock.calls;
  expect(calls).toHaveLength(2);
  const filenames = new Set<string>();
  for (const [blob, filename] of calls) {
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(filename).toMatch(/^base64-decoded-\d{8}-\d{6}-\d{3}\.txt$/);
    filenames.add(filename);
    expect(Array.from(await readBytes(blob))).toEqual([239, 187, 191, 97, 13, 10, 240, 159, 166, 138, 0]);
  }
  expect(filenames.size).toBe(2);
  edit('/w==');
  unavailable();
  await screen.findByText('The Base64 data is not valid UTF-8 text.');
  press('Download TXT');
  press('Copy result');
  expect(saveBlob).toHaveBeenCalledTimes(2);
  expect(clipboard).toHaveBeenCalledTimes(2);
});

it('localizes the workspace and sample actions while keeping text editable', async () => {
  setup('zh');
  expect(screen.getByRole('heading', { name: '文本编解码工作区' })).toBeTruthy();
  expect(screen.getByText('示例文本 · UTF-8')).toBeTruthy();
  selected('快速');
  selected('编码');
  expect(value('输入')).toBe(sample);
  await waitFor(() => expect(value('结果')).toBe(sampleOutput));
  press('解码');
  press('载入示例');
  await waitFor(() => expect(value('结果')).toBe(sample));
  edit('%', '输入');
  await screen.findByText('URL 转义无效，请检查 % 后的两位十六进制字符。');
  expect(screen.getByText('用户输入 · UTF-8')).toBeTruthy();
  expect(button('反向查看')).toHaveProperty('disabled', true);
});
