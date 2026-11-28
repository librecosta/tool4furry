import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { Prec, type Extension, type Range as EditorRange } from '@codemirror/state';
import type { ExpressionNode, RegexMatch } from './protocol';

export const captureColor = (index: number) => 'rx-group-' + ((index - 1) % 6);
export const nodeKey = (node: ExpressionNode) => [node.kind, node.from, node.to].join('-');

export function walkNodes(root?: ExpressionNode): ExpressionNode[] {
  const nodes: ExpressionNode[] = [];
  const add = (node: ExpressionNode) => {
    nodes.push(node);
    node.children.forEach(add);
  };
  if (root) add(root);
  return nodes;
}

function marker(className: string, from: number, to: number) {
  return Decoration.mark({ class: className }).range(from, to);
}

function brackets(node: ExpressionNode) {
  return ['group', 'capture', 'class', 'assertion'].includes(node.kind) && node.children.length > 0 && node.to - node.from >= 2;
}

const patternLayout = EditorView.theme({
  '&': { fontSize: 'inherit' },
  '.cm-scroller > .cm-content': { paddingBlock: '6px' },
  '.cm-content .cm-line': { paddingInline: '5px' },
});

export function patternTools(nodes: ExpressionNode[], error: number | undefined, onPick: (node: ExpressionNode) => void): Extension {
  const syntax: EditorRange<Decoration>[] = [];
  for (const node of nodes) {
    if (node.to <= node.from) continue;
    if (node.kind === 'capture') {
      const bodyStart = node.children[0]?.from ?? node.from + 1;
      syntax.push(marker('rx-capture-token ' + captureColor(node.group!), node.from, bodyStart));
      syntax.push(marker('rx-capture-token ' + captureColor(node.group!), node.to - 1, node.to));
    } else if (node.kind === 'quantifier') {
      syntax.push(marker('rx-syntax-quantifier', node.children[0].to, node.to));
    } else if (!['pattern', 'sequence', 'character'].includes(node.kind)) {
      syntax.push(marker('rx-syntax-' + node.kind, node.from, node.to));
    }
  }
  const ranges = Decoration.set(syntax, true);
  const pairs = nodes.filter(brackets);
  const decorations = (view: EditorView) => {
    const length = view.state.doc.length;
    const point = view.state.selection.main.head;
    if (error !== undefined && length) {
      const from = Math.max(0, Math.min(error, length - 1));
      return Decoration.set([marker('rx-syntax-error', from, from + 1)]);
    }
    const pair = pairs.findLast(node => point === node.from || point === node.from + 1 || point === node.to || point === node.to - 1);
    if (!pair) return ranges;
    return ranges.update({ add: [
      marker('rx-bracket', pair.from, pair.from + 1),
      marker('rx-bracket', pair.to - 1, pair.to),
    ] });
  };
  return [
    patternLayout,
    ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor(view: EditorView) { this.decorations = decorations(view); }
      update(update: ViewUpdate) {
        if (update.docChanged) this.decorations = Decoration.none;
        else if (update.selectionSet && this.decorations !== Decoration.none) this.decorations = decorations(update.view);
      }
    }, { decorations: plugin => plugin.decorations }),
    EditorView.updateListener.of(update => {
      if (!update.selectionSet || update.docChanged || !update.state.selection.main.empty) return;
      const at = update.state.selection.main.head;
      const node = nodes.findLast(item => item.from <= at && at < item.to && item.kind !== 'sequence');
      if (node) onPick(node);
    }),
  ];
}

class EmptyRange extends WidgetType {
  constructor(readonly className: string, readonly match: number) { super(); }
  eq(other: EmptyRange) { return other.className === this.className && other.match === this.match; }
  toDOM(view: EditorView) {
    const element = view.dom.ownerDocument.createElement('span');
    element.className = 'rx-empty ' + this.className;
    element.dataset.regexMatch = String(this.match);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }
  ignoreEvent() { return false; }
}

function matchDecorationRanges(ranges: ReturnType<typeof Decoration.set>): Extension {
  return ViewPlugin.fromClass(class {
    decorations = ranges;
    update(update: ViewUpdate) { if (update.docChanged) this.decorations = Decoration.none; }
  }, { decorations: plugin => plugin.decorations });
}

export function selectedMatchTools(match: RegexMatch | undefined, index: number): Extension {
  if (!match) return [];
  if (match.index === match.end) {
    const widget = new EmptyRange('rx-current-empty', index);
    return matchDecorationRanges(Decoration.set([Decoration.widget({ widget, side: -2 }).range(match.index)]));
  }
  const mark = Decoration.mark({ class: 'rx-selected', attributes: { 'data-regex-match': String(index) } });
  return Prec.low(matchDecorationRanges(Decoration.set([mark.range(match.index, match.end)])));
}

export function matchTools(matches: RegexMatch[], onPick: (index: number) => void): Extension {
  const entries: EditorRange<Decoration>[] = [];
  const add = (from: number, to: number, className: string, index: number, side: number) => {
    if (from === to) {
      entries.push(Decoration.widget({ widget: new EmptyRange(className, index), side }).range(from));
    } else {
      entries.push(Decoration.mark({ class: className, attributes: { 'data-regex-match': String(index) } }).range(from, to));
    }
  };
  for (const [index, match] of matches.entries()) {
    add(match.index, match.end, 'rx-match', index, -1);
    match.ranges?.forEach((range, group) => {
      if (range) add(range[0], range[1], 'rx-capture ' + captureColor(group + 1), index, group + 1);
    });
  }
  return [
    matchDecorationRanges(Decoration.set(entries, true)),
    EditorView.domEventHandlers({
      click(event) {
        const element = event.target instanceof Element && event.target.closest<HTMLElement>('[data-regex-match]');
        if (element) onPick(Number(element.dataset.regexMatch));
        return false;
      },
    }),
  ];
}
