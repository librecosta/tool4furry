import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowsOutIcon, ArrowsInIcon, MinusIcon, PlusIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { clamp, constrain, fitScale, zoomAt, zoomRange, type PreviewView } from '../image/preview-geometry';
import type { Size } from './core';
import s from './studio.module.scss';

export type Translate = (zh: string, en: string) => string;
export type Backdrop = 'grid' | 'light' | 'dark';
export type ViewMode = 'original' | 'result' | 'compare' | 'side';
export interface Picture extends Size { url: string; alt: string }

export function Choice<T extends string | number>({ value, items, label, onChange, className }: {
  value: T;
  items: readonly { value: T; label: string; disabled?: boolean }[];
  label: string;
  onChange: (value: T) => void;
  className?: string;
}) {
  return <div role="group" aria-label={label} className={[s.choice, className].filter(Boolean).join(' ')}>
    {items.map(item => <Button key={item.value} size="sm" variant="ghost" disabled={item.disabled} aria-pressed={value === item.value}
      onClick={() => onChange(item.value)}>{item.label}</Button>)}
  </div>;
}

export function BackgroundChoice({ t, value, onChange }: { t: Translate; value: Backdrop; onChange: (value: Backdrop) => void }) {
  return <Choice value={value} label={t('预览背景', 'Preview background')} onChange={onChange} items={[
    { value: 'grid', label: t('透明网格', 'Checkerboard') }, { value: 'light', label: t('白色', 'White') },
    { value: 'dark', label: t('深色', 'Dark') },
  ]} />;
}

export function Preview({ t, original, result, mode, background, pixelated, status, onError }: {
  t: Translate;
  original?: Picture;
  result?: Picture;
  mode: ViewMode;
  background: Backdrop;
  pixelated?: boolean;
  status?: string;
  onError?: () => void;
}) {
  const shell = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<Size>({ width: 1, height: 1 });
  const [view, setView] = useState<PreviewView>();
  const [divider, setDivider] = useState(50);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const pan = useRef<{ id: number; x: number; y: number; view: PreviewView } | undefined>(undefined);
  const picture = (mode === 'original' ? original : mode === 'result' ? result : original ?? result);
  const viewport = { width: Math.max(1, available.width / (mode === 'side' && result && original ? 2 : 1)), height: available.height };
  const image = picture ?? { width: 1, height: 1 };
  const scale = fitScale(image, { width: Math.max(1, viewport.width - 36), height: Math.max(1, viewport.height - 36) });
  const current = constrain(view ?? { scale, x: 0, y: 0 }, image, viewport);
  const setZoom = (zoom: number, anchor = { x: 0, y: 0 }) => {
    const range = zoomRange(scale);
    setView(constrain(zoomAt(current, clamp(zoom, range.min, range.max), anchor), image, viewport));
  };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setAvailable({ width, height });
    });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setError(false); }, [original?.url, result?.url]);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', change);
    const viewportElement = stage.current;
    const wheel = (event: WheelEvent) => {
      if (!picture) return;
      event.preventDefault();
      const box = viewportElement!.getBoundingClientRect();
      setZoom(current.scale * Math.exp(-event.deltaY * .0025), {
        x: mode === 'side' ? 0 : event.clientX - box.x - box.width / 2,
        y: event.clientY - box.y - box.height / 2,
      });
    };
    viewportElement?.addEventListener('wheel', wheel, { passive: false });
    return () => {
      document.removeEventListener('fullscreenchange', change);
      viewportElement?.removeEventListener('wheel', wheel);
    };
  });

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !picture || (event.target as HTMLElement).closest('button,input,[role=slider]')) return;
    pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view: current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = pan.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    setView(constrain({ scale: gesture.view.scale, x: gesture.view.x + event.clientX - gesture.x, y: gesture.view.y + event.clientY - gesture.y }, image, viewport));
  };
  const moveDivider = (event: PointerEvent<HTMLButtonElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (box) setDivider(clamp((event.clientX - box.x) / box.width * 100, 0, 100));
  };
  const comparison = (mode === 'side' || mode === 'compare') && result && original;
  const render = (item?: Picture) => item && (
    <img src={item.url} alt={item.alt} draggable={false} onError={() => { setError(true); onError?.(); }}
      style={{ width: item.width * current.scale, height: item.height * current.scale, transform: 'translate(' + current.x + 'px,' + current.y + 'px)' }} />
  );

  return <div ref={shell} className={s.viewer}>
    <div ref={stage} className={s.stage} data-background={background} data-pixelated={pixelated || undefined} data-svg-preview tabIndex={0}
      aria-label={t('图片查看区域', 'Image viewing area')}
      onPointerDown={startPan} onPointerMove={movePan}
      onPointerUp={() => { pan.current = undefined; }} onPointerCancel={() => { pan.current = undefined; }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget || !picture) return;
        const shift: Record<string, [number, number]> = { ArrowLeft: [-30, 0], ArrowRight: [30, 0], ArrowUp: [0, -30], ArrowDown: [0, 30] };
        if (event.key === '0') setView(undefined);
        else if (event.key === '1') setView({ scale: 1, x: 0, y: 0 });
        else if (event.key === '+' || event.key === '=') setZoom(current.scale * 1.3);
        else if (event.key === '-') setZoom(current.scale / 1.3);
        else if (event.key in shift) {
          const [x, y] = shift[event.key];
          setView(constrain({ ...current, x: current.x + x, y: current.y + y }, image, viewport));
        } else return;
        event.preventDefault();
      }}>
      {comparison && mode === 'side' ? <div className={s.side}>
        <div className={s.layer}>{render(original)}<span className={s.original}>{t('原图', 'Original')}</span></div>
        <div className={s.layer}>{render(result)}<span className={s.result}>{t('结果', 'Result')}</span></div>
      </div> : comparison ? <>
        <div className={s.layer} style={{ clipPath: 'inset(0 ' + (100 - divider) + '% 0 0)' }}>{render(original)}</div>
        <div className={s.layer} style={{ clipPath: 'inset(0 0 0 ' + divider + '%)' }}>{render(result)}</div>
        <span className={s.original}>{t('原图', 'Original')}</span><span className={s.result}>{t('结果', 'Result')}</span>
        <button aria-label={t('对比位置', 'Comparison position')} role="slider" type="button" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(divider)} className={s.compareHandle} style={{ '--divider': divider + '%' } as CSSProperties}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); moveDivider(event); }}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveDivider(event); }}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            setDivider(value => event.key === 'Home' ? 0 : event.key === 'End' ? 100 : clamp(value + (event.key === 'ArrowLeft' ? -5 : 5), 0, 100));
          }}>
          <span><CaretLeftIcon size={12}/><CaretRightIcon size={12}/></span>
        </button>
      </> : picture ? <div className={s.layer}>{render(picture)}</div> : <span className={s.empty}>{status ?? t('暂无预览', 'No preview yet')}</span>}
      {error && <span className={s.empty} role="status">{t('无法显示图片', 'Image preview could not be displayed')}</span>}
    </div>
    <div className={s.viewerBar}>
      <span className={s.info}>{picture ? status : ''}</span>
      <div className={s.compactActions}>
        <IconButton label={t('缩小', 'Zoom out')} variant="ghost" size="sm" disabled={!picture} onClick={() => setZoom(current.scale / 1.3)}><MinusIcon size={15}/></IconButton>
        <Button variant="ghost" size="sm" disabled={!picture} onClick={() => setView(undefined)}>{t('适应', 'Fit')}</Button>
        <Button variant="ghost" size="sm" disabled={!picture} onClick={() => setView({ scale: 1, x: 0, y: 0 })}>100%</Button>
        <IconButton label={t('放大', 'Zoom in')} variant="ghost" size="sm" disabled={!picture} onClick={() => setZoom(current.scale * 1.3)}><PlusIcon size={15}/></IconButton>
        <IconButton label={fullscreen ? t('退出全屏', 'Exit fullscreen') : t('全屏', 'Fullscreen')} variant="ghost" size="sm" disabled={!picture}
          onClick={() => {
            const action = fullscreen ? document.exitFullscreen() : shell.current?.requestFullscreen?.();
            void action?.catch(() => {});
          }}>{fullscreen ? <ArrowsInIcon size={15}/> : <ArrowsOutIcon size={15}/>}</IconButton>
      </div>
    </div>
  </div>;
}
