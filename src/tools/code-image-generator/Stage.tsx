import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { paintCanvas } from './render';
import { maxEdge, type CodeImageScene } from './core';
import type { FontId, Scale } from './settings';
import type { Translate } from './AppearancePanel';
import s from './studio.module.scss';

type Props = {
  t: Translate;
  editing: boolean;
  scene?: CodeImageScene;
  font: FontId;
  scale: Scale;
  size?: { width: number; height: number };
  status?: string;
  error?: string;
  report: (error: unknown) => void;
  beginEdit: () => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  editor: ReactNode;
};

export function Stage({ t, editing, scene, font, scale, size, status, error, report, beginEdit, fullscreen, toggleFullscreen, editor }: Props) {
  const preview = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>();
  const reportError = useRef(report);
  reportError.current = report;

  useLayoutEffect(() => {
    const node = viewport.current!;
    const observer = new ResizeObserver(([entry]) => {
      setSpace({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const canvas = preview.current!;
    if (!scene) { canvas.width = canvas.height = 0; return; }
    const oversample = Math.min(
      2, Math.sqrt(2_200_000 / (scene.width * scene.height)), maxEdge / Math.max(scene.width, scene.height));
    try {
      paintCanvas(canvas, scene, font, Math.max(1, Math.round(scene.width * oversample)), Math.max(1, Math.round(scene.height * oversample)));
    } catch (failure) {
      canvas.width = canvas.height = 0;
      reportError.current(failure);
    }
  }, [scene, font]);
  useEffect(() => {
    const node = preview.current!;
    return () => { node.width = node.height = 0; };
  }, []);

  const fit = scene && Math.max(0.01, Math.min(
    (space.width - 32) / (scene.width * scale), (space.height - 32) / (scene.height * scale), 1));
  const ratio = zoom ?? fit ?? 0.5;
  const adjust = (delta: number) => setZoom(+Math.max(0.1, Math.min(2, ratio + delta)).toFixed(2));
  const expandLabel = fullscreen ? t('退出全屏', 'Exit full screen') : t('全屏', 'Full screen');

  return <section className={s.stage} aria-label={t('画布', 'Canvas')} data-code-stage>
    <div className={s.stageHeader}>
      <span>{editing ? t('代码编辑器', 'Code editor') : t('画布', 'Canvas')}</span>
      <span>{!editing && (zoom === undefined ? t('自动适应', 'Auto fit') : `${Math.round(zoom * 100)}%`)}</span>
    </div>
    <div className={s.stageBody}>
      <div className={s.editorMount} hidden={!editing}>{editor}</div>
      <div ref={viewport} className={s.viewport} hidden={editing} data-zoom={zoom ?? 'fit'}>
        <div className={s.artboard} hidden={!scene || !!error}
          data-transparent={scene?.background.kind === 'transparent' || (scene?.background.kind === 'image' && !!scene.background.image) || undefined}
          style={scene ? { width: scene.width * scale * ratio, height: scene.height * scale * ratio } : undefined}>
          <canvas ref={preview} aria-label={t('代码图片预览', 'Code image preview')}
            data-logical-width={scene?.width} data-logical-height={scene?.height}
            onDoubleClick={event => {
              if (!scene) return;
              const from = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - from.left) * scene.width / from.width;
              const y = (event.clientY - from.top) * scene.height / from.height;
              const window = scene.window;
              if (x >= window.x && x <= window.x + window.width && y >= window.y && y <= window.y + window.height) beginEdit();
            }} />
        </div>
        {(!scene || error) && <div role={error ? 'alert' : 'status'} className={s.stageNotice}>{error ?? status}</div>}
      </div>
    </div>
    <div className={s.stageFooter}>
      <output aria-live="polite">{size ? `${size.width} × ${size.height} px · ${scale}×` : '—'}</output>
      <div className={s.zoomControls} aria-label={t('画布视图控制', 'Canvas view controls')}>
        <Tooltip borderless content={t('缩小', 'Zoom out')}>
          <IconButton variant="ghost" size="sm" label={t('缩小', 'Zoom out')} disabled={editing || !scene} onClick={() => adjust(-0.15)}><MinusIcon size={15} /></IconButton>
        </Tooltip>
        <Button variant="ghost" size="sm" disabled={editing || !scene} aria-pressed={zoom === undefined} onClick={() => setZoom(undefined)}>{t('适应', 'Fit')}</Button>
        <Button variant="ghost" size="sm" disabled={editing || !scene} aria-pressed={zoom === 1} onClick={() => setZoom(1)}>100%</Button>
        <Tooltip borderless content={t('放大', 'Zoom in')}>
          <IconButton variant="ghost" size="sm" label={t('放大', 'Zoom in')} disabled={editing || !scene} onClick={() => adjust(0.15)}><PlusIcon size={15} /></IconButton>
        </Tooltip>
        <Tooltip borderless content={expandLabel}>
          <IconButton variant="ghost" size="sm" label={expandLabel} onClick={toggleFullscreen}>
            {fullscreen ? <ArrowsInSimpleIcon size={17} /> : <ArrowsOutSimpleIcon size={17} />}
          </IconButton>
        </Tooltip>
      </div>
    </div>
  </section>;
}
