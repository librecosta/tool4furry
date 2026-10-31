import { useEffect, useRef, useState, type PointerEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { samplePoint } from './palette';
import { styles as s } from './styles';
import type { Labels } from './messages';

export function ImageSampler({
  pixels,
  url,
  target,
  onPick,
  cancel,
  t,
}: {
  pixels: ImageData;
  url: string;
  target?: string;
  onPick: (id: string, hex: string) => void;
  cancel: () => void;
  t: Labels;
}) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    hex: string;
    left: number;
    top: number;
  }>();
  const lens = useRef<HTMLCanvasElement>(null);
  const pressed = useRef<number | undefined>(undefined);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setHover(undefined);
    pressed.current = undefined;
    if (!target) return;
    host.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [target, cancel]);
  useEffect(() => {
    const ctx = lens.current?.getContext('2d');
    if (!ctx || !hover) return;
    // A tiny raw-pixel neighborhood, not a new decode, Blob or quantization.
    ctx.clearRect(0, 0, 9, 9);
    const left = Math.max(0, hover.x - 4),
      top = Math.max(0, hover.y - 4);
    ctx.putImageData(
      pixels,
      4 - hover.x,
      4 - hover.y,
      left,
      top,
      Math.min(9, pixels.width - left),
      Math.min(9, pixels.height - top),
    );
  }, [hover, pixels]);
  const sample = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const point = samplePoint(
      pixels,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
    );
    const next = point
      ? {
          ...point,
          left: Math.max(
            4,
            Math.min(box.width - 92, event.clientX - box.left - 44),
          ),
          top: Math.max(4, event.clientY - box.top - 112),
        }
      : undefined;
    setHover(next);
    return next;
  };
  return (
    <div>
      <div
        ref={host}
        data-palette-sampler
        tabIndex={target ? 0 : undefined}
        role={target ? 'group' : undefined}
        aria-label={target ? t.picking : undefined}
        {...stylex.props(s.stage, !!target && s.picking)}
        onPointerMove={(e) => {
          if (
            target &&
            (e.pointerType === 'mouse' || pressed.current === e.pointerId)
          )
            sample(e);
        }}
        onPointerDown={(e) => {
          if (!target || e.button !== 0) return;
          e.preventDefault();
          pressed.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          sample(e);
        }}
        onPointerUp={(e) => {
          if (!target || pressed.current !== e.pointerId) return;
          const point = sample(e);
          pressed.current = undefined;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (point) onPick(target, point.hex);
        }}
        onPointerCancel={() => {
          pressed.current = undefined;
          setHover(undefined);
        }}
        onPointerLeave={() => {
          if (pressed.current === undefined) setHover(undefined);
        }}
      >
        <img src={url} alt="" draggable={false} {...stylex.props(s.image)} />
        {target && hover && (
          <div
            {...stylex.props(s.loupe)}
            style={{ left: hover.left, top: hover.top }}
            aria-hidden="true"
          >
            <canvas
              ref={lens}
              width={9}
              height={9}
              {...stylex.props(s.magnified)}
            />
            <span {...stylex.props(s.cross)} />
          </div>
        )}
      </div>
      <p {...stylex.props(s.muted)}>
        {target ? (
          <>
            <span aria-live="polite">{hover?.hex ?? t.picking}</span> ·{' '}
          </>
        ) : null}
        {t.precision}
      </p>
    </div>
  );
}
