import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon, ImageSquareIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { paintCanvas } from './render';
import { maxEdge, type CodeImageScene } from './core';
import type { FontId, PhotoPlacement, PhotoTarget, Scale } from './settings';
import type { Translate } from './AppearancePanel';
import type { PhotoInputState } from './use-local-photo';
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
  photoPrompt?: Pick<PhotoInputState, 'pending' | 'error'> & { choose: () => void };
  dragTarget?: PhotoTarget;
  movePhoto: (target: PhotoTarget, position: Pick<PhotoPlacement, 'x' | 'y'>) => void;
  report: (error: unknown) => void;
  beginEdit: () => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  editor: ReactNode;
};

export function Stage({ t, editing, scene, font, scale, size, status, error, photoPrompt, dragTarget, movePhoto,
  report, beginEdit, fullscreen, toggleFullscreen, editor }: Props) {
  const preview = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number; target: PhotoTarget; clientX: number; clientY: number;
    x: number; y: number; travelX: number; travelY: number;
  }>(undefined);
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
  const photo = dragTarget === 'canvas' ? scene?.canvasPhoto : dragTarget === 'window' ? scene?.windowPhoto : undefined;
  const repositioning = !!photo && (photo.travelX > 0.01 || photo.travelY > 0.01);

  function startDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (!scene || !photo || !dragTarget || !repositioning || event.button !== 0 || !event.isPrimary) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = scene.width / rect.width;
    const scaleY = scene.height / rect.height;
    if (dragTarget === 'window') {
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const window = scene.window;
      if (x < window.x || x > window.x + window.width || y < window.y || y > window.y + window.height) return;
    }
    drag.current = {
      id: event.pointerId, target: dragTarget, clientX: event.clientX, clientY: event.clientY,
      x: photo.placement.x, y: photo.placement.y, travelX: photo.travelX / scaleX, travelY: photo.travelY / scaleY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateDrag(event: PointerEvent<HTMLCanvasElement>) {
    const current = drag.current;
    if (!repositioning || !current || current.id !== event.pointerId || current.target !== dragTarget) return;
    const position = (start: number, delta: number, travel: number) =>
      travel > 0.01 ? Math.round(Math.max(-100, Math.min(100, start + 100 * delta / travel))) : start;
    movePhoto(current.target, {
      x: position(current.x, event.clientX - current.clientX, current.travelX),
      y: position(current.y, event.clientY - current.clientY, current.travelY),
    });
  }

  function endDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (drag.current?.id === event.pointerId) drag.current = undefined;
  }

  return <section className={s.stage} aria-label={t('画布', 'Canvas')} data-code-stage>
    <div className={s.stageHeader}>
      <span>{editing ? t('代码编辑器', 'Code editor') : t('画布', 'Canvas')}</span>
      <span>{!editing && (repositioning
        ? dragTarget === 'canvas' ? t('拖动画布背景', 'Drag the canvas background') : t('拖动窗口背景', 'Drag the window background')
        : zoom === undefined ? t('自动适应', 'Auto fit') : `${Math.round(zoom * 100)}%`)}</span>
    </div>
    <div className={s.stageBody}>
      <div className={s.editorMount} hidden={!editing}>{editor}</div>
      <div ref={viewport} className={s.viewport} hidden={editing} data-zoom={zoom ?? 'fit'}>
        <div className={s.artboard} hidden={!scene || !!error}
          data-transparent={scene?.background.kind === 'transparent' || !!scene?.canvasPhoto || undefined}
          style={scene ? { width: scene.width * scale * ratio, height: scene.height * scale * ratio } : undefined}>
          <canvas ref={preview} aria-label={t('代码图片预览', 'Code image preview')}
            data-logical-width={scene?.width} data-logical-height={scene?.height}
            data-repositioning={repositioning || undefined}
            onPointerDown={startDrag} onPointerMove={updateDrag}
            onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
            onDoubleClick={event => {
              if (!scene || repositioning) return;
              const from = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - from.left) * scene.width / from.width;
              const y = (event.clientY - from.top) * scene.height / from.height;
              const window = scene.window;
              if (x >= window.x && x <= window.x + window.width && y >= window.y && y <= window.y + window.height) beginEdit();
            }} />
        </div>
        {photoPrompt ? <div className={`${s.stageNotice} ${s.stagePhotoPrompt}`}>
          {photoPrompt.error && <span role="alert" className={s.photoError}>{photoPrompt.error}</span>}
          {photoPrompt.pending
            ? <span role="status">{t('正在读取背景图片…', 'Reading background image…')}</span>
            : <Button className={s.stageImport} variant="primary" onClick={photoPrompt.choose}>
              <ImageSquareIcon size={18} aria-hidden="true" /> {t('导入背景图片', 'Import background image')}
            </Button>}
        </div> : (!scene || error) && <div role={error ? 'alert' : 'status'} className={s.stageNotice}>{error || status}</div>}
      </div>
    </div>
    <div className={s.stageFooter}>
      <output aria-live="polite">{size ? `${size.width} × ${size.height} px` : '—'}</output>
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
