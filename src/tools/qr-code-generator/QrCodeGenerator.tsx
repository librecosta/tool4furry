import { Component, lazy, Suspense, useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowCounterClockwiseIcon, ArrowsInIcon, ArrowsOutIcon, CubeIcon, DownloadSimpleIcon, FileImageIcon, FileSvgIcon, MinusIcon, PlusIcon, QrCodeIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button, IconButton } from '../../ui/Button';
import { Frame, ErrorText, errorText, tr, saveBlob, useBlobUrl } from '../general/ui';
import form from '../../workbench/form-tool-layout.module.scss';
import s from './qr-workspace.module.scss';
import { useJob } from '../general/use-job';
import { integer } from '../general/bounds';
import { createWorkspaceMatrix } from './core';
import { generateVerifiedQr, type VerifiedQr } from './art/export';
import { qrMaxPixels, qrMinPixels, renderQrSvg } from './art/render';
import { createDefaultRecipe } from './recipe/defaults';
import { deriveSeed } from './recipe/seed';
import { artStyleIds, errorCorrectionLevels, terrainIds, type ArtStyleId, type QrRecipeV1, type TerrainId } from './recipe/types';
import { validateRecipe } from './recipe/validate';
import { displayQrText, editQrText, replaceQrText } from './qr-input';
import { ArtworkCarousel, OutputSize } from './QrArtworkControls';
import notice from './qrcode.NOTICE.txt?url';
import decoderNotice from './art/jsqr.NOTICE.txt?url&no-inline';
import graphicsNotice from './graphics/graphics.NOTICE.txt?url&no-inline';
import type { DioramaZoom, SceneScan } from './graphics/DioramaScene';
import type { DioramaCommand, DioramaPose, DioramaStatus } from './graphics/scene-transition';
import type { DioramaCapture } from './graphics/scene-capture';

const Scene = lazy(() => import('./graphics/DioramaScene'));
const terrainLabels = {
  dunes: ['沙漠', 'Dunes'],
  highlands: ['丘陵', 'Highlands'],
  valley: ['山谷', 'Valley'],
} as const;
function makeThumbnails() {
  const recipe = createDefaultRecipe();
  const matrix = createWorkspaceMatrix(recipe);
  return artStyleIds.map(id => {
    const { svg } = renderQrSvg(matrix, 288, {
      kind: 'artistic', recipe: { ...recipe, artwork: { ...recipe.artwork, id } },
    });
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  });
}

const contentDelay = 400;

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() { this.props.onFailure(); }

  render() { return this.state.failed ? null : this.props.children; }
}

export default function QrCodeGenerator({ locale }: ToolProps) {
  const [recipe, setRecipe] = useState(createDefaultRecipe);
  const [draft, setDraft] = useState(recipe.content);
  const [composing, setComposing] = useState(false);
  const [outputSize, setOutputSize] = useState('512');
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const is3d = mode === '3d';
  const thumbnails = useMemo(() => is3d ? [] : makeThumbnails(), [is3d]);
  const [loadScene, setLoadScene] = useState(false);
  const [command, setCommand] = useState<DioramaCommand>({ pose: 'world', sequence: 0 });
  const [status, setStatus] = useState<DioramaStatus>('moving');
  const [scan, setScan] = useState<SceneScan | null>(null);
  const [canCapture, setCanCapture] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const capture = useRef<DioramaCapture>(null);
  const sceneElement = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<DioramaZoom>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fullscreen = nativeFullscreen || expanded;
  const updateCapture = useCallback((next: DioramaCapture | null) => {
    capture.current = next;
    setCanCapture(!!next);
  }, []);
  const unavailable = useCallback(() => setStatus('unavailable'), []);
  useEffect(() => {
    const syncFullscreen = () => setNativeFullscreen(document.fullscreenElement === sceneElement.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    root.style.overflow = 'hidden';
    document.addEventListener('keydown', dismiss);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener('keydown', dismiss);
    };
  }, [expanded]);
  useEffect(() => {
    if (!is3d || loadScene) return;
    const stage = sceneElement.current;
    if (!stage || !('IntersectionObserver' in window)) {
      setLoadScene(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoadScene(true);
        observer.disconnect();
      }
    }, { rootMargin: '120px' });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [is3d, loadScene]);

  const job = useJob<VerifiedQr>(locale);
  const url = useBlobUrl(job.result?.png);
  const pending = draft !== recipe.content;
  const { content } = recipe;
  const { errorCorrectionLevel } = recipe.qr;
  const encoding = useMemo(() => {
    try {
      return { matrix: createWorkspaceMatrix({ content, qr: { errorCorrectionLevel } }), error: undefined };
    } catch (error) {
      return { matrix: null, error };
    }
  }, [content, errorCorrectionLevel]);
  const matrix = pending ? null : encoding.matrix;
  const attempted = useRef<{ matrix: typeof matrix; artwork: QrRecipeV1['artwork']; size: string }>(null);
  const renderAfterCommit = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const pasteCaret = useRef<number>(null);
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const view = command.pose === 'world' ? 'world' : 'qr';
  const cameraReady = status === 'world' || status === 'front' || status === 'tilted';
  const fullscreenLabel = fullscreen ? t('退出全屏', 'Exit fullscreen') : t('全屏', 'Fullscreen');
  const tiltLabel = status === 'front' ? t('倾斜观察', 'Tilt view') : t('返回正视', 'Front view');
  const matrixError = !pending && content.trim() && encoding.error
    ? errorText(encoding.error, locale) : undefined;

  const moveTo = (pose: DioramaPose, reset = false) => {
    if (status === 'unavailable') return;
    setStatus('moving');
    setCaptureError(false);
    setScan(null);
    setCommand(current => ({ pose, sequence: current.sequence + 1, reset }));
  };
  const toggleFullscreen = async () => {
    const stage = sceneElement.current;
    if (!stage) return;
    if (expanded) {
      setExpanded(false);
    } else if (document.fullscreenElement === stage) {
      await document.exitFullscreen().catch(() => {});
    } else if (document.fullscreenEnabled && stage.requestFullscreen) {
      await stage.requestFullscreen().catch(() => setExpanded(true));
    } else {
      setExpanded(true);
    }
  };
  const selectTerrain = (id: TerrainId) => {
    if (id === recipe.terrain.id) return;
    setScan(null);
    setCaptureError(false);
    setRecipe(current => ({
      ...current,
      terrain: { ...current.terrain, id, seed: deriveSeed(current.content, id, current.terrain.revision, current.version) },
    }));
  };
  const downloadScene = async () => {
    const current = capture.current;
    if (!current) return;
    setCaptureError(false);
    try {
      const image = await current();
      if (capture.current === current) saveBlob(image, 'terrain-diorama.png');
    } catch {
      if (capture.current === current) setCaptureError(true);
    }
  };

  const editRecipe = (change: (current: QrRecipeV1) => QrRecipeV1) => {
    job.invalidate();
    setRecipe(change);
  };
  const editContent = (value: string) => {
    if (value === draft) return;
    job.invalidate();
    setCaptureError(false);
    // Returning to the previous text must still regenerate the invalidated result.
    attempted.current = null;
    setDraft(value);
  };
  const commitContent = (value: string) => {
    renderAfterCommit.current = true;
    setRecipe(current => ({
      ...current, content: value,
      terrain: { ...current.terrain, seed: deriveSeed(value, current.terrain.id, current.terrain.revision, current.version) },
    }));
  };
  const commitDraft = useEffectEvent(() => commitContent(draft));
  useEffect(() => {
    if (!pending || composing) return;
    const timer = window.setTimeout(() => commitDraft(), contentDelay);
    return () => window.clearTimeout(timer);
  }, [pending, draft, composing]);
  useLayoutEffect(() => {
    if (pasteCaret.current === null) return;
    input.current?.setSelectionRange(pasteCaret.current, pasteCaret.current);
    pasteCaret.current = null;
  }, [draft]);
  const chooseStyle = (id: ArtStyleId) => {
    if (recipe.artwork.id === id) return;
    editRecipe(current => ({ ...current, artwork: { ...current.artwork, id } }));
  };

  const start = () => {
    if (!matrix) return;
    renderAfterCommit.current = false;
    attempted.current = { matrix, artwork: recipe.artwork, size: outputSize };
    void job.run(async signal => {
      const size = integer(outputSize, qrMinPixels, qrMaxPixels);
      const validated = validateRecipe(recipe);
      return generateVerifiedQr(matrix, validated.content, size, { kind: 'artistic', recipe: validated }, signal);
    });
  };
  const generatePreview = useEffectEvent(start);
  useEffect(() => {
    if (job.busy || !matrix ||
        (attempted.current?.matrix === matrix && attempted.current.artwork === recipe.artwork && attempted.current.size === outputSize)) return;
    const timer = window.setTimeout(() => generatePreview(), renderAfterCommit.current ? 0 : 300);
    return () => window.clearTimeout(timer);
  }, [job.busy, matrix, recipe.artwork, outputSize]);

  const result = job.result;
  const fallback = result?.fallback;
  const canCancel = !is3d && !pending && job.busy && attempted.current?.matrix === matrix &&
    attempted.current.artwork === recipe.artwork && attempted.current.size === outputSize;
  const submit = () => {
    if (composing) return;
    if (canCancel) {
      job.invalidate();
      return;
    }
    if (pending) commitContent(draft);
    if (is3d) moveTo('front');
    else if (!pending && !job.busy) start();
  };
  const previewError = matrixError || (!is3d ? job.error : undefined);
  const captureMessage = is3d && captureError ? t('无法保存当前三维画面。', 'Could not save the current 3D frame.') : undefined;
  let scanMessage: string | undefined;
  if (is3d && view === 'qr' && status !== 'unavailable' && !matrixError) {
    if (pending) scanMessage = t('正在等待输入完成…', 'Waiting for input…');
    else if (!matrix) scanMessage = t('输入有效内容后会显示三维二维码。', 'Enter valid content to show the 3D QR.');
    else if (status === 'tilted') scanMessage = t('返回正视图可重新验码。', 'Return to front view to check scanning.');
    else if (status === 'front') {
      const state = scan?.matrix === matrix ? scan.state : 'pending';
      scanMessage = state === 'verified' ? t('三维正视图已通过软件扫码。', '3D front view passed the software scan.')
        : state === 'unreadable' ? t('未能读回三维二维码。可下载二维成品。', '3D view could not be read. The 2D export is available.')
          : t('正在验证三维正视图…', 'Checking the 3D front view…');
    }
  } else if (!is3d && fallback) {
    scanMessage = fallback.reason === 'density'
      ? t(`艺术样式至少需要 ${fallback.minimum} px。已改用通过验证的标准样式。`,
        `This artwork needs at least ${fallback.minimum} px. Showing a verified standard QR code.`)
      : t('艺术样式未能读回原文。已改用通过验证的标准样式。',
        'The artwork could not be read back. Showing a verified standard QR code.');
  }
  return (
    <Frame locale={locale}>
      <div className={s.workspace} data-qr-artwork data-qr-diorama={status}
        data-qr-license={notice} data-qr-decoder-license={decoderNotice} data-qr-graphics-license={graphicsNotice}>
        <Tabs.Root className={s.scene} data-qr-expanded={expanded || undefined} ref={sceneElement} value={mode} onValueChange={value => {
          if (value === '2d' || value === '3d') setMode(value);
        }}>
          <div className={s.sceneHeader}>
            <Tabs.List className={`${form.segmented} ${s.sceneControls} ${s.modeList}`}
              aria-label={t('二维码类型', 'QR type')} activateOnFocus>
              <Tabs.Indicator className={s.modeIndicator} />
              <Tabs.Tab value="2d" className={form.segment}>2D</Tabs.Tab>
              <Tabs.Tab value="3d" className={form.segment}>3D</Tabs.Tab>
            </Tabs.List>
            <div className={s.composer}>
              <form className={s.compose} onSubmit={event => { event.preventDefault(); submit(); }}>
                <input ref={input} type="text" aria-label={t('文本或网址', 'Text or URL')}
                  placeholder={t('输入文本或网址', 'Enter text or a URL')} value={displayQrText(draft)}
                  autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={!!matrixError}
                  onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
                  onChange={event => editContent(editQrText(draft, event.currentTarget.value))}
                  onPaste={event => {
                    const pasted = event.clipboardData.getData('text/plain');
                    if (!/[\r\n]/.test(pasted)) return;
                    event.preventDefault();
                    const { selectionStart, selectionEnd } = event.currentTarget;
                    if (selectionStart === null || selectionEnd === null) return;
                    pasteCaret.current = selectionStart + displayQrText(pasted).length;
                    const next = replaceQrText(draft, selectionStart, selectionEnd, pasted);
                    editContent(next);
                    if (next === draft) {
                      event.currentTarget.setSelectionRange(pasteCaret.current, pasteCaret.current);
                      pasteCaret.current = null;
                    }
                  }} />
                <Button type="submit" size="sm" variant="primary"
                  aria-label={canCancel ? t('取消二维生成', 'Cancel 2D generation') : t('生成二维码', 'Generate QR code')}
                  disabled={!draft.trim() || (!pending && !matrix) || composing || (is3d && status === 'unavailable')}>
                  {canCancel ? t('取消', 'Cancel') : t('生成', 'Generate')}
                </Button>
              </form>
              {(previewError || captureMessage) && <div className={s.composeError}>
                <ErrorText error={previewError || captureMessage} />
              </div>}
            </div>
            {is3d && <div className={`${form.segmented} ${s.sceneControls} ${s.viewList}`} role="group" aria-label={t('场景模式', 'Scene view')}>
              <button type="button" className={`${form.segment} ${view === 'world' ? form.segmentSelected : ''}`} aria-pressed={view === 'world'}
                disabled={status === 'unavailable'} onClick={() => moveTo('world')}>{t('世界', 'World')}</button>
              <button type="button" className={`${form.segment} ${view === 'qr' ? form.segmentSelected : ''}`} aria-pressed={view === 'qr'}
                disabled={status === 'unavailable'} onClick={() => moveTo('front')}>{t('二维码', 'QR')}</button>
            </div>}
          </div>
          <Tabs.Panel value="3d" keepMounted className={s.viewport}>
            {loadScene && <SceneBoundary onFailure={unavailable}>
              <Suspense fallback={null}>
                <Scene active={is3d} zoomRef={zoomRef} recipe={recipe} matrix={matrix} command={command}
                  label={t('三维地貌沙盘', '3D terrain diorama')} onStatus={setStatus} onScan={setScan} onCapture={updateCapture} />
              </Suspense>
            </SceneBoundary>}
            {status === 'unavailable' && <div className={s.sceneMessage} role="alert">
              <p>{t('无法打开三维场景。仍可生成和下载二维二维码。', 'The 3D scene is unavailable. You can still generate and download a 2D QR code.')}</p>
              <Button onClick={() => setMode('2d')}>{t('使用二维成品', 'Use the 2D artwork')}</Button>
            </div>}
            {status === 'moving' && !canCapture && command.sequence === 0 && <div className={s.sceneMessage} role="status">
              {t('正在加载地貌…', 'Loading terrain…')}
            </div>}
          </Tabs.Panel>
          <Tabs.Panel value="2d" className={s.artPreview}>
            {result && url ? <img src={url} width={result.size} height={result.size}
              alt={t('生成的二维码', 'Generated QR code')} /> : <p className={s.hint} role="status">
              {pending ? t('正在等待输入完成…', 'Waiting for input…')
                : job.busy ? t('正在绘制并读回二维码…', 'Rendering and checking the QR code…')
                : t('预览会在扫码验证通过后显示。', 'The preview appears after the scan check passes.')}
            </p>}
          </Tabs.Panel>
          <div className={s.sceneFooter}>
            <div className={s.cameraLeft} role="group" aria-label={t('视图操作', 'View actions')}>
              {is3d && <>
                <IconButton label={t('复位视角', 'Reset view')} title={t('复位视角', 'Reset view')} variant="ghost"
                  disabled={!cameraReady} onClick={() => moveTo(view === 'world' ? 'world' : 'front', true)}>
                  <ArrowCounterClockwiseIcon size={20} aria-hidden />
                </IconButton>
                {view === 'qr' && <IconButton label={tiltLabel} title={tiltLabel} variant="ghost" disabled={!cameraReady}
                  onClick={() => moveTo(status === 'front' ? 'tilted' : 'front', true)}>
                  {status === 'front' ? <CubeIcon size={20} aria-hidden /> : <QrCodeIcon size={20} aria-hidden />}
                </IconButton>}
              </>}
              <IconButton label={fullscreenLabel} title={fullscreenLabel} variant="ghost"
                onClick={() => void toggleFullscreen()}>
                {fullscreen ? <ArrowsInIcon size={20} aria-hidden /> : <ArrowsOutIcon size={20} aria-hidden />}
              </IconButton>
              {is3d ? <IconButton variant="ghost" label={t('下载沙盘 PNG', 'Download diorama PNG')}
                title={t('下载沙盘 PNG', 'Download diorama PNG')} disabled={pending || !canCapture || !cameraReady || (view === 'qr' && !matrix)}
                onClick={() => void downloadScene()}><DownloadSimpleIcon size={20} aria-hidden /></IconButton> : <>
                <IconButton variant="ghost" label={t('下载 2D PNG', 'Download 2D PNG')}
                  title={t('下载 2D PNG', 'Download 2D PNG')} disabled={!result}
                  onClick={() => result && saveBlob(result.png, 'qr-code.png')}><FileImageIcon size={20} aria-hidden /></IconButton>
                <IconButton variant="ghost" label={t('下载 2D SVG', 'Download 2D SVG')}
                  title={t('下载 2D SVG', 'Download 2D SVG')} disabled={!result}
                  onClick={() => result && saveBlob(result.svg, 'qr-code.svg')}><FileSvgIcon size={20} aria-hidden /></IconButton>
              </>}
            </div>
            {scanMessage && <p className={s.notice} role="status">{scanMessage}</p>}
            {is3d && <>
              <div className={s.terrainChips} role="group" aria-label={t('选择地貌', 'Choose terrain')}>
                {terrainIds.map(id => <button type="button" key={id} aria-pressed={recipe.terrain.id === id}
                  disabled={status === 'unavailable'} onClick={() => selectTerrain(id)}>{t(terrainLabels[id][0], terrainLabels[id][1])}</button>)}
              </div>
              <div className={s.cameraRight} role="group" aria-label={t('缩放视角', 'Camera zoom')}>
                <IconButton label={t('放大', 'Zoom in')} title={t('放大', 'Zoom in')} variant="ghost"
                  disabled={!cameraReady} onClick={() => zoomRef.current?.('in')}><PlusIcon size={20} aria-hidden /></IconButton>
                <IconButton label={t('缩小', 'Zoom out')} title={t('缩小', 'Zoom out')} variant="ghost"
                  disabled={!cameraReady} onClick={() => zoomRef.current?.('out')}><MinusIcon size={20} aria-hidden /></IconButton>
              </div>
            </>}
            {!is3d && <>
              <ArtworkCarousel locale={locale} selected={recipe.artwork.id}
                images={thumbnails} onSelect={chooseStyle} />
              <div className={s.artOptions}>
                <div className={s.correction} role="group" aria-label={t('纠错等级', 'Error correction')}>
                  {errorCorrectionLevels.map(level => <button key={level} type="button" aria-label={level}
                    title={t(`纠错等级 ${level}`, `Error correction ${level}`)}
                    aria-pressed={errorCorrectionLevel === level}
                    onClick={() => {
                      if (level !== errorCorrectionLevel)
                        editRecipe(current => ({ ...current, qr: { errorCorrectionLevel: level } }));
                    }}>
                    {level}
                  </button>)}
                </div>
                <OutputSize locale={locale} value={outputSize} onChange={size => {
                  if (size === outputSize) return;
                  job.invalidate();
                  setOutputSize(size);
                }} />
              </div>
            </>}
          </div>
        </Tabs.Root>
      </div>
    </Frame>
  );
}
