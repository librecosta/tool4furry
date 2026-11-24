import { useLayoutEffect, useRef, type RefObject } from 'react';
import { EditorState, Prec, StateEffect, StateField, type Text } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, invertedEffects, undoDepth, redoDepth } from '@codemirror/commands';
import { defaultHighlightStyle, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap } from '@codemirror/search';
import { drawSelection, EditorView, keymap, lineNumbers, type ViewUpdate } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import { formatCommand } from './commands';
import { example } from './core';
import { defaultName } from './delivery';
import s from './markdown.module.scss';

type FileIdentity = { id: number; name: string };
const initialFile: FileIdentity = { id: 0, name: defaultName };
export const replaceFile = StateEffect.define<FileIdentity>();
const fileIdentity = StateField.define<FileIdentity>({
  create: () => initialFile,
  update: (file, transaction) => transaction.effects.find(effect => effect.is(replaceFile))?.value ?? file,
});

export interface SourceState {
  doc: Text;
  file: FileIdentity;
  line: number;
  column: number;
  canUndo: boolean;
  canRedo: boolean;
}

export function sourceState(state: EditorState): SourceState {
  const head = state.selection.main.head, line = state.doc.lineAt(head);
  return { doc: state.doc, file: state.field(fileIdentity, false) ?? initialFile,
    line: line.number, column: head - line.from + 1,
    canUndo: undoDepth(state) > 0, canRedo: redoDepth(state) > 0 };
}

const syntax = HighlightStyle.define([
  { tag: [tags.heading, tags.strong], color: 'var(--t4f-accent)', fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--t4f-accent)', textDecoration: 'underline' },
  { tag: [tags.quote, tags.list], color: 'var(--t4f-positive)' },
  { tag: [tags.monospace, tags.string], color: 'var(--t4f-warning)' },
  { tag: [tags.processingInstruction, tags.meta, tags.comment], color: 'var(--t4f-text-secondary)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--t4f-text-primary)', background: 'var(--md-editor-surface)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', overscrollBehavior: 'contain', fontFamily: 'var(--t4f-font-mono)', fontSize: '13px', lineHeight: '1.66' },
  '.cm-content': { padding: '16px 0', minHeight: '100%', caretColor: 'var(--t4f-accent)' },
  '.cm-line': { padding: '0 14px 0 6px' },
  '.cm-gutters': { background: 'var(--md-editor-surface)', color: 'var(--t4f-text-secondary)', border: 'none', fontSize: '11px' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '2.7em', padding: '0 8px', lineHeight: 'inherit' },
  '.cm-cursor': { borderLeftColor: 'var(--t4f-accent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    background: 'color-mix(in srgb, var(--t4f-accent) 25%, transparent)',
  },
  '.cm-panels': { border: '0', color: 'var(--t4f-text-primary)', background: 'var(--md-editor-surface)' },
  '.cm-searchMatch': { background: 'color-mix(in srgb, var(--t4f-warning) 30%, transparent)' },
  '.cm-searchMatch.cm-searchMatch-selected': { background: 'color-mix(in srgb, var(--t4f-accent) 40%, transparent)' },
});

const searchZh = {
  Find: '查找', Replace: '替换', next: '下一个', previous: '上一个', all: '全部', 'match case': '区分大小写',
  regexp: '正则表达式', 'by word': '全词', replace: '替换', 'replace all': '全部替换', close: '关闭',
  'current match': '当前匹配', 'on line': '所在行', 'replaced $ matches': '已替换 $ 处匹配',
  'replaced match on line $': '已替换第 $ 行的匹配', 'Go to line': '转到指定行', go: '转到',
};

export function MarkdownSource({ viewRef, locale, onUpdate, onGeometry }: {
  viewRef: RefObject<EditorView | null>;
  locale: 'zh' | 'en';
  onUpdate: (state: SourceState) => void;
  onGeometry: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onUpdate, onGeometry });
  useLayoutEffect(() => { callbacks.current = { onUpdate, onGeometry }; }, [onUpdate, onGeometry]);
  useLayoutEffect(() => {
    const update = (event: ViewUpdate) => {
      if (event.docChanged || event.selectionSet || event.startState.field(fileIdentity) !== event.state.field(fileIdentity))
        callbacks.current.onUpdate(sourceState(event.state));
      if (event.heightChanged || event.geometryChanged || event.viewportChanged) callbacks.current.onGeometry();
    };
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: example,
        extensions: [
          theme, history(), fileIdentity, drawSelection(), lineNumbers(), EditorView.lineWrapping,
          invertedEffects.of(transaction => transaction.effects.some(effect => effect.is(replaceFile))
            ? [replaceFile.of(transaction.startState.field(fileIdentity))] : []),
          markdown({ extensions: [GFM] }), search({ top: true }),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }), syntaxHighlighting(syntax),
          EditorState.phrases.of(locale === 'zh' ? searchZh : {}),
          EditorView.contentAttributes.of({
            'aria-label': locale === 'zh' ? 'Markdown 源码' : 'Markdown source',
            'aria-multiline': 'true', role: 'textbox', spellcheck: 'false',
          }),
          Prec.high(keymap.of([
            { key: 'Mod-b', run: formatCommand('bold') }, { key: 'Mod-i', run: formatCommand('italic') },
            { key: 'Mod-k', run: formatCommand('link') }, { key: 'Mod-Shift-x', run: formatCommand('strike') },
          ])),
          keymap.of([...searchKeymap, ...historyKeymap, ...defaultKeymap]),
          EditorView.updateListener.of(update),
        ],
      }),
    });
    viewRef.current = view;
    callbacks.current.onUpdate(sourceState(view.state));
    return () => { viewRef.current = null; view.destroy(); };
  }, [locale, viewRef]);
  return <div ref={host} className={s.editorHost} />;
}
