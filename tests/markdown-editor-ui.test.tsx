import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import MarkdownEditor from '../src/tools/markdown-editor/MarkdownEditor';
import { autoPreviewLimit, example } from '../src/tools/markdown-editor/core';

function viewport(narrow = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: narrow && query.includes('640px'), addEventListener() {}, removeEventListener() {},
  }));
}

function source(name = 'Markdown source') {
  return EditorView.findFromDOM(screen.getByRole('textbox', { name }))!;
}

function edit(view: EditorView, value: string) {
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }));
}

describe('unified Markdown workspace', () => {
  beforeEach(() => {
    viewport();
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [new DOMRect(0, 0, 10, 16)] });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect(0, 0, 10, 16) });
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  it('defaults to Split and preserves the instance, selection, and history across all views', async () => {
    render(<MarkdownEditor locale="en" region="global" />);
    const view = source();
    expect(view.state.doc.toString()).toBe(example);
    expect(screen.getByRole('button', { name: 'Split' }).getAttribute('aria-pressed')).toBe('true');
    const live = screen.getByLabelText('Live Markdown preview');
    await within(live).findByRole('heading', { name: 'A little more clarity.' });
    edit(view, 'Keep this line');
    act(() => view.dispatch({ selection: { anchor: 5, head: 9 } }));
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(view.state.doc.toString()).toBe('Keep **this** line');
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByRole('textbox', { name: 'Markdown source' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    expect(source()).toBe(view);
    expect(view.state.selection.main).toMatchObject({ from: 7, to: 11 });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(view.state.doc.toString()).toBe('Keep this line');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(view.state.doc.toString()).toBe('Keep **this** line');
  });

  it('localizes the mobile defaults and keyboard-adjusts and resets the split ratio', () => {
    viewport(true);
    render(<MarkdownEditor locale="zh" region="cn" />);
    expect(source('Markdown 源码').state.doc.toString()).toBe(example);
    expect(screen.getByLabelText('Markdown 实时预览').closest('section')?.hidden).toBe(true);
    expect(screen.getByRole('button', { name: '编辑' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '分栏' }));
    const handle = screen.getByRole('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle.getAttribute('aria-valuenow')).toBe('53');
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
  });

  it('confirms replacement, then undoes it with its file identity and content', async () => {
    const { container } = render(<MarkdownEditor locale="en" region="global" />);
    const view = source();
    edit(view, '# An unsaved edit');
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [new File(['# Imported 中文'], 'chapter.markdown')] } });
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(view.state.doc.toString()).toBe('# An unsaved edit');
    fireEvent.change(input, { target: { files: [new File(['# Imported 中文'], 'chapter.markdown')] } });
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Replace document' }));
    expect(view.state.doc.toString()).toBe('# Imported 中文');
    expect(screen.getByText('chapter.markdown')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(view.state.doc.toString()).toBe('# An unsaved edit');
    expect(screen.getByText('document.md')).toBeTruthy();
  });

  it('renames the document, cancels an edit with Escape, and can undo a rename', () => {
    render(<MarkdownEditor locale="en" region="global" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit file name document.md' }));
    let input = screen.getByRole('textbox', { name: 'Edit file name' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '笔记 2026.html' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const renamed = screen.getByRole('button', { name: 'Edit file name 笔记 2026.html' });
    expect(document.activeElement).toBe(renamed);
    expect(source().state.doc.toString()).toBe(example);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit file name 笔记 2026.html' }));
    input = screen.getByRole('textbox', { name: 'Edit file name' });
    fireEvent.change(input, { target: { value: 'discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Edit file name 笔记 2026.html' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Edit file name document.md' })).toBeTruthy();
  });

  it('loads remote Markdown images by default and replaces them with placeholders when switched off', async () => {
    render(<MarkdownEditor locale="en" region="global" />);
    edit(source(), '![Example image](https://example.com/image.png)');
    const live = screen.getByLabelText('Live Markdown preview');
    const image = await within(live).findByRole('img', { name: 'Example image' });
    expect(image.getAttribute('src')).toBe('https://example.com/image.png');
    fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), { key: 'ArrowDown' });
    const toggle = await screen.findByRole('menuitemcheckbox', { name: 'Allow remote images' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect((await within(live).findByRole('img', { name: 'Image placeholder (Example image)' })).tagName).toBe('SPAN');
  });

  it('pauses previews of long files while keeping all source editable and allowing manual refresh', async () => {
    render(<MarkdownEditor locale="en" region="global" />);
    const view = source();
    const value = '# Long document\n\n' + 'a '.repeat(autoPreviewLimit / 2);
    edit(view, value);
    expect(screen.getByText('Automatic preview is paused for this long document.')).toBeTruthy();
    expect(view.state.doc.length).toBe(value.length);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh preview' }));
    const live = screen.getByLabelText('Live Markdown preview');
    await within(live).findByRole('heading', { name: 'Long document' });
    expect(live.textContent?.trimEnd().endsWith('a')).toBe(true);
    await waitFor(() => expect(screen.queryByText('Automatic preview is paused for this long document.')).toBeNull());
  });
});
