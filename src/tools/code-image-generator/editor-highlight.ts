import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import type { Highlight } from './highlight-data';

const editorTheme = EditorView.theme({
  '&[data-code-image-editor]': {
    backgroundColor: 'var(--code-editor-surface, var(--t4f-input-surface))',
    color: 'var(--code-editor-text, var(--t4f-text-primary))',
  },
  '&[data-code-image-editor] .cm-scroller': { fontFamily: 'var(--t4f-font-mono)' },
  '&[data-code-image-editor] .cm-gutters': {
    backgroundColor: 'transparent',
    color: 'color-mix(in srgb, var(--code-editor-text, var(--t4f-text-primary)) 64%, transparent)',
  },
  '&[data-code-image-editor] .cm-content': { caretColor: 'currentColor' },
});

export function editorAppearance(surface?: string, foreground?: string): Extension {
  return [editorTheme, EditorView.editorAttributes.of({
    'data-code-image-editor': '',
    ...(surface && foreground && { style: `--code-editor-surface:${surface};--code-editor-text:${foreground}` }),
  })];
}

export function editorHighlight(source: string, highlight: Highlight): Extension {
  if (highlight.fallback) return [];
  const { lines, foreground } = highlight;

  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    private matches: boolean;

    constructor(view: EditorView) {
      this.matches = view.state.doc.toString() === source;
      this.decorations = this.paint(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.matches = update.state.doc.toString() === source;
        if (!this.matches) {
          // Keep existing highlights stable while the worker tokenizes the edit.
          this.decorations = this.decorations.map(update.changes);
          return;
        }
      }
      if (this.matches && (update.docChanged || update.viewportChanged)) this.decorations = this.paint(update.view);
    }

    private paint(view: EditorView): DecorationSet {
      if (!this.matches) return Decoration.none;
      const marks = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;
      let lastLine = 0;
      for (const { from, to } of view.visibleRanges) {
        for (let number = Math.max(lastLine + 1, doc.lineAt(from).number); number <= doc.lineAt(to).number; number++) {
          let offset = doc.line(number).from;
          for (const { text, color, style } of lines[number - 1]) {
            const end = offset + text.length;
            if (end > offset && (color !== foreground || style & 3)) {
              const css = `color:${color}${style & 1 ? ';font-style:italic' : ''}${style & 2 ? ';font-weight:700' : ''}`;
              marks.add(offset, end, Decoration.mark({ attributes: { style: css } }));
            }
            offset = end;
          }
          lastLine = number;
        }
      }
      return marks.finish();
    }
  }, { decorations: plugin => plugin.decorations });
}
