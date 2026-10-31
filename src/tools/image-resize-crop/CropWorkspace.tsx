import { useEffect, useRef, useState, type PointerEvent } from 'react';
import ReactCrop from 'react-image-crop';
import * as stylex from '@stylexjs/stylex';
import { motion } from '../../styles/motion';
import {
  ArrowCounterClockwiseIcon, ArrowsOutIcon, FrameCornersIcon,
  HandIcon, MinusIcon, NumberSquareOneIcon, PlusIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { clamp, constrain, fitScale, zoomAt, zoomRange, type PreviewPoint, type PreviewSize, type PreviewView } from '../image/preview-geometry';
import { aspects, fromPercent, toPercent } from './geometry';
import { CompositionPreview, compositionBitmapSize } from './CompositionPreview';
import type { ResizeView } from './session';
import type { ResizeMessages } from './ParameterControls';
import { cropWorkspaceStyles as s } from './crop-workspace.styles';
import './crop.css';

export type CropDisplay = 'crop' | 'preview';
export interface CropWorkspaceProps {
  view: ResizeView;
  url: string;
  t: ResizeMessages;
  display: CropDisplay;
  onDisplay: (display: CropDisplay) => void;
  hand: boolean;
  onHand: (hand: boolean) => void;
  focused?: boolean;
  focusButtonId: string;
  onFocus: () => void;
  onCrop: (crop: NonNullable<ResizeView['crop']>) => void;
  onReset: () => void;
}

// Reserve room for handles even when the bitmap fills the viewport.
const inset = 24;
const center = (pair: PreviewPoint[]) => ({ x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 });
const distance = (pair: PreviewPoint[]) => Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);

/** View state only. Source-pixel Crop remains controlled by ResizeSession. */
export function CropWorkspace({ view, url, t, display, onDisplay, hand, onHand, focused, focusButtonId, onFocus, onCrop, onReset }: CropWorkspaceProps) {
  const { source, crop, output } = view;
  const viewport = useRef<HTMLDivElement>(null);
  const sizes = useRef<Record<CropDisplay, PreviewSize>>({ crop: {width: 1, height: 1}, preview: {width: 1, height: 1} });
  const available = useRef<PreviewSize>({ width: 1, height: 1 });
  const cameras = useRef<Partial<Record<CropDisplay, PreviewView>>>({});
  const points = useRef(new Map<number, PreviewPoint>());
  const blocked = useRef(false);
  const [blockedCrop, setBlockedCrop] = useState(false);
  const [cropGeneration, setCropGeneration] = useState(0);
  const [, repaint] = useState(0);
  const [bitmap, setBitmap] = useState<PreviewSize>();
  const [failed, setFailed] = useState(false);
  const viewOnly = hand || display === 'preview';
  const gestureMode = useRef(viewOnly);
  gestureMode.current = viewOnly;
  const previewSize = compositionBitmapSize(output);
  sizes.current = { crop: bitmap ?? source ?? {width: 1, height: 1}, preview: previewSize };
  const fitView = (mode: CropDisplay): PreviewView => ({ scale: fitScale(sizes.current[mode], available.current), x: 0, y: 0 });
  const current = () => cameras.current[display] ?? fitView(display);
  const update = (next: PreviewView) => {
    cameras.current[display] = constrain(next, sizes.current[display], available.current);
    repaint(n => n + 1);
  };
  const fit = (mode: CropDisplay = display) => {
    cameras.current[mode] = fitView(mode);
    repaint(n => n + 1);
  };
  const zoom = (scale: number, anchor = { x: 0, y: 0 }) => {
    // Keep the geometry fixed throughout an active crop/pointer gesture.
    if (points.current.size) return;
    const range = zoomRange(fitScale(sizes.current[display], available.current));
    update(zoomAt(current(), clamp(scale, range.min, range.max), anchor));
  };
  const release = () => {
    const element = viewport.current;
    for (const id of points.current.keys()) {
      if (element?.hasPointerCapture?.(id)) element.releasePointerCapture(id);
    }
    points.current.clear();
    blocked.current = false;
  };
  const cancelCrop = () => {
    // Unmount only the gesture adapter: ReactCrop removes its document listeners.
    // No synthetic crop commit, Session reset, or output invalidation is needed.
    setCropGeneration(n => n + 1);
  };
  useEffect(() => { fit('crop'); }, [bitmap?.width, bitmap?.height]);
  useEffect(() => { fit('preview'); }, [previewSize.width, previewSize.height]);
  useEffect(() => {
    const element = viewport.current!;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const width = Math.max(1, rect.width - inset * 2), height = Math.max(1, rect.height - inset * 2);
      if (available.current.width === width && available.current.height === height) return;
      release();
      setBlockedCrop(false);
      cancelCrop();
      available.current = { width, height };
      fit('crop');
      fit('preview');
    };
    const cancel = () => { release(); setBlockedCrop(false); cancelCrop(); };
    // ReactCrop's document listener does not filter pointer IDs. Stop its own
    // adapter before a second/outside pointer can affect the first drag.
    const blockForeignPointer = (event: globalThis.PointerEvent) => {
      if (!blocked.current && !gestureMode.current && points.current.size && !points.current.has(event.pointerId)) {
        blocked.current = true;
        setBlockedCrop(true);
        cancelCrop();
      }
    };
    const outsideDown = (event: globalThis.PointerEvent) => {
      if (!element.contains(event.target as Node)) blockForeignPointer(event);
    };
    const visibility = () => { if (document.hidden) cancel(); };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    resize();
    observer?.observe(element);
    window.addEventListener('resize', resize);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerdown', outsideDown, true);
    document.addEventListener('pointermove', blockForeignPointer, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', outsideDown, true);
      document.removeEventListener('pointermove', blockForeignPointer, true);
      release();
    };
  }, []);
  useEffect(() => {
    const element = viewport.current!;
    const wheel = (event: WheelEvent) => {
      if ((!focused && !event.ctrlKey && !event.metaKey) || !bitmap || failed || !event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      if (points.current.size) return;
      const rect = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoom(current().scale * Math.exp(-clamp(delta, -240, 240) * 0.002), {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      });
    };
    element.addEventListener('wheel', wheel, {passive: false});
    return () => element.removeEventListener('wheel', wheel);
  }, [display, focused, bitmap, failed, previewSize.width, previewSize.height]);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2};
  };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    points.current.delete(event.pointerId);
    if (!points.current.size) { blocked.current = false; setBlockedCrop(false); }
  };
  const camera = current();
  const size = sizes.current[display];
  const range = zoomRange(fitScale(size, available.current));
  const disabled = !bitmap || failed || view.status === 'loading';
  // A rounded bounded bitmap may have a slightly different aspect. Express
  // the fixed source-pixel ratio in the actual DOM media plane.
  const sourceAspect = aspects[view.aspect];
  const cropAspect = source && sourceAspect
    ? sourceAspect * sizes.current.crop.width * source.height / (sizes.current.crop.height * source.width)
    : undefined;
  const tools = [
    { label: t.preview.viewer.zoomIn, icon: PlusIcon, action: () => zoom(current().scale * 1.25), disabled: disabled || camera.scale >= range.max },
    { label: t.preview.viewer.zoomOut, icon: MinusIcon, action: () => zoom(current().scale / 1.25), disabled: disabled || camera.scale <= range.min },
    { label: t.preview.viewer.fit, icon: FrameCornersIcon, action: () => { if (!points.current.size) fit(); }, disabled },
    { label: t.bitmapActual, icon: NumberSquareOneIcon, action: () => zoom(1), disabled },
  ];
  if (!source || !crop) return null;
  return (
    <div data-crop-workspace {...stylex.props(s.workspace, focused && s.focusedWorkspace)}>
      <div {...stylex.props(s.top)}>
        <div role="group" aria-label={t.cropViews} {...stylex.props(s.modes)}>
          {(['crop', 'preview'] as const).map(mode => (
            <Button key={mode} variant="ghost" size="sm" aria-pressed={display === mode} xstyle={[s.mode, motion.selection, display === mode && s.selected]} onClick={() => onDisplay(mode)}>
              {mode === 'crop' ? t.cropView : t.previewView}
            </Button>
          ))}
        </div>
        <Tooltip content={t.full}>
          <IconButton variant="ghost" label={t.full} xstyle={s.tool} disabled={view.status === 'loading'} onClick={onReset}><ArrowCounterClockwiseIcon size={19}/></IconButton>
        </Tooltip>
      </div>
      <div {...stylex.props(s.body)}>
        <p {...stylex.props(s.guide)}>
          {display === 'preview' ? <span>{t.compositionNote}</span> : hand ? <span>{t.panHint}</span> : <><span>{t.moveHint}</span><span>{t.resizeHint}</span></>}
        </p>
        <div
          ref={viewport}
          data-crop-viewport
          role="region"
          aria-label={t.cropCanvas}
          aria-description={t.instructions}
          tabIndex={0}
          {...stylex.props(s.canvas, focused && s.focusedCanvas, viewOnly && s.hand)}
          onPointerDownCapture={event => {
            if (disabled || event.button !== 0) { event.stopPropagation(); return; }
            points.current.set(event.pointerId, point(event));
            event.currentTarget.setPointerCapture?.(event.pointerId);
            if (viewOnly) {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.focus({preventScroll: true});
            } else if (points.current.size > 1 || blocked.current) {
              event.preventDefault();
              event.stopPropagation();
              blocked.current = true;
              setBlockedCrop(true);
              cancelCrop();
            }
          }}
          onPointerMoveCapture={event => {
            if (!viewOnly || !points.current.has(event.pointerId)) return;
            const before = [...points.current.values()].slice(0, 2);
            const previous = points.current.get(event.pointerId)!;
            const next = point(event);
            points.current.set(event.pointerId, next);
            const after = [...points.current.values()].slice(0, 2);
            if (before.length === 2) {
              const a = center(before), b = center(after);
              const transformed = zoomAt(current(), clamp(current().scale * distance(after) / Math.max(1, distance(before)), range.min, range.max), a);
              update({...transformed, x: transformed.x + b.x - a.x, y: transformed.y + b.y - a.y});
            } else update({...current(), x: current().x + next.x - previous.x, y: current().y + next.y - previous.y});
          }}
          onPointerUpCapture={finish}
          onPointerCancel={event => { cancelCrop(); finish(event); }}
          onLostPointerCapture={finish}
          onKeyDown={event => {
            if (event.target !== event.currentTarget || disabled || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === '+' || event.key === '=') zoom(current().scale * 1.25);
            else if (event.key === '-') zoom(current().scale / 1.25);
            else if (event.key === '0') { if (!points.current.size) fit(); }
            else if (event.key === '1') zoom(1);
            else if (viewOnly && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
              update({...current(), x: current().x + (event.key === 'ArrowLeft' ? -40 : event.key === 'ArrowRight' ? 40 : 0), y: current().y + (event.key === 'ArrowUp' ? -40 : event.key === 'ArrowDown' ? 40 : 0)});
            } else return;
            event.preventDefault();
          }}
        >
          <div
            data-crop-plane
            inert={hand && display === 'crop' ? true : undefined}
            {...stylex.props(s.plane, viewOnly && s.handPlane)}
            style={{width: size.width * camera.scale, height: size.height * camera.scale, marginLeft: camera.x, marginTop: camera.y}}
          >
            {display === 'crop' ? (
              <ReactCrop
                key={cropGeneration}
                style={{width: '100%', height: '100%', maxWidth: 'none'}}
                crop={toPercent(crop, source)}
                aspect={cropAspect}
                keepSelection ruleOfThirds ariaLabels={t.handles}
                disabled={disabled || hand || blockedCrop}
                onChange={(_, percent) => {
                  if (!blocked.current && !hand && percent.width > 0 && percent.height > 0) onCrop(fromPercent(percent, source));
                }}
              >
                <img src={url} alt={source.file.name} draggable={false} {...stylex.props(s.image)}/>
              </ReactCrop>
            ) : <CompositionPreview view={view} url={url} t={t}/>}
          </div>
          {failed && <p role="alert" {...stylex.props(s.status, s.error)}>{t.preview.viewer.error}</p>}
        </div>
        <div role="toolbar" aria-label={t.viewControls} {...stylex.props(s.tools)}>
          {tools.map(tool => <Tooltip key={tool.label} content={tool.label}>
            <IconButton variant="ghost" label={tool.label} xstyle={s.tool} disabled={tool.disabled} onClick={tool.action}><tool.icon size={20}/></IconButton>
          </Tooltip>)}
          <Tooltip content={t.handMode}>
            <IconButton variant="ghost" label={t.handMode} aria-pressed={hand} xstyle={[s.tool, motion.selection, hand && s.selected]} onClick={() => onHand(!hand)}><HandIcon size={20}/></IconButton>
          </Tooltip>
          {!focused && <Tooltip content={t.focusEdit}>
            <IconButton id={focusButtonId} variant="ghost" label={t.focusEdit} xstyle={s.tool} onClick={onFocus}><ArrowsOutIcon size={20}/></IconButton>
          </Tooltip>}
        </div>
      </div>
      <div {...stylex.props(s.summary)}>
        <span>{t.source}: {source.width} × {source.height}</span>
        <span>{t.crop}: {crop.width} × {crop.height}</span>
        <span title={t.bitmapActual}>{t.viewZoom}: {Math.round(camera.scale * 100)}%</span>
      </div>
      <img hidden src={url} alt="" onLoad={event => {
        const image = event.currentTarget;
        if (image.naturalWidth && image.naturalHeight) {
          setBitmap(previous => previous?.width === image.naturalWidth && previous.height === image.naturalHeight ? previous : {width: image.naturalWidth, height: image.naturalHeight});
          setFailed(false);
        }
      }} onError={() => setFailed(true)}/>
    </div>
  );
}
