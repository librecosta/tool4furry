import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowsOutIcon, MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import type { ExpressionNode } from './protocol';
import { describeNode, type Translate } from './reference';
import { captureColor, nodeKey } from './editor';
import s from './workbench.module.scss';

type Shape = {
  width: number;
  height: number;
  rail: number;
  render: (x: number, y: number) => ReactNode;
};
const gap = 18;
const track = (d: string) => <path className={s.track} d={d} />;
const line = (x: number, y: number, width: number) => track('M' + x + ' ' + y + 'h' + width);

function sequence(parts: Shape[]): Shape {
  const width = parts.length ? parts.reduce((sum, part) => sum + part.width, 0) + gap * (parts.length - 1) : 36;
  const rail = Math.max(16, ...parts.map(part => part.rail));
  const height = rail + Math.max(16, ...parts.map(part => part.height - part.rail));
  return {
    width, height, rail,
    render(x, y) {
      let offset = x;
      if (!parts.length) return line(x, y + rail, width);
      return parts.map((part, index) => {
        const start = offset;
        offset += part.width + gap;
        return <g key={index}>
          {part.render(start, y + rail - part.rail)}
          {index < parts.length - 1 && line(start + part.width, y + rail, gap)}
        </g>;
      });
    },
  };
}

function branches(parts: Shape[]): Shape {
  if (parts.length < 2) return parts[0] ?? sequence([]);
  const pad = 28;
  const width = Math.max(...parts.map(part => part.width)) + pad * 2;
  return {
    width, rail: parts[0].rail,
    height: parts.reduce((sum, part) => sum + part.height, 0) + (parts.length - 1) * 10,
    render(x, y) {
      let top = y;
      const main = y + parts[0].rail, right = x + width;
      return parts.map((part, index) => {
        const startY = top, row = top + part.rail;
        top += part.height + 10;
        const join = right - pad;
        return <g key={index}>
          {track('M' + x + ' ' + main + 'C' + (x + 16) + ' ' + main + ' ' + (x + 12) + ' ' + row + ' ' + (x + pad) + ' ' + row)}
          {part.render(x + pad, startY)}
          {line(x + pad + part.width, row, width - pad * 2 - part.width)}
          {track('M' + join + ' ' + row + 'C' + (right - 12) + ' ' + row + ' ' + (right - 16) + ' ' + main + ' ' + right + ' ' + main)}
        </g>;
      });
    },
  };
}

function selectNode(node: ExpressionNode, onPick: (node: ExpressionNode) => void, label: string) {
  return {
    'aria-label': label,
    role: 'button',
    tabIndex: 0,
    onClick: () => onPick(node),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPick(node); }
    },
  };
}

function layout(node: ExpressionNode, pattern: string, t: Translate, onPick: (node: ExpressionNode) => void, active?: string): Shape {
  const descend = (child: ExpressionNode) => layout(child, pattern, t, onPick, active);
  const label = describeNode(node, t), picked = nodeKey(node) === active;
  if (node.kind === 'pattern') return branches(node.children.map(descend));
  if (node.kind === 'sequence') return sequence(node.children.map(descend));
  if (node.kind === 'capture' || node.kind === 'group' || (node.kind === 'assertion' && node.children.length)) {
    const child = branches(node.children.map(descend));
    const padding = 13, width = Math.max(child.width + padding * 2, label.length * 9 + 22);
    return {
      width, height: child.height + 35, rail: child.rail + 25,
      render: (x, y) => <g className={node.group ? captureColor(node.group) : undefined}>
        <g {...selectNode(node, onPick, label)} className={s.diagramNode} data-active={picked || undefined}>
          <rect className={s.enclosure} x={x + 1} y={y + 1} width={width - 2} height={child.height + 33} rx="8" />
          <title>{label}</title>
          <text x={x + padding} y={y + 17} className={s.diagramCaption}>{label}</text>
        </g>
        {line(x, y + child.rail + 25, padding)}
        {child.render(x + padding, y + 25)}
        {line(x + padding + child.width, y + child.rail + 25, width - padding - child.width)}
      </g>,
    };
  }
  if (node.kind === 'quantifier') {
    const child = descend(node.children[0]), optional = node.min === 0, repeated = (node.max ?? 0) > 1;
    const padding = 18, upper = optional ? 18 : 0, width = Math.max(child.width + padding * 2, label.length * 7 + 32);
    return {
      width, height: child.height + upper + (repeated ? 38 : 24), rail: child.rail + upper,
      render(x, y) {
        const rail = y + child.rail + upper, right = x + width, lower = y + upper + child.height + 7;
        return <g>
          {optional && track('M' + x + ' ' + rail + 'q12 0 12 -12v-5h' + (width - 24) + 'v5q0 12 12 12')}
          {repeated && track('M' + (right - 4) + ' ' + rail + 'q-12 0 -12 14V' + lower + 'H' + (x + 16) + 'v-' + (lower - rail - 14) + 'q0 -14 -12 -14')}
          {line(x, rail, padding)}
          {child.render(x + padding, y + upper)}
          {line(x + padding + child.width, rail, width - padding - child.width)}
          <text className={s.diagramQuantifier} x={x + width / 2} y={y + upper + child.height + (repeated ? 25 : 15)}
            textAnchor="middle" {...selectNode(node, onPick, label)}>{label}</text>
        </g>;
      },
    };
  }
  const raw = pattern.slice(node.from, Math.min(node.to, node.from + 25));
  const display = (raw === ' ' ? '␠' : raw) + (node.to - node.from > 25 ? '…' : '');
  const width = Math.max(32, Array.from(display).length * 9 + 18);
  return {
    width, height: 34, rail: 17,
    render: (x, y) => <g className={s.diagramNode} data-active={picked || undefined}
      {...selectNode(node, onPick, label + ' ' + display)}>
      <title>{label + ' ' + display}</title>
      <rect x={x} y={y} width={width} height="34" rx="7" />
      <text className={s.diagramToken} x={x + width / 2} y={y + 22} textAnchor="middle">{display}</text>
    </g>,
  };
}

function DiagramView({ shape, t, expand }: { shape: Shape; t: Translate; expand?: ReactNode }) {
  const view = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState(400), [zoom, setZoom] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const width = shape.width + 64, height = shape.height + 36;
  const scale = zoom ?? Math.min(1, Math.max(1, space - 24) / width);
  useEffect(() => {
    const element = view.current!;
    const update = () => setSpace(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element) || event.target.closest('[role="button"]')) return;
    const target = event.currentTarget;
    drag.current = { x: event.clientX, y: event.clientY, left: target.scrollLeft, top: target.scrollTop };
    target.setPointerCapture(event.pointerId);
  };
  return <>
    <div className={s.diagramPane} ref={view} tabIndex={0} aria-label={t('滚动查看结构图', 'Pan the diagram')}
      onPointerDown={start} onLostPointerCapture={() => { drag.current = null; }}
      onPointerMove={event => {
        if (drag.current) {
          event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
          event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
        }
      }}>
      <svg data-regex-railroad width={width * scale} height={height * scale} viewBox={'0 0 ' + width + ' ' + height}
        aria-label={t('正则表达式铁路图', 'Regular expression railroad diagram')}>
        <circle cx="13" cy={18 + shape.rail} r="4" className={s.endpoint} />
        {line(17, 18 + shape.rail, 15)}
        {shape.render(32, 18)}
        {line(width - 32, 18 + shape.rail, 15)}
        <circle cx={width - 13} cy={18 + shape.rail} r="4" className={s.endpoint} />
      </svg>
    </div>
    <div className={s.actions}>
      <IconButton size="sm" label={t('缩小', 'Zoom out')} variant="ghost" onClick={() => setZoom(Math.max(.05, scale / 1.3))}><MinusIcon /></IconButton>
      <Button size="sm" variant="ghost" onClick={() => { setZoom(null); view.current?.scrollTo(0, 0); }}>{t('适应', 'Fit')}</Button>
      <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>100%</Button>
      <IconButton size="sm" label={t('放大', 'Zoom in')} variant="ghost" onClick={() => setZoom(Math.min(4, scale * 1.3))}><PlusIcon /></IconButton>
      {expand}
    </div>
  </>;
}

export function Railroad({ root, pattern, t, onPick, active }: {
  root: ExpressionNode; pattern: string; t: Translate; onPick: (node: ExpressionNode) => void; active?: string;
}) {
  const [open, setOpen] = useState(false);
  const shape = useMemo(() => layout(root, pattern, t, onPick, active), [root, pattern, t, onPick, active]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <DiagramView shape={shape} t={t} expand={<Dialog.Trigger render={<IconButton size="sm" variant="ghost"
      label={t('放大查看结构图', 'Expand diagram')}><ArrowsOutIcon /></IconButton>} />} />
    <Dialog.Portal>
      <Dialog.Backdrop className={s.backdrop} />
      <Dialog.Popup className={s.diagramDialog}>
        <div className={s.bar}>
          <Dialog.Title>{t('表达式结构图', 'Railroad diagram')}</Dialog.Title>
          <Dialog.Close render={<IconButton size="sm" variant="ghost" label={t('关闭', 'Close')}><XIcon /></IconButton>} />
        </div>
        <DiagramView shape={shape} t={t} />
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
