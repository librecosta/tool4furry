import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { beforeEach, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import TextCleaner from '../src/tools/text-cleaner/TextCleaner';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';
import { editorDOM } from './fixtures/editor-dom';
vi.mock('../src/tools/general/ui', async (original) => ({
  ...(await original<typeof import('../src/tools/general/ui')>()),
  saveBlob: vi.fn(),
}));
const clipboard = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  editorDOM();
  setViewport();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboard },
  });
});
function setup(locale: 'zh' | 'en' = 'en') {
  return render(
    <Tooltip.Provider>
      <TextCleaner locale={locale} region="cn" />
    </Tooltip.Provider>,
  );
}
const editor = (name = 'Original text') =>
  EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
const input = (text: string) =>
  act(() => {
    const view = editor();
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      userEvent: 'input.paste',
    });
  });
const output = () => editor('Cleaned text').state.doc.toString();
it('starts Quick with two real editors, preserves indentation and updates automatically', async () => {
  setup();
  expect(document.querySelector('textarea')).toBeNull();
  expect(document.querySelectorAll('.cm-editor')).toHaveLength(2);
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Quick' }).getAttribute('aria-pressed'),
  ).toBe('true');
  expect(screen.getByRole('button', { name: 'Copy result' })).toHaveProperty(
    'disabled',
    true,
  );
  input('  中文  \r\n\r\n\r\n\ttext \n');
  await waitFor(() => expect(output()).toBe('  中文\n\n\ttext\n'));
  expect(editor('Cleaned text').state.readOnly).toBe(true);
  expect(
    screen.queryByRole('button', { name: /Clean|Apply|Generate/ }),
  ).toBeNull();
});
it('keeps advanced rules, input identity and exact CRLF exports across modes and clear', async () => {
  setup();
  input('  a  \n\n\n b  \n');
  const original = editor();
  fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Trim leading whitespace' }),
  );
  fireEvent.click(screen.getByRole('radio', { name: /^Keep$/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'CRLF' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty(
      'disabled',
      false,
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Download TXT' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download TXT' }));
  const calls = vi.mocked(saveBlob).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][0].type).toBe('text/plain;charset=utf-8');
  expect(calls[0][1]).toMatch(/^cleaned-\d{8}-\d{6}-\d{3}(?:-\d+)?\.txt$/);
  expect(calls[0][1]).not.toBe(calls[1][1]);
  const text = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(calls[0][0]);
  });
  expect(text).toBe('a\r\n\r\n\r\nb\r\n');
  fireEvent.click(screen.getByRole('button', { name: 'Copy result' }));
  await waitFor(() => expect(clipboard).toHaveBeenLastCalledWith(text));
  fireEvent.click(screen.getByRole('button', { name: 'Quick' }));
  await waitFor(() => expect(output()).toBe('  a\n\n b\n'));
  expect(editor()).toBe(original);
  fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
  await waitFor(() => expect(output()).toBe('a\n\n\nb\n'));
  expect(screen.getByRole('radio', { name: 'CRLF' })).toHaveProperty(
    'checked',
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear text' }));
  await waitFor(() => expect(output()).toBe(''));
  expect(
    screen
      .getByRole('checkbox', { name: 'Trim leading whitespace' })
      .getAttribute('aria-checked'),
  ).toBe('true');
  expect(editor()).toBe(original);
});
it('disables stale exports immediately, accepts long input, and leaves results available after copy failure', async () => {
  setup();
  input('first');
  await waitFor(() => expect(output()).toBe('first'));
  const large = '  text  '.repeat(70_000);
  input(large);
  expect(screen.getByRole('button', { name: 'Download TXT' })).toHaveProperty(
    'disabled',
    true,
  );
  await waitFor(() => expect(output()).toBe(large.trimEnd()));
  clipboard.mockRejectedValueOnce(Error('denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy result' }));
  await screen.findByText('Copy failed. Select and copy the result manually.');
  expect(output()).toContain('  text  ');
});
