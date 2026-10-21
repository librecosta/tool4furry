import { useEffect, useRef, useState, type PointerEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowCounterClockwiseIcon,
  FrameCornersIcon,
  MinusIcon,
  PlusIcon,
  ImageBrokenIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { tokens as t } from '../../styles/tokens.stylex';
import {
  clamp,
  constrain,
  fitScale,
  zoomAt,
  zoomRange,
  type PreviewPoint,
  type PreviewSize,
  type PreviewView,
} from './preview-geometry';

export interface ImagePreviewLabels {
  fit: string;
  actual: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  viewport: string;
  instructions: string;
  loading: string;
  error: string;
}
interface Props {
  src: string;
  width: number;
  height: number;
  alt: string;
  labels: ImagePreviewLabels;
  onError: () => void;
  onLoad?: () => void;
}

/** Native image rendering only. The caller owns the URL and supplies verified dimensions. */
export function ImagePreviewViewport({
  src,
  width,
  height,
  alt,
  labels,
  onError,
  onLoad,
}: Props) {
  const canvas = useRef<HTMLDivElement>(null);
  const size = useRef<PreviewSize>({ width: 1, height: 1 });
  const current = useRef<PreviewView>({ scale: 1, x: 0, y: 0 });
  const points = useRef(new Map<number, PreviewPoint>());
  const [view, setView] = useState(current.current);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = { width, height };
  const update = (next: PreviewView) => {
    current.current = constrain(next, image, size.current);
    setView(current.current);
  };
  const fit = () =>
    update({ scale: fitScale(image, size.current), x: 0, y: 0 });
  const zoom = (scale: number, anchor = { x: 0, y: 0 }) => {
    const range = zoomRange(fitScale(image, size.current));
    update(zoomAt(current.current, clamp(scale, range.min, range.max), anchor));
  };
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    fit();
  }, [src, width, height]);
  useEffect(() => {
    const element = canvas.current!;
    const releasePointers = () => {
      for (const id of points.current.keys())
        if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
      points.current.clear();
    };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (
        size.current.width === rect.width &&
        size.current.height === rect.height
      )
        return;
      size.current = { width: rect.width, height: rect.height };
      releasePointers();
      fit();
    };
    resize();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(resize);
    observer?.observe(element);
    if (!observer) window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      releasePointers();
    };
  }, [src, width, height]);
  useEffect(() => {
    const element = canvas.current!;
    if (!loaded || failed) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoom(current.current.scale * Math.exp(-clamp(delta, -240, 240) * 0.002), {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [loaded, failed, width, height]);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!points.current.has(event.pointerId)) return;
    const before = [...points.current.values()].slice(0, 2);
    const previous = points.current.get(event.pointerId)!;
    const next = point(event);
    points.current.set(event.pointerId, next);
    const after = [...points.current.values()].slice(0, 2);
    if (before.length === 2) {
      const center = (pair: PreviewPoint[]) => ({
        x: (pair[0].x + pair[1].x) / 2,
        y: (pair[0].y + pair[1].y) / 2,
      });
      const distance = (pair: PreviewPoint[]) =>
        Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
      const a = center(before),
        b = center(after);
      const range = zoomRange(fitScale(image, size.current));
      const scale = clamp(
        (current.current.scale * distance(after)) /
          Math.max(1, distance(before)),
        range.min,
        range.max,
      );
      const transformed = zoomAt(current.current, scale, a);
      update({
        ...transformed,
        x: transformed.x + b.x - a.x,
        y: transformed.y + b.y - a.y,
      });
    } else
      update({
        ...current.current,
        x: current.current.x + next.x - previous.x,
        y: current.current.y + next.y - previous.y,
      });
  };
  const range = zoomRange(fitScale(image, size.current));
  const disabled = !loaded || failed;
  return (
    <div {...stylex.props(s.viewer)}>
      <div
        ref={canvas}
        tabIndex={0}
        role="region"
        aria-label={labels.viewport}
        aria-description={labels.instructions}
        data-image-preview-viewport
        {...stylex.props(s.canvas, loaded && !failed && s.interactive)}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          points.current.set(event.pointerId, point(event));
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={(event) => points.current.delete(event.pointerId)}
        onPointerCancel={(event) => points.current.delete(event.pointerId)}
        onLostPointerCapture={(event) => points.current.delete(event.pointerId)}
        onKeyDown={(event) => {
          if (disabled || event.altKey || event.ctrlKey || event.metaKey)
            return;
          const key = event.key;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key))
            update({
              ...current.current,
              x:
                current.current.x +
                (key === 'ArrowLeft' ? -40 : key === 'ArrowRight' ? 40 : 0),
              y:
                current.current.y +
                (key === 'ArrowUp' ? -40 : key === 'ArrowDown' ? 40 : 0),
            });
          else if (key === '+' || key === '=')
            zoom(current.current.scale * 1.25);
          else if (key === '-') zoom(current.current.scale / 1.25);
          else if (key === '0' || key === 'Home') fit();
          else if (key === '1') update({ scale: 1, x: 0, y: 0 });
          else return;
          event.preventDefault();
        }}
      >
        {!failed && (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            draggable={false}
            onLoad={() => {
              setLoaded(true);
              onLoad?.();
            }}
            onError={() => {
              setFailed(true);
              onError();
            }}
            {...stylex.props(
              s.image(width, height, view.x, view.y, view.scale),
              !loaded && s.loadingImage,
            )}
          />
        )}
        {failed ? (
          <div role="alert" {...stylex.props(s.feedback)}>
            <ImageBrokenIcon size={40} aria-hidden />
            <span>{labels.error}</span>
          </div>
        ) : (
          !loaded && (
            <p role="status" {...stylex.props(s.feedback)}>
              {labels.loading}
            </p>
          )
        )}
      </div>
      <div
        role="group"
        aria-label={labels.viewport}
        {...stylex.props(s.controls)}
      >
        <Tooltip content={labels.zoomOut}>
          <IconButton
            label={labels.zoomOut}
            variant="ghost"
            size="sm"
            disabled={disabled || view.scale <= range.min}
            onClick={() => zoom(current.current.scale / 1.25)}
          >
            <MinusIcon size={20} aria-hidden />
          </IconButton>
        </Tooltip>
        <span {...stylex.props(s.percentage)}>
          {Math.round(view.scale * 100)}%
        </span>
        <Tooltip content={labels.zoomIn}>
          <IconButton
            label={labels.zoomIn}
            variant="ghost"
            size="sm"
            disabled={disabled || view.scale >= range.max}
            onClick={() => zoom(current.current.scale * 1.25)}
          >
            <PlusIcon size={20} aria-hidden />
          </IconButton>
        </Tooltip>
        <Button
          size="sm"
          variant="ghost"
          aria-label={labels.actual}
          disabled={disabled}
          onClick={() => update({ scale: 1, x: 0, y: 0 })}
        >
          100%
        </Button>
        <Tooltip content={labels.fit}>
          <IconButton
            label={labels.fit}
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={fit}
          >
            <FrameCornersIcon size={20} aria-hidden />
          </IconButton>
        </Tooltip>
        <Tooltip content={labels.reset}>
          <IconButton
            label={labels.reset}
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={fit}
          >
            <ArrowCounterClockwiseIcon size={20} aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}

const s = stylex.create({
  viewer: {
    height: '100%',
    display: 'grid',
    gridTemplateRows: 'minmax(0, 1fr) auto',
    minHeight: 0,
    gap: t.space8,
  },
  canvas: {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    touchAction: 'none',
    backgroundColor: t.workspace,
    backgroundImage: `repeating-conic-gradient(${t.surfaceMuted} 0% 25%, transparent 0% 50%)`,
    backgroundSize: '16px 16px',
    borderRadius: t.radiusSm,
  },
  interactive: { cursor: { default: 'grab', ':active': 'grabbing' } },
  image: (
    width: number,
    height: number,
    x: number,
    y: number,
    scale: number,
  ) => ({
    position: 'absolute',
    left: '50%',
    top: '50%',
    width,
    height,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
    transformOrigin: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    objectFit: 'contain',
  }),
  loadingImage: { opacity: 0 },
  feedback: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space12,
    padding: t.space16,
    margin: 0,
    textAlign: 'center',
    color: t.textSecondary,
    backgroundColor: t.workspace,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: t.space4,
  },
  percentage: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 13,
    color: t.textSecondary,
    fontVariantNumeric: 'tabular-nums',
  },
});
