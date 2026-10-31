import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowsOutIcon, FrameCornersIcon, HandIcon, MinusIcon, NumberSquareOneIcon, PlusIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { motion } from '../../styles/motion';
import { controls } from '../../styles/controls';
import { clamp, constrain, fitScale, zoomAt, zoomRange, type PreviewView, type PreviewSize } from '../image/preview-geometry';
import { samplePoint, type Swatch } from './palette';
import { styles as s } from './styles';
import type { Labels } from './messages';

/** Camera only. Sampling uses the already oriented, bounded preview pixels. */
export type SamplePreview = { id: string; hex: string; point: { x: number; y: number }; url: string };
export function ImageSampler({ pixels, url, target, selected, onPick, onPreview, cancel, t, colors = [], onTarget, onSelect }: {
  pixels: ImageData; url: string; target?: string;
  selected?: string;
  onPick: (id: string, hex: string, point: { x: number; y: number }) => void; cancel: () => void; t: Labels;
  onPreview?: (preview: SamplePreview | undefined) => void;
  colors?: readonly Swatch[]; onTarget?: (id: string) => void; onSelect?: (id: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const returning = useRef(false);
  const [hover, setHover] = useState<{ x: number; y: number; hex: string; left: number; top: number }>();
  const [, repaint] = useState(0);
  const host = useRef<HTMLDivElement>(null), lens = useRef<HTMLCanvasElement>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const bindHost = useCallback((node: HTMLDivElement | null) => { host.current = node; setElement(node); }, []);
  const focusId = useId(), done = useRef<HTMLButtonElement>(null);
  const camera = useRef<PreviewView | undefined>(undefined), autoFit = useRef(true);
  const size = useRef<PreviewSize>({ width: 1, height: 1 });
  const gesture = useRef<{ id: number; x: number; y: number; target?: string; url: string; kind: 'pan' | 'pick' | 'marker'; moved: boolean } | undefined>(undefined);
  const blocked = useRef(false);
  const current = () => camera.current ?? { scale: fitScale(pixels, size.current), x: 0, y: 0 };
  const update = (next: PreviewView) => { camera.current = constrain(next, pixels, size.current); repaint(n => n + 1); };
  const release = () => {
    const id = gesture.current?.id;
    gesture.current = undefined;
    if (id !== undefined && host.current?.hasPointerCapture?.(id)) host.current.releasePointerCapture(id);
    setHover(undefined);
  };
  const fit = () => { autoFit.current = true; update({ scale: fitScale(pixels, size.current), x: 0, y: 0 }); };
  const zoom = (scale: number, anchor = { x: 0, y: 0 }) => {
    if (gesture.current) return;
    autoFit.current = false;
    const range = zoomRange(fitScale(pixels, size.current));
    update(zoomAt(current(), clamp(scale, range.min, range.max), anchor));
    setHover(undefined);
  };
  useEffect(() => {
    release(); blocked.current = false;
    if (target && host.current) {
      if (!document.activeElement?.matches(':focus-visible')) host.current.dataset.pointerFocus = '';
      host.current.focus({ preventScroll: true });
    }
  }, [target, element]);
  useEffect(() => {
    const id = gesture.current?.kind === 'marker' ? gesture.current.target : target;
    onPreview?.(hover && id ? { id, hex: hover.hex, point: { x: hover.x, y: hover.y }, url } : undefined);
  }, [hover, target, url, onPreview]);
  useEffect(() => () => onPreview?.(undefined), [onPreview]);
  useEffect(() => {
    release(); camera.current = undefined; autoFit.current = true; setFocused(false); setOpen(false);
  }, [url, pixels]);
  useEffect(() => {
    if (!focused && returning.current) { returning.current = false; document.getElementById(focusId)?.focus({ preventScroll: true }); }
  }, [focused, focusId]);
  useEffect(() => {
    if (!element) return;
    const resize = () => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // CSS layout size stays stable during the dialog's scale reveal.
      const css = getComputedStyle(element);
      release(); size.current = { width: parseFloat(css.width) || box.width, height: parseFloat(css.height) || box.height };
      if (autoFit.current) fit(); else update(current());
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    observer?.observe(element);
    window.addEventListener('resize', resize);
    const cancelGesture = () => { release(); blocked.current = false; };
    const visibility = () => { if (document.hidden) cancelGesture(); };
    window.addEventListener('blur', cancelGesture);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('blur', cancelGesture); document.removeEventListener('visibilitychange', visibility); release(); };
  }, [element, pixels]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (!target && !gesture.current)) return;
      // First Escape exits sampling, second can close the focus dialog.
      event.preventDefault(); event.stopPropagation(); release(); cancel();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [target, cancel]);
  useEffect(() => {
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if ((!focused && !event.ctrlKey && !event.metaKey) || !event.deltaY) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoom(current().scale * Math.exp(-clamp(delta, -240, 240) * 0.002), { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [element, focused, pixels]);
  useEffect(() => {
    const ctx = lens.current?.getContext('2d');
    if (!ctx || !hover) return;
    ctx.clearRect(0, 0, 9, 9);
    const left = Math.max(0, hover.x - 4), top = Math.max(0, hover.y - 4);
    ctx.putImageData(pixels, 4 - hover.x, 4 - hover.y, left, top, Math.min(9, pixels.width - left), Math.min(9, pixels.height - top));
  }, [hover, pixels]);
  const sample = (event: PointerEvent<HTMLElement>) => {
    const box = host.current!.getBoundingClientRect(), view = current();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    if (x < 0 || y < 0 || x >= box.width || y >= box.height) { setHover(undefined); return; }
    const point = samplePoint(pixels, (x / box.width * size.current.width - size.current.width / 2 - view.x) / view.scale + pixels.width / 2, (y / box.height * size.current.height - size.current.height / 2 - view.y) / view.scale + pixels.height / 2, pixels);
    const next = point ? { ...point, left: clamp(x - 44, 4, Math.max(4, box.width - 92)), top: y >= 120 ? y - 116 : Math.min(box.height - 116, y + 32) } : undefined;
    setHover(next); return next;
  };
  const view = current(), range = zoomRange(fitScale(pixels, size.current));
  const tools = [
    { label: t.zoomIn, icon: PlusIcon, run: () => zoom(current().scale * 1.25), disabled: view.scale >= range.max },
    { label: t.zoomOut, icon: MinusIcon, run: () => zoom(current().scale / 1.25), disabled: view.scale <= range.min },
    { label: t.fit, icon: FrameCornersIcon, run: () => { if (!gesture.current) fit(); } },
    { label: t.actual, icon: NumberSquareOneIcon, run: () => zoom(1) },
  ];
  const workspace = () => <div {...stylex.props(s.workspace, focused && s.focusedWorkspace)}>
    {focused && onTarget && <div role="group" aria-label={t.palette} {...stylex.props(s.toolbar)}>{colors.map((color, index) => <Tooltip key={color.id} content={`${t.pick} ${index + 1} · ${color.hex}`}><IconButton variant="ghost" label={`${t.pick} ${index + 1}`} aria-pressed={target === color.id} xstyle={[s.tool, motion.selection, target === color.id && s.selected]} onClick={() => onTarget(color.id)}><span {...stylex.props(s.sampleColor)} style={{ backgroundColor: color.hex }}/></IconButton></Tooltip>)}</div>}
    <div {...stylex.props(s.workspaceBody, focused && s.focusedBody)}>
    <div {...stylex.props(s.viewTools)} role="toolbar" aria-label={t.viewControls}>
      {tools.map(tool => <Tooltip key={tool.label} content={tool.label}><IconButton variant="ghost" label={tool.label} xstyle={s.tool} disabled={tool.disabled} onClick={tool.run}><tool.icon size={20}/></IconButton></Tooltip>)}
      <Tooltip content={t.panHint}><IconButton variant="ghost" label={t.pan} aria-pressed={!target} xstyle={[s.tool, motion.selection, !target && s.selected]} onClick={() => { release(); cancel(); }}><HandIcon size={20}/></IconButton></Tooltip>
      {!focused && <Tooltip content={t.focus}><IconButton id={focusId} variant="ghost" label={t.focus} aria-haspopup="dialog" aria-expanded={open} xstyle={s.tool} onClick={() => { release(); setFocused(true); setOpen(true); }}><ArrowsOutIcon size={20}/></IconButton></Tooltip>}
      <span aria-hidden="true" {...stylex.props(s.zoomLabel)}>{Math.round(view.scale * 100)}%</span>
    </div>
    <div ref={bindHost} data-palette-sampler role="region" aria-label={t.workspace} aria-describedby={target ? `${focusId}-hint` : undefined} tabIndex={0}
      {...stylex.props(s.stage, controls.workspaceFocus, focused && s.focusedStage, !!target && s.picking)}
      onKeyDownCapture={event => { delete event.currentTarget.dataset.pointerFocus; }}
      onBlur={event => { delete event.currentTarget.dataset.pointerFocus; }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        if (gesture.current) { blocked.current = true; setHover(undefined); return; }
        // Page scrolling stays native on small screens outside the focus/pick mode.
        if (!target && !focused && event.pointerType === 'touch') return;
        blocked.current = false;
        event.preventDefault(); event.currentTarget.dataset.pointerFocus = ''; event.currentTarget.focus({ preventScroll: true });
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, target, url, kind: target ? 'pick' : 'pan', moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (target) sample(event);
      }}
      onPointerMove={event => {
        const drag = gesture.current;
        if (blocked.current) return;
        if (drag?.kind === 'marker' && drag.id === event.pointerId) {
          drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 3;
          if (drag.moved) sample(event);
        } else if (target) { if (event.pointerType === 'mouse' || drag?.id === event.pointerId) sample(event); }
        else if (drag?.id === event.pointerId && drag.kind === 'pan') {
          autoFit.current = false;
          update({ ...current(), x: current().x + event.clientX - drag.x, y: current().y + event.clientY - drag.y });
          drag.x = event.clientX; drag.y = event.clientY;
        }
      }}
      onPointerUp={event => {
        const drag = gesture.current;
        if (drag?.id !== event.pointerId) return;
        const valid = !blocked.current && drag.url === url && drag.target && (drag.kind === 'marker' ? drag.moved && colors.some(color => color.id === drag.target) : drag.kind === 'pick' && drag.target === target);
        const point = valid ? sample(event) : undefined;
        release(); blocked.current = false;
        if (point && drag.target) onPick(drag.target, point.hex, { x: point.x, y: point.y });
      }}
      onPointerCancel={() => { release(); blocked.current = false; }}
      onLostPointerCapture={() => { gesture.current = undefined; setHover(undefined); }}
      onPointerLeave={() => { if (!gesture.current) setHover(undefined); }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === '+' || event.key === '=') zoom(current().scale * 1.25);
        else if (event.key === '-') zoom(current().scale / 1.25);
        else if (event.key === '0') fit();
        else if (event.key === '1') zoom(1);
        else if (!target && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { autoFit.current = false; update({ ...current(), x: current().x + (event.key === 'ArrowLeft' ? -40 : event.key === 'ArrowRight' ? 40 : 0), y: current().y + (event.key === 'ArrowUp' ? -40 : event.key === 'ArrowDown' ? 40 : 0) }); }
        else return;
        event.preventDefault();
      }}>
      <div data-palette-plane {...stylex.props(s.plane)} style={{ width: pixels.width * view.scale, height: pixels.height * view.scale, marginLeft: view.x, marginTop: view.y }}><img src={url} alt="" draggable={false} {...stylex.props(s.image)}/></div>
      {colors.map((color, index) => {
        const dragging = gesture.current?.kind === 'marker' && gesture.current.target === color.id;
        const active = (selected ?? target) === color.id;
        const previewing = !!hover && (dragging ? gesture.current?.moved : gesture.current?.kind !== 'marker' && target === color.id);
        const point = previewing ? hover : color.point;
        if (!point) return null;
        const left = size.current.width / 2 + view.x + (point.x + 0.5 - pixels.width / 2) * view.scale;
        const top = size.current.height / 2 + view.y + (point.y + 0.5 - pixels.height / 2) * view.scale;
        if (left < 0 || top < 0 || left > size.current.width || top > size.current.height) return null;
        return <button key={color.id} type="button" data-color-marker={color.id} aria-label={`${t.selectColor} ${index + 1} · ${color.hex}`} aria-pressed={active}
          {...stylex.props(s.marker)} style={{ left, top }} onClick={() => onSelect?.(color.id)}
          onPointerDown={event => {
            event.stopPropagation();
            if (event.button !== 0) return;
            if (gesture.current) { blocked.current = true; setHover(undefined); return; }
            event.preventDefault(); setHover(undefined); onSelect?.(color.id);
            if (host.current) { host.current.dataset.pointerFocus = ''; host.current.focus({ preventScroll: true }); }
            blocked.current = false;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, target: color.id, url, kind: 'marker', moved: false };
            host.current?.setPointerCapture?.(event.pointerId);
          }}>
          <span {...stylex.props(s.markerDot, active && s.markerSelected)} style={{ backgroundColor: previewing ? hover!.hex : color.hex }}/>
        </button>;
      })}
      {(target || gesture.current?.kind === 'marker') && hover && <div aria-hidden="true"><div {...stylex.props(s.loupe)} style={{ left: hover.left, top: hover.top }}><canvas ref={lens} width={9} height={9} {...stylex.props(s.magnified)}/><span {...stylex.props(s.cross)}/></div><span {...stylex.props(s.sampleLabel)} style={{ left: hover.left, top: hover.top + 92 }}>{hover.hex}</span></div>}
    </div>
    </div>
    {target && <div {...stylex.props(s.row)}><p id={`${focusId}-hint`} role="status" {...stylex.props(s.muted, s.grow)}>{t.picking}</p><Button variant="ghost" size="sm" onClick={() => { release(); cancel(); }}>{t.cancel}</Button></div>}
  </div>;
  return <Dialog.Root open={open} onOpenChange={next => { release(); setOpen(next); if (next) setFocused(true); }} onOpenChangeComplete={next => { if (!next) { returning.current = true; setFocused(false); } }}>
    {focused ? <div aria-hidden="true" {...stylex.props(s.placeholder)}/> : workspace()}
    <Dialog.Portal>
      <Dialog.Backdrop {...stylex.props(s.backdrop, motion.backdrop)}/>
      <Dialog.Popup initialFocus={done} finalFocus={false} {...stylex.props(s.dialog, s.focusDialog, motion.dialog)}>
        <header {...stylex.props(s.row)}><Dialog.Title {...stylex.props(s.heading, s.grow)}>{t.focus}</Dialog.Title><Dialog.Close render={<Button ref={done} variant="ghost"/>}>{t.close}</Dialog.Close></header>
        {focused && workspace()}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
