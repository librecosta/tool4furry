import { StrictMode, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { undo, redo, insertNewline } from '@codemirror/commands';
import { TextEditor } from '../src/ui/text-editor/TextEditor';
import { editorDOM } from './fixtures/editor-dom';

const view = (label = 'Editor') =>
  EditorView.findFromDOM(screen.getByRole('textbox', { name: label }))!;
afterEach(() => vi.restoreAllMocks());
beforeEach(editorDOM);
it('mounts/destroys under StrictMode, with multiple independent editors and plugin cleanup', () => {
  const destroy = vi.spyOn(EditorView.prototype, 'destroy'),
    cleanup = vi.fn();
  const extension = ViewPlugin.define(() => ({ destroy: cleanup }));
  const app = render(
    <StrictMode>
      <TextEditor ariaLabel="Editor" value="one" extensions={extension} />
      <TextEditor ariaLabel="Other" value="two" />
    </StrictMode>,
  );
  expect(document.querySelectorAll('.cm-editor')).toHaveLength(2);
  expect(destroy).toHaveBeenCalledTimes(2);
  const first = view();
  expect(first.state.doc.toString()).toBe('one');
  expect(view('Other').state.doc.toString()).toBe('two');
  const dom = first.dom;
  app.unmount();
  expect(dom.isConnected).toBe(false);
  expect(destroy).toHaveBeenCalledTimes(4);
  expect(cleanup).toHaveBeenCalledTimes(2);
});
it('emits actual edits once, skips controlled echoes and retains selection and history', () => {
  const changed = vi.fn();
  function Controlled() {
    const [value, set] = useState('abc');
    return (
      <TextEditor
        ariaLabel="Editor"
        value={value}
        onChange={(next) => {
          changed(next);
          set(next);
        }}
      />
    );
  }
  render(<Controlled />);
  const editor = view();
  act(() =>
    editor.dispatch({
      changes: { from: 1, insert: '中' },
      selection: { anchor: 2 },
      userEvent: 'input.type',
    }),
  );
  expect(view()).toBe(editor);
  expect(editor.state.selection.main.head).toBe(2);
  expect(changed).toHaveBeenCalledExactlyOnceWith('a中bc');
  act(() => {
    undo(editor);
  });
  expect(editor.state.doc.toString()).toBe('abc');
  act(() => {
    redo(editor);
  });
  expect(editor.state.doc.toString()).toBe('a中bc');
});
it('maps external changes without change callbacks or rebuilding the view; updates compartments', () => {
  const changed = vi.fn(),
    pluginDestroy = vi.fn(),
    extension = ViewPlugin.define(() => ({ destroy: pluginDestroy }));
  const app = render(
      <TextEditor
        ariaLabel="Editor"
        value="abcdef"
        onChange={changed}
        extensions={extension}
      />,
    ),
    editor = view();
  act(() => editor.dispatch({ selection: { anchor: 3, head: 5 } }));
  app.rerender(
    <TextEditor
      ariaLabel="Editor"
      value="abXcdef"
      onChange={changed}
      extensions={extension}
    />,
  );
  expect(view()).toBe(editor);
  expect(editor.state.selection.main.from).toBe(4);
  expect(editor.state.selection.main.to).toBe(6);
  expect(changed).not.toHaveBeenCalled();
  app.rerender(
    <TextEditor
      ariaLabel="Editor"
      value="abXcdef"
      onChange={changed}
      readOnly
      placeholder="Hint"
      lineNumbers={false}
      lineWrapping={false}
    />,
  );
  expect(view()).toBe(editor);
  expect(editor.state.readOnly).toBe(true);
  expect(editor.contentDOM.getAttribute('contenteditable')).toBe('false');
  expect(editor.contentDOM.getAttribute('tabindex')).toBe('0');
  expect(editor.contentDOM.getAttribute('aria-readonly')).toBe('true');
  expect(pluginDestroy).toHaveBeenCalledOnce();
  expect(document.querySelector('.cm-lineNumbers')).toBeNull();
  act(() => {
    insertNewline(editor);
  });
  expect(editor.state.doc.toString()).toBe('abXcdef');
  app.rerender(<TextEditor ariaLabel="Editor" value="" onChange={changed} />);
  expect(editor.state.doc.length).toBe(0);
  expect(changed).not.toHaveBeenCalled();
  expect(editor.state.facet(EditorState.readOnly)).toBe(false);
});
