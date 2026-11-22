import { Component, lazy, Suspense, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ToolProps } from '../types';
import { TextField, TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, ErrorText, tr, Copy, saveBlob, useBlobUrl } from '../general/ui';
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
import { artStyleIds, errorCorrectionLevels, type ArtStyleId, type QrRecipeV1 } from './recipe/types';
import { validateRecipe } from './recipe/validate';
import { displayQrText, editQrText, replaceQrText } from './qr-input';
import notice from './qrcode.NOTICE.txt?url';
import decoderNotice from './art/jsqr.NOTICE.txt?url&no-inline';

const TerrainProbe = import.meta.env.DEV ? lazy(() => import('./graphics/TerrainProbe')) : null;
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

class ProbeBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p role="alert">{this.props.message}</p> : this.props.children;
  }
}

export default function QrCodeGenerator({ locale }: ToolProps) {
  const [recipe, setRecipe] = useState(createDefaultRecipe);
  const [output, setOutput] = useState(initialOutput);
  const [thumbnails] = useState(makeThumbnails);
  const [probeOpen, setProbeOpen] = useState(false);
  const job = useJob<VerifiedQr>(locale);
  const url = useBlobUrl(job.result?.png);
  const matrixCache = useRef<{ content: string; level: QrRecipeV1['qr']['errorCorrectionLevel']; matrix: ReturnType<typeof createWorkspaceMatrix> }>(null);
  const attempted = useRef<{ recipe: QrRecipeV1; output: typeof initialOutput }>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const pasteCaret = useRef<number>(null);
  const t = (zh: string, en: string) => tr(locale, zh, en);

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
    attempted.current = { recipe, output };
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
      let cached = matrixCache.current;
      const level = recipe.qr.errorCorrectionLevel;
      if (cached?.content !== recipe.content || cached.level !== level) {
        cached = { content: recipe.content, level, matrix: createWorkspaceMatrix(recipe) };
        matrixCache.current = cached;
      }
      const validated = validateRecipe(recipe);
      return generateVerifiedQr(cached.matrix, validated.content, size,
        custom ? { kind: 'standard', colors: custom } : { kind: 'artistic', recipe: validated }, signal);
    });
  };
  const generatePreview = useEffectEvent(start);
  useEffect(() => {
    if (job.busy || !recipe.content.trim() ||
        (attempted.current?.recipe === recipe && attempted.current.output === output)) return;
    const timer = window.setTimeout(() => generatePreview(), 300);
    return () => window.clearTimeout(timer);
  }, [job.busy, recipe, output]);

  const result = job.result;
  const fallback = result?.fallback;
  return (
    <Frame locale={locale}>
      <div className={s.workspace} data-qr-artwork>
        <section className={form.settingsPanel} aria-label={t('二维码设置', 'QR settings')}>
          <TextAreaField ref={input} label={t('文本或网址', 'Text or URL')} rows={3} value={displayQrText(recipe.content)}
            onChange={content => editContent(editQrText(recipe.content, content))}
            onPaste={event => {
              const pasted = event.clipboardData.getData('text/plain');
              if (!pasted.includes('\r')) return;
              event.preventDefault();
              const { selectionStart, selectionEnd } = event.currentTarget;
              pasteCaret.current = selectionStart + displayQrText(pasted).length;
              editContent(replaceQrText(recipe.content, selectionStart, selectionEnd, pasted));
            }}/>
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
            {job.busy ? <Button onClick={() => { attempted.current = { recipe, output }; job.invalidate(); }}>
              {t('取消', 'Cancel')}
            </Button> : <Button variant="primary" onClick={start} disabled={!recipe.content.trim()}>
              {t('生成二维码', 'Generate QR code')}
            </Button>}
            <Copy locale={locale} value={recipe.content} />
            <Button onClick={() => {
              job.invalidate();
              setRecipe(createDefaultRecipe());
              setOutput(initialOutput);
            }}>{t('重置', 'Reset')}</Button>
          </div>
        </section>
        <section className={`${form.settingsPanel} ${s.preview}`} aria-labelledby="qr-preview-title">
          <h2 id="qr-preview-title" className={form.settingsTitle}>{t('二维码预览', 'QR preview')}</h2>
          <div className={s.stage}>
            {result && url ? <img src={url} width={result.size} height={result.size}
              alt={t('生成的二维码', 'Generated QR code')} /> : <p className={s.hint} role="status">
              {job.busy ? t('正在绘制并读回二维码…', 'Rendering and checking the QR code…')
                : t('预览会在扫码验证通过后显示。', 'The preview appears after the scan check passes.')}
            </p>}
          </div>
          <ErrorText error={job.error} />
          {fallback && <p className={s.hint} role="status">{fallback.reason === 'density'
            ? t(`艺术样式至少需要 ${fallback.minimum} px。已改用通过验证的标准样式。`,
              `This artwork needs at least ${fallback.minimum} px. Showing a verified standard QR code.`)
            : t('艺术样式未能读回原文。已改用通过验证的标准样式。',
              'The artwork could not be read back. Showing a verified standard QR code.')}</p>}
          {result && !fallback && <p className={s.hint} role="status">
            {t('已通过软件扫码验证', 'Passed the software scan check')}
          </p>}
          <div className={s.actions}>
            <Button disabled={!result} onClick={() => result && saveBlob(result.png, 'qr-code.png')}>{t('下载 PNG', 'Download PNG')}</Button>
            <Button disabled={!result} onClick={() => result && saveBlob(result.svg, 'qr-code.svg')}>{t('下载 SVG', 'Download SVG')}</Button>
          </div>
          <div className={s.licenses}>
            <a href={notice} data-qr-license={notice}>qrcode</a>
            <a href={decoderNotice}>jsQR</a>
          </div>
        </section>
      </div>
      {TerrainProbe && (
        <div>
          <Button variant="ghost" size="sm" aria-expanded={probeOpen} onClick={() => setProbeOpen(open => !open)}>
            {probeOpen ? tr(locale, '关闭 3D 验证', 'Close 3D probe') : tr(locale, '打开 3D 验证', 'Open 3D probe')}
          </Button>
          {probeOpen && (
            <ProbeBoundary message={tr(locale, '3D 图形不可用。可以继续生成二维码。', '3D graphics are unavailable. You can still generate QR codes.')}>
              <Suspense fallback={<p role="status">{tr(locale, '正在加载 3D…', 'Loading 3D…')}</p>}>
                <TerrainProbe locale={locale} />
              </Suspense>
            </ProbeBoundary>
          )}
        </div>
      )}
    </Frame>
  );
}
