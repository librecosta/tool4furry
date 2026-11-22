import { Component, lazy, Suspense, useCallback, useDeferredValue, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ToolProps } from '../types';
import { TextField, TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, ErrorText, errorText, tr, Copy, saveBlob, useBlobUrl } from '../general/ui';
import form from '../../workbench/form-tool-layout.module.scss';
import s from './qr-workspace.module.scss';
import { useJob } from '../general/use-job';
import { integer, fail } from '../general/bounds';
import { contrast, parseColor } from '../color-contrast/core';
import { createWorkspaceMatrix } from './core';
import { generateVerifiedQr, type VerifiedQr } from './art/export';
import { qrMaxPixels, qrMinPixels, renderQrSvg, type QrRenderMode } from './art/render';
import { createDefaultRecipe } from './recipe/defaults';
import { deriveSeed } from './recipe/seed';
import { artStyleIds, errorCorrectionLevels, terrainIds, type ArtStyleId, type QrRecipeV1, type TerrainId } from './recipe/types';
import { validateRecipe } from './recipe/validate';
import { displayQrText, editQrText, replaceQrText } from './qr-input';
import notice from './qrcode.NOTICE.txt?url';
import decoderNotice from './art/jsqr.NOTICE.txt?url&no-inline';
import graphicsNotice from './graphics/graphics.NOTICE.txt?url&no-inline';
import type { SceneScan } from './graphics/DioramaScene';
import type { DioramaCommand, DioramaPose, DioramaStatus } from './graphics/scene-transition';
import type { DioramaCapture } from './graphics/scene-capture';

const Scene = lazy(() => import('./graphics/DioramaScene'));
const terrainLabels = {
  dunes: ['风蚀沙漠', 'Dunes', '沙漠'],
  highlands: ['起伏高地', 'Highlands', '丘陵'],
  valley: ['切蚀山谷', 'Valley', '山谷'],
} as const;
const artLabels = {
  aeolian: ['风蚀沙丘', 'Aeolian'],
  contour: ['地形等高线', 'Contour'],
  strata: ['峡谷岩层', 'Strata'],
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

const initialOutput = { size: '512', standard: false, fg: '#202428', bg: '#FFFFFF' };

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
  const [output, setOutput] = useState(initialOutput);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const thumbnails = useMemo(() => optionsOpen ? makeThumbnails() : [], [optionsOpen]);
  const [loadScene, setLoadScene] = useState(false);
  const [command, setCommand] = useState<DioramaCommand>({ pose: 'world', sequence: 0 });
  const [status, setStatus] = useState<DioramaStatus>('moving');
  const [scan, setScan] = useState<SceneScan | null>(null);
  const [canCapture, setCanCapture] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const capture = useRef<DioramaCapture>(null);
  const sceneElement = useRef<HTMLDivElement>(null);
  const updateCapture = useCallback((next: DioramaCapture | null) => {
    capture.current = next;
    setCanCapture(!!next);
  }, []);
  const unavailable = useCallback(() => setStatus('unavailable'), []);
  useEffect(() => {
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
  }, []);

  const job = useJob<VerifiedQr>(locale);
  const url = useBlobUrl(job.result?.png);
  const deferredContent = useDeferredValue(recipe.content);
  const { errorCorrectionLevel } = recipe.qr;
  const encoding = useMemo(() => {
    try {
      return { matrix: createWorkspaceMatrix({ content: deferredContent, qr: { errorCorrectionLevel } }), error: undefined };
    } catch (error) {
      return { matrix: null, error };
    }
  }, [deferredContent, errorCorrectionLevel]);
  const matrix = deferredContent === recipe.content ? encoding.matrix : null;
  const attempted = useRef<{ matrix: typeof matrix; artwork: QrRecipeV1['artwork']; output: typeof initialOutput }>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const pasteCaret = useRef<number>(null);
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const view = command.pose === 'world' ? 'world' : 'qr';
  const terrainTitle = terrainLabels[recipe.terrain.id];
  const matrixError = deferredContent === recipe.content && recipe.content.trim() && encoding.error
    ? errorText(encoding.error, locale) : undefined;

  const moveTo = (pose: DioramaPose, reset = false) => {
    if (status === 'unavailable') return;
    setStatus('moving');
    setCaptureError(false);
    setScan(null);
    setCommand(current => ({ pose, sequence: current.sequence + 1, reset }));
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
  const editContent = (content: string) => editRecipe(current => ({
    ...current, content,
    terrain: { ...current.terrain, seed: deriveSeed(content, current.terrain.id, current.terrain.revision, current.version) },
  }));
  useLayoutEffect(() => {
    if (pasteCaret.current === null) return;
    input.current?.setSelectionRange(pasteCaret.current, pasteCaret.current);
    pasteCaret.current = null;
  }, [recipe]);
  const editOutput = (change: Partial<typeof initialOutput>) => {
    job.invalidate();
    setOutput(current => ({ ...current, ...change }));
  };
  const chooseStyle = (id: ArtStyleId) => {
    editRecipe(current => ({ ...current, artwork: { ...current.artwork, id } }));
    if (output.standard) editOutput({ standard: false });
  };

  const start = () => {
    if (!matrix) return;
    attempted.current = { matrix, artwork: recipe.artwork, output };
    void job.run(async signal => {
      const size = integer(output.size, qrMinPixels, qrMaxPixels);
      let custom: Extract<QrRenderMode, { kind: 'standard' }>['colors'];
      if (output.standard) {
        const { fg, bg } = output;
        if (!/^#[a-f\d]{6}$/i.test(fg) || !/^#[a-f\d]{6}$/i.test(bg))
          fail('请输入六位 HEX 颜色。', 'Enter six-digit HEX colors.');
        const dark = parseColor(fg);
        const light = parseColor(bg);
        if (contrast(dark, light) < 3 || dark.reduce((a, b) => a + b) >= light.reduce((a, b) => a + b))
          fail('请使用深色前景、浅色背景及至少 3:1 的对比度。',
            'Use a dark foreground, light background and at least 3:1 contrast.');
        custom = { dark: fg, light: bg };
      }
      const validated = validateRecipe(recipe);
      return generateVerifiedQr(matrix, validated.content, size,
        custom ? { kind: 'standard', colors: custom } : { kind: 'artistic', recipe: validated }, signal);
    });
  };
  const generatePreview = useEffectEvent(start);
  useEffect(() => {
    if (job.busy || !matrix ||
        (attempted.current?.matrix === matrix && attempted.current.artwork === recipe.artwork && attempted.current.output === output)) return;
    const timer = window.setTimeout(() => generatePreview(), 300);
    return () => window.clearTimeout(timer);
  }, [job.busy, matrix, recipe.artwork, output]);

  const result = job.result;
  const fallback = result?.fallback;
  let scanMessage: string | undefined;
  if (view === 'qr' && status !== 'unavailable') {
    if (!matrix) scanMessage = t('输入有效内容后会显示三维二维码。', 'Enter valid content to show the 3D QR.');
    else if (status === 'tilted') scanMessage = t('返回正视图可重新验码。', 'Return to front view to check scanning.');
    else if (status === 'front') {
      const state = scan?.matrix === matrix ? scan.state : 'pending';
      scanMessage = state === 'verified' ? t('三维正视图已通过软件扫码。', '3D front view passed the software scan.')
        : state === 'unreadable' ? t('未能读回三维二维码。可下载二维成品。', '3D view could not be read. The 2D export is available.')
          : t('正在验证三维正视图…', 'Checking the 3D front view…');
    }
  }
  return (
    <Frame locale={locale}>
      <div className={s.workspace} data-qr-artwork data-qr-diorama={status}>
        <div className={s.scene} ref={sceneElement}>
          {loadScene && <SceneBoundary onFailure={unavailable}>
            <Suspense fallback={null}>
              <Scene recipe={recipe} matrix={matrix} command={command} label={t('三维地貌沙盘', '3D terrain diorama')}
                onStatus={setStatus} onScan={setScan} onCapture={updateCapture} />
            </Suspense>
          </SceneBoundary>}
          <div className={s.sceneHeader}>
            <div className={s.landmark}>
              <span className={s.kicker}>{t('程序化地貌', 'Procedural terrain')}</span>
              <h2>{locale === 'zh' ? `${terrainTitle[1]} · ${terrainTitle[0]}` : terrainTitle[1]}</h2>
            </div>
            <div className={`${form.segmented} ${s.sceneControls}`} role="group" aria-label={t('场景模式', 'Scene view')}>
              <button type="button" className={`${form.segment} ${view === 'world' ? form.segmentSelected : ''}`} aria-pressed={view === 'world'}
                disabled={status === 'unavailable'} onClick={() => moveTo('world')}>{t('世界', 'World')}</button>
              <button type="button" className={`${form.segment} ${view === 'qr' ? form.segmentSelected : ''}`} aria-pressed={view === 'qr'}
                disabled={status === 'unavailable'} onClick={() => moveTo('front')}>{t('二维码', 'QR')}</button>
            </div>
          </div>
          {status === 'unavailable' && <div className={s.sceneMessage} role="alert">
            <p>{t('无法打开三维场景。仍可生成和下载二维二维码。', 'The 3D scene is unavailable. You can still generate and download a 2D QR code.')}</p>
            <Button onClick={() => setOptionsOpen(true)}>{t('使用二维成品', 'Use the 2D artwork')}</Button>
          </div>}
          {status === 'moving' && !canCapture && command.sequence === 0 && <div className={s.sceneMessage} role="status">
            {t('正在加载地貌…', 'Loading terrain…')}
          </div>}
          {status !== 'unavailable' && <div className={s.sceneFooter}>
            {status === 'world' && <button className={s.cameraButton} type="button" onClick={() => moveTo('world', true)}>
              {t('复位视角', 'Reset view')}
            </button>}
            {(status === 'front' || status === 'tilted') && <button className={s.cameraButton} type="button"
              onClick={() => moveTo(status === 'front' ? 'tilted' : 'front', true)}>
              {status === 'front' ? t('倾斜观察', 'Tilt view') : t('返回正视', 'Front view')}
            </button>}
          </div>}
        </div>
        {scanMessage && <p className={s.notice} role="status">{scanMessage}</p>}
        <div className={s.toolbar}>
          <div className={s.compose}>
            <TextAreaField ref={input} label={t('文本或网址', 'Text or URL')} rows={1} value={displayQrText(recipe.content)}
            onChange={content => editContent(editQrText(recipe.content, content))}
            onPaste={event => {
              const pasted = event.clipboardData.getData('text/plain');
              if (!pasted.includes('\r')) return;
              event.preventDefault();
              const { selectionStart, selectionEnd } = event.currentTarget;
              pasteCaret.current = selectionStart + displayQrText(pasted).length;
              editContent(replaceQrText(recipe.content, selectionStart, selectionEnd, pasted));
            }}/>
            {job.busy ? <Button onClick={() => { attempted.current = { matrix, artwork: recipe.artwork, output }; job.invalidate(); }}>
              {t('取消二维生成', 'Cancel 2D generation')}
            </Button> : <Button variant="primary" aria-label={t('生成二维码', 'Generate QR code')}
              onClick={() => { moveTo('front'); start(); }} disabled={!matrix}>
              {t('生成', 'Generate')}
            </Button>}
          </div>
          <div className={s.tools}>
            <div className={s.terrainChips} role="group" aria-label={t('选择地貌', 'Choose terrain')}>
              {terrainIds.map(id => <button type="button" key={id} aria-pressed={recipe.terrain.id === id}
                onClick={() => selectTerrain(id)}>{t(terrainLabels[id][2], terrainLabels[id][1])}</button>)}
            </div>
            <div className={s.exports}>
              <Button size="sm" variant="ghost" aria-expanded={optionsOpen} aria-controls="qr-art-options"
                onClick={() => setOptionsOpen(open => !open)}>{t('二维成品与设置', '2D artwork & settings')}</Button>
              <Button size="sm" variant="ghost" disabled={!canCapture || status === 'moving' || status === 'unavailable' || (view === 'qr' && !matrix)}
                onClick={() => void downloadScene()}>{t('下载沙盘 PNG', 'Download diorama PNG')}</Button>
            </div>
          </div>
          <ErrorText error={matrixError || job.error} />
          {captureError && <p role="alert" className={s.hint}>{t('无法保存当前三维画面。', 'Could not save the current 3D frame.')}</p>}
        </div>
      </div>
      <div id="qr-art-options" hidden={!optionsOpen}>
        {optionsOpen && <div className={s.settings} data-qr-2d>
          <section className={form.settingsPanel} aria-label={t('二维码设置', 'QR settings')}>
            <fieldset className={s.fieldset}>
              <legend>{t('艺术风格', 'Art style')}</legend>
              <div className={s.swatches}>
                {artStyleIds.map((id, i) => {
                  const selected = !output.standard && recipe.artwork.id === id;
                  return (
                    <button key={id} type="button" className={s.swatch} aria-pressed={selected}
                      onClick={() => chooseStyle(id)}>
                      <img src={thumbnails[i]} alt="" width={288} height={288} />
                      <span>{t(artLabels[id][0], artLabels[id][1])}</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className={s.standard} aria-pressed={output.standard}
                onClick={() => editOutput({ standard: !output.standard })}>
                {t('标准样式', 'Standard style')}
              </Button>
            </fieldset>
            {output.standard && <div className={s.fields}>
              <TextField label={t('前景色 HEX', 'Foreground HEX')} value={output.fg} onChange={fg => editOutput({ fg })} />
              <TextField label={t('背景色 HEX', 'Background HEX')} value={output.bg} onChange={bg => editOutput({ bg })} />
          </div>}
          <div className={s.fields}>
            <TextField label={t('输出尺寸（像素）', 'Output size (pixels)')} value={output.size}
              inputMode="numeric" onChange={size => editOutput({ size })} />
            <fieldset className={s.fieldset}>
              <legend>{t('纠错等级', 'Error correction')}</legend>
              <div className={form.segmented}>
                {errorCorrectionLevels.map(level => (
                  <button key={level} type="button" className={`${form.segment} ${recipe.qr.errorCorrectionLevel === level ? form.segmentSelected : ''}`}
                    aria-pressed={recipe.qr.errorCorrectionLevel === level}
                    onClick={() => editRecipe(current => ({ ...current, qr: { errorCorrectionLevel: level } }))}>
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className={s.actions}>
            <Copy locale={locale} value={recipe.content} />
            <Button onClick={() => {
              job.invalidate();
              setRecipe(createDefaultRecipe());
              setOutput(initialOutput);
            }}>{t('重置', 'Reset')}</Button>
          </div>
        </section>
        <section className={`${form.settingsPanel} ${s.preview}`} aria-labelledby="qr-preview-title">
          <h2 id="qr-preview-title" className={form.settingsTitle}>{t('二维成品', '2D artwork')}</h2>
          <div className={s.stage}>
            {result && url ? <img src={url} width={result.size} height={result.size}
              alt={t('生成的二维码', 'Generated QR code')} /> : <p className={s.hint} role="status">
              {job.busy ? t('正在绘制并读回二维码…', 'Rendering and checking the QR code…')
                : t('预览会在扫码验证通过后显示。', 'The preview appears after the scan check passes.')}
            </p>}
          </div>
          {fallback && <p className={s.hint} role="status">{fallback.reason === 'density'
            ? t(`艺术样式至少需要 ${fallback.minimum} px。已改用通过验证的标准样式。`,
              `This artwork needs at least ${fallback.minimum} px. Showing a verified standard QR code.`)
            : t('艺术样式未能读回原文。已改用通过验证的标准样式。',
              'The artwork could not be read back. Showing a verified standard QR code.')}</p>}
          {result && !fallback && <p className={s.hint} role="status">
            {t('已通过软件扫码验证', 'Passed the software scan check')}
          </p>}
          <div className={s.actions}>
            <Button disabled={!result} onClick={() => result && saveBlob(result.png, 'qr-code.png')}>{t('下载 2D PNG', 'Download 2D PNG')}</Button>
            <Button disabled={!result} onClick={() => result && saveBlob(result.svg, 'qr-code.svg')}>{t('下载 2D SVG', 'Download 2D SVG')}</Button>
          </div>
          <div className={s.licenses}>
            <a href={notice} data-qr-license={notice}>qrcode</a>
            <a href={decoderNotice}>jsQR</a>
            <a href={graphicsNotice}>Three.js / R3F</a>
          </div>
        </section>
        </div>}
      </div>
    </Frame>
  );
}
