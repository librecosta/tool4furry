import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyIcon, DownloadSimpleIcon, FileArrowUpIcon, ImageIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { SliderField } from '../../ui/SliderField';
import { TextField } from '../../ui/TextField';
import { ErrorText, Picker, saveBlob, useBlobUrl } from '../general/ui';
import { MiB } from '../general/bounds';
import { useJob } from '../general/use-job';
import type { ImageLimits } from '../image/limits';
import type { ImageSource } from '../image/types';
import type { Locale } from '../../i18n/locale';
import { createSvgNamer, embedSvg, imageAccept, outputSize, pixelData, prepareEmbeddedBitmap, readBitmap, renderRaster, svgMime } from './core';
import { BackgroundChoice, Choice, Preview, type Backdrop, type Translate, type ViewMode } from './Preview';
import { tracePresets, tracingSize, type TraceSettings, type VectorResult } from './vector';
import { validateSvg } from './policy';
import s from './studio.module.scss';

const units = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < MiB
  ? (bytes / 1024).toFixed(1) + ' KiB' : (bytes / MiB).toFixed(2) + ' MiB';
type Input = { source: ImageSource; data?: string };

export default function BitmapStudio({ embed, locale, t, limits, nameOutput }: {
  embed: boolean; locale: Locale; t: Translate; limits: ImageLimits; nameOutput: ReturnType<typeof createSvgNamer>;
}) {
  const [input, setInput] = useState<Input>();
  const [settings, setSettings] = useState<TraceSettings>(tracePresets.logo);
  const [lastTrace, setLastTrace] = useState<{ input: Input; settings: TraceSettings; result: VectorResult }>();
  const [mode, setMode] = useState<ViewMode>(embed ? 'side' : 'compare');
  const [sourceView, setSourceView] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>('grid');
  const [feedback, setFeedback] = useState('');
  const [size, setSize] = useState({ width: '', height: '' });
  const [locked, setLocked] = useState(true);
  const [contain, setContain] = useState<'contain' | 'cover'>('contain');
  const [transparent, setTransparent] = useState(true);
  const [color, setColor] = useState('#ffffff');
  const [failedBlob, setFailedBlob] = useState<Blob>();
  const picker = useRef<HTMLInputElement>(null);
  const imported = useJob<Input>(locale), trace = useJob<void>(locale), clipboard = useJob<void>(locale);
  const source = input?.source;
  const work = source ? tracingSize(source.width, source.height, settings.preset) : undefined;
  const reduced = source && work && (work.width !== source.width || work.height !== source.height);

  useEffect(() => {
    if (!imported.result) return;
    const next = imported.result;
    setInput(next);
    setSize({ width: String(next.source.width), height: String(next.source.height) });
    setLastTrace(undefined);
    setFeedback('');
  }, [imported.result]);

  const embedded = useMemo(() => {
    if (!input?.data) return;
    try {
      const dims = outputSize(Number(size.width), Number(size.height));
      const xml = embedSvg(dims, input.data, contain, transparent ? undefined : color);
      return { xml, ...dims };
    } catch { return undefined; }
  }, [input, size, contain, transparent, color]);
  const result = embed ? embedded : lastTrace?.result;
  const blob = useMemo(() => result && new Blob([result.xml], { type: svgMime }), [result]);
  const url = useBlobUrl(blob);
  const original = useBlobUrl(source?.blob);
  const stale = Boolean(lastTrace && (lastTrace.input !== input || lastTrace.settings !== settings || trace.busy));
  const eligible = Boolean(result && blob && failedBlob !== blob && !imported.busy && !imported.error &&
    (!imported.result || imported.result === input) && !stale);
  const activeMode = !result && !embed ? 'original' : mode;
  const update = <K extends keyof TraceSettings>(key: K, value: TraceSettings[K]) => {
    if (settings[key] === value) return;
    trace.invalidate();
    clipboard.invalidate();
    setFeedback('');
    setSettings(previous => ({ ...previous, [key]: value }));
  };
  const load = (file?: File) => {
    if (!file) return;
    trace.invalidate();
    clipboard.invalidate();
    setFeedback('');
    void imported.run(async signal => {
      const source = await readBitmap(file, limits);
      signal.throwIfAborted();
      const data = embed ? await prepareEmbeddedBitmap(source, signal) : undefined;
      return { source, data };
    });
  };
  const run = () => {
    if (!input || !source || !work || trace.busy) return;
    setFeedback('');
    clipboard.invalidate();
    void trace.run(async signal => {
      const pixels = await pixelData(source, work, signal, settings.preset === 'pixel');
      const { traceInWorker } = await import('./trace-client');
      const result = await traceInWorker(pixels, settings, signal);
      signal.throwIfAborted();
      await validateSvg(result.xml, signal);
      if (!signal.aborted) setLastTrace({ result, input, settings });
    });
  };
  const dimension = (key: 'width' | 'height', value: string) => {
    clipboard.invalidate();
    const next = { ...size, [key]: value };
    if (source && locked && /^\d+$/.test(value) && Number(value) > 0) {
      if (key === 'width') next.height = String(Math.max(1, Math.round(+value * source.height / source.width)));
      else next.width = String(Math.max(1, Math.round(+value * source.width / source.height)));
    }
    setSize(next);
  };
  const traceStats = lastTrace?.result;
  const details = traceStats
    ? [traceStats.count + t(' 个路径', ' paths'), units(blob?.size ?? 0), traceStats.width + ' × ' + traceStats.height,
        traceStats.elapsed < 1000 ? Math.round(traceStats.elapsed) + ' ms' : (traceStats.elapsed / 1000).toFixed(2) + ' s'].join(' · ')
    : result && blob ? result.width + ' × ' + result.height + ' · ' + units(blob.size) : '';
  const supportsClipboard = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  const canCopyPng = eligible && result && result.width * result.height <= 16_000_000;
  const copyPng = () => {
    if (!canCopyPng || !result) return;
    setFeedback('');
    void clipboard.run(async signal => {
      const job = validateSvg(result.xml, signal).then(svg => renderRaster(svg, result, 'png', 100, undefined, signal));
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': job })]);
        if (!signal.aborted) setFeedback(t('PNG 已复制', 'PNG copied'));
      } catch (error) { await job.catch(() => {}); throw error; }
    });
  };

  return <div className={s.stack} data-svg-bitmap={embed ? 'embed' : 'vectorize'}>
    {!input ? <div className={s.drop}>
      <Picker locale={locale} accept={imageAccept} multiple={false} disabled={imported.busy} onFiles={files => load(files[0])}/>
      {imported.busy && <p role="status">{t('正在验证和解码图片…', 'Validating and decoding image…')}</p>}
      <ErrorText error={imported.error}/>
      {embed && <p className={s.info}>{t('图片将内嵌到 SVG 中，仍然是位图，不会获得无限缩放能力。', 'The image is embedded in an SVG document. It remains a raster image and does not gain infinite scalability.')}</p>}
    </div> : <>
      <div className={s.fileLine}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
        onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); load(event.dataTransfer.files[0]); } }}>
        <span className={s.fileIcon}><ImageIcon size={22} /></span>
        <div><strong title={source!.file.name}>{source!.file.name}</strong>
          <span className={s.info}>{source!.width} × {source!.height} · {source!.info.format.toUpperCase()} · {units(source!.file.size)}</span></div>
        <input ref={picker} hidden type="file" accept={imageAccept} onChange={event => { load(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/>
        <Button size="sm" variant="ghost" className={s.fieldButton} onClick={() => picker.current?.click()} loading={imported.busy}><FileArrowUpIcon size={15}/>{t('更换图片', 'Replace image')}</Button>
      </div>
      <div className={s.bitmapLayout}>
        <section className={s.bitmapPreview}>
          <header className={s.panelHead}>
            <strong>{sourceView ? t('SVG 源码', 'SVG source') : t('原图与转换结果', 'Original and result')}</strong>
            <div className={s.compactActions}>
              <Choice label={t('图片视图', 'Image view')} value={sourceView ? 'source' : activeMode} onChange={value => {
                if (value === 'source') setSourceView(true);
                else { setMode(value as ViewMode); setSourceView(false); }
              }} items={[
                ...(!embed ? [{ value: 'compare', label: t('对比', 'Compare'), disabled: !result }] : []),
                { value: 'side', label: t('并排', 'Side by side'), disabled: !result },
                { value: 'original', label: t('仅原图', 'Original') },
                { value: 'result', label: t('仅结果', 'Result'), disabled: !result },
                { value: 'source', label: t('SVG 源码', 'SVG source'), disabled: !result },
              ]}/>
            </div>
          </header>
          {sourceView && result ? <pre className={s.resultSource} aria-label={t('生成的 SVG 源码', 'Generated SVG source')}>
            {result.xml.slice(0, 65536)}{result.xml.length > 65536 && '\n… ' + t('使用复制或下载获取完整文件。', 'Copy or download to get the complete file.')}
          </pre> : <Preview t={t} background={backdrop} mode={activeMode} pixelated={!embed && settings.preset === 'pixel'}
            original={original && source ? { ...source, url: original, alt: t('原始图片', 'Original image') } : undefined}
            result={result && url ? { ...(!embed && (activeMode === 'compare' || activeMode === 'side') && source ? source : result),
              url, alt: embed ? t('封装预览', 'Embedded result') : t('矢量结果', 'Vector result') } : undefined}
            status={(stale ? t('结果已过期 · ', 'Result out of date · ') : '') + details}
            onError={blob ? () => setFailedBlob(blob) : undefined}/>}
          <div className={s.previewTail}>
            <BackgroundChoice t={t} value={backdrop} onChange={setBackdrop}/>
            <Button size="sm" variant="ghost" disabled={!eligible || !result || !navigator.clipboard?.writeText} onClick={() => {
              if (result) void navigator.clipboard.writeText(result.xml).then(() => setFeedback(t('已复制 SVG 源码', 'SVG source copied')), () => setFeedback(t('无法访问剪贴板', 'Clipboard unavailable')));
            }}><CopyIcon size={15}/>{t('复制 SVG 源码', 'Copy SVG source')}</Button>
            {supportsClipboard && <Button size="sm" variant="ghost" disabled={!canCopyPng} loading={clipboard.busy} onClick={copyPng}>{t('复制 PNG', 'Copy PNG')}</Button>}
          </div>
        </section>
        <aside className={s.settings}>
          <strong>{embed ? t('封装设置', 'Embed settings') : t('矢量化设置', 'Vectorization settings')}</strong>
          {embed ? <>
            <p className={s.info}>{t('图片将内嵌到 SVG 中，仍然是位图，不会获得无限缩放能力。', 'The image is embedded in an SVG document. It remains a raster image and does not gain infinite scalability.')}</p>
            <div className={s.dimensionPair}>
              <TextField label={t('宽度 (px)', 'Width (px)')} inputMode="numeric" value={size.width} onChange={value => dimension('width', value)}/>
              <TextField label={t('高度 (px)', 'Height (px)')} inputMode="numeric" value={size.height} onChange={value => dimension('height', value)}/>
            </div>
            <CheckboxField label={t('保持原始宽高比', 'Lock original aspect ratio')} checked={locked} onCheckedChange={setLocked}/>
            <div className={s.setting}><label>{t('图片适应', 'Image fit')}</label>
              <Choice label={t('图片适应', 'Image fit')} value={contain} onChange={value => { clipboard.invalidate(); setContain(value); }}
                items={[{ value: 'contain', label: t('完整显示', 'Contain') }, { value: 'cover', label: t('填满画布', 'Cover') }]}/></div>
            <div className={s.backgroundOption}>
              <CheckboxField label={t('透明背景', 'Transparent')} checked={transparent} onCheckedChange={value => { clipboard.invalidate(); setTransparent(value); }}/>
              {!transparent && <input type="color" aria-label={t('自定义背景颜色', 'Custom background color')} value={color} onChange={event => { clipboard.invalidate(); setColor(event.target.value); }}/>}
            </div>
            {!result && <p className={s.info}>{t('请输入符合预算的整数宽高。', 'Enter whole-pixel dimensions within the output budget.')}</p>}
          </> : <>
            <div className={s.setting}><label>{t('图片类型', 'Image type')}</label>
              <Choice label={t('图片类型', 'Image type')} value={settings.preset} onChange={preset => {
                trace.invalidate(); clipboard.invalidate(); setSettings(tracePresets[preset]); setFeedback('');
              }} items={[
                { value: 'logo', label: t('标志', 'Logo & icon') }, { value: 'illustration', label: t('插画', 'Illustration') },
                { value: 'photo', label: t('照片', 'Photo') }, { value: 'line', label: t('线稿', 'Line art') }, { value: 'pixel', label: t('像素画', 'Pixel art') },
              ]}/></div>
            {settings.preset !== 'pixel' ? <>
              <div className={s.setting}><label>{t('颜色模式', 'Color mode')}</label>
                <Choice label={t('颜色模式', 'Color mode')} value={settings.color} onChange={value => update('color', value)}
                  items={[{ value: 'color', label: t('彩色', 'Color') }, { value: 'mono', label: t('黑白', 'Black and white') }]}/></div>
              {settings.color === 'color'
                ? <SliderField label={t('颜色数', 'Colors')} value={settings.colors} min={2} max={24} onValueChange={value => update('colors', value)}/>
                : <SliderField label={t('黑白阈值', 'Threshold')} value={settings.threshold} min={0} max={255} onValueChange={value => update('threshold', value)}/>}
              <SliderField label={t('细节保留', 'Detail')} value={settings.detail} onValueChange={value => update('detail', value)}/>
              {settings.fit === 'curves' && <SliderField label={t('曲线平滑', 'Smoothing')} value={settings.smooth} onValueChange={value => update('smooth', value)}/>}
              <div className={s.setting}><label>{t('路径拟合', 'Path fit')}</label>
                <Choice label={t('路径拟合', 'Path fit')} value={settings.fit} onChange={value => update('fit', value)}
                  items={[{ value: 'curves', label: t('平滑曲线', 'Curves') }, { value: 'polygon', label: t('直线轮廓', 'Polygons') }]}/></div>
            </> : <p className={s.info}>{t('合并同色像素区域，保留像素边缘和透明度。', 'Merge same-color regions while preserving pixel edges and transparency.')}</p>}
            <p className={s.info}>{work ? t('处理尺寸 ', 'Working size ') + work.width + ' × ' + work.height +
              (reduced ? t('。按比例缩小用于描摹。', '. Resized proportionally for tracing.') : '')
              : t('像素画需使用 ≤4 MP、单边 ≤4096 px 的原图。', 'Pixel art needs an unscaled image within 4 MP and 4096 px per edge.')}</p>
            {trace.busy ? <Button variant="ghost" className={s.fieldButton} onClick={trace.invalidate}>{t('取消任务', 'Cancel tracing')}</Button>
              : <Button variant="ghost" className={s.fieldButton} onClick={run} disabled={!work || imported.busy}>{lastTrace ? t('重新矢量化', 'Trace again') : t('开始矢量化', 'Vectorize')}</Button>}
          </>}
          <Button variant="primary" disabled={!eligible} onClick={() => { if (blob) saveBlob(blob, nameOutput(source!.file.name, 'svg')); }}>
            <DownloadSimpleIcon size={17}/>{t('下载 SVG', 'Download SVG')}</Button>
        </aside>
      </div>
      <ErrorText error={imported.error ?? trace.error ?? clipboard.error}/>
      {(feedback || trace.busy || stale) && <p role="status" className={s.status}>{feedback || (trace.busy
        ? t('正在矢量化…', 'Tracing…') : t('设置已更改。请重新矢量化后下载。', 'Settings changed. Trace again to download.'))}</p>}
    </>}
  </div>;
}
