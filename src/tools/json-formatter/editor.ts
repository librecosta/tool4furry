import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { JsonIssue } from './core';
import s from './json.module.scss';

const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--t4f-accent)' },
  { tag: tags.string, color: 'var(--t4f-positive)' },
  { tag: tags.number, color: 'var(--t4f-warning)' },
  { tag: [tags.bool, tags.null], color: 'var(--t4f-info)' },
]);
// The sticky gutters must paint over horizontally scrolled code in Dark mode.
const background = EditorView.theme({
  '&.cm-editor, & .cm-gutters.cm-gutters-before': {
    backgroundColor: 'var(--t4f-workspace)',
    backgroundImage: 'linear-gradient(var(--t4f-input-surface), var(--t4f-input-surface))',
  },
});
export const jsonLanguage = [json(), syntaxHighlighting(highlight), background];

class EndMarker extends WidgetType {
  toDOM() {
    const marker = document.createElement('span');
    marker.className = s.endMarker;
    marker.setAttribute('aria-hidden', 'true');
    return marker;
  }
}

export function jsonDiagnostic(issue: JsonIssue | undefined) {
  if (!issue || !('offset' in issue) || issue.code === 'empty') return [];
  const { offset } = issue;
  return EditorView.decorations.of(view => {
    const { doc } = view.state;
    if (offset > doc.length) return Decoration.none;
    const range = offset === doc.lineAt(offset).to
      ? Decoration.widget({ widget: new EndMarker(), side: 1 }).range(offset)
      : Decoration.mark({ class: s.errorMark }).range(offset, offset + 1);
    return Decoration.set([range]);
  });
}
