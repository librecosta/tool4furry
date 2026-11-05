import { useLayoutEffect, useRef, useState } from 'react';
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers as gutter,
  placeholder as hint,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import notice from './codemirror.NOTICE.txt?url';
import s from './TextEditor.module.scss';

export interface TextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel: string;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  extensions?: Extension;
  className?: string;
}
const external = Annotation.define<boolean>();
const noExtensions: Extension = [];
// CodeMirror's unlayered base rules outrank layered SCSS. Its internal overrides
// stay in this scoped theme; the surrounding layout and surfaces remain SCSS.
const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--t4f-input-surface)',
    color: 'var(--t4f-text-primary)',
    fontSize: '14px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--t4f-editor-font, var(--t4f-font-sans))',
    lineHeight: '1.65',
  },
  '.cm-content': {
    padding: '12px 0',
    minHeight: '100%',
    caretColor: 'var(--t4f-accent)',
  },
  '.cm-line': { padding: '0 12px' },
  '.cm-gutters': {
    backgroundColor: 'var(--t4f-input-surface)',
    color: 'var(--t4f-text-secondary)',
    border: 'none',
    fontFamily: 'var(--t4f-font-mono)',
    fontSize: '12px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 12px',
    minWidth: '36px',
  },
  '.cm-placeholder': { color: 'var(--t4f-text-secondary)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--t4f-accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: 'color-mix(in srgb, var(--t4f-accent) 25%, transparent)',
    },
});

/** Controlled text, with LF editor semantics. Languages/formatting belong to callers. */
export function TextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = '',
  ariaLabel,
  lineNumbers = true,
  lineWrapping = true,
  extensions = noExtensions,
  className,
}: TextEditorProps) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const callback = useRef(onChange),
    lastValue = useRef(value);
  const [slots] = useState(() => ({
    config: new Compartment(),
    extra: new Compartment(),
  }));
  const config = (): Extension => [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    EditorView.contentAttributes.of({
      'aria-label': ariaLabel,
      'aria-readonly': String(readOnly),
      'aria-multiline': 'true',
      role: 'textbox',
      tabindex: '0',
      spellcheck: 'false',
    }),
    lineNumbers ? gutter() : [],
    lineWrapping ? EditorView.lineWrapping : [],
    placeholder ? hint(placeholder) : [],
  ];
  useLayoutEffect(() => {
    callback.current = onChange;
  });
  useLayoutEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          theme,
          history(),
          keymap.of([...historyKeymap, ...defaultKeymap]),
          drawSelection(),
          EditorState.transactionFilter.of((transaction) =>
            transaction.startState.readOnly &&
            transaction.docChanged &&
            !transaction.annotation(external)
              ? []
              : transaction,
          ),
          slots.config.of(config()),
          slots.extra.of(extensions),
          EditorView.updateListener.of((update) => {
            if (
              !update.docChanged ||
              update.transactions.every((transaction) =>
                transaction.annotation(external),
              )
            )
              return;
            const next = update.state.doc.toString();
            lastValue.current = next;
            callback.current?.(next);
          }),
        ],
      }),
    });
    view.current = editor;
    lastValue.current = value;
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, []);
  useLayoutEffect(() => {
    const editor = view.current;
    if (!editor || value === lastValue.current) return; // Controlled echoes are not additional edits.
    lastValue.current = value;
    const next = value.replace(/\r\n?/g, '\n'),
      current = editor.state.doc.toString();
    if (next === current) return;
    // Map existing selections through the smallest externally changed range.
    let from = 0,
      oldEnd = current.length,
      newEnd = next.length;
    while (from < oldEnd && from < newEnd && current[from] === next[from])
      from++;
    while (
      oldEnd > from &&
      newEnd > from &&
      current[oldEnd - 1] === next[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }
    editor.dispatch({
      changes: { from, to: oldEnd, insert: next.slice(from, newEnd) },
      annotations: [external.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);
  useLayoutEffect(() => {
    view.current?.dispatch({ effects: slots.config.reconfigure(config()) });
  }, [readOnly, placeholder, ariaLabel, lineNumbers, lineWrapping]);
  useLayoutEffect(() => {
    view.current?.dispatch({ effects: slots.extra.reconfigure(extensions) });
  }, [extensions]);
  return (
    <div
      ref={host}
      data-text-editor
      data-editor-license={notice}
      className={[s.editor, className].filter(Boolean).join(' ')}
    />
  );
}
