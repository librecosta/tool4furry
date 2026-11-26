import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { JsonIssue } from './core';
import s from './json.module.scss';

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
