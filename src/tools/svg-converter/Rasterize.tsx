import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { xml } from '@codemirror/lang-xml';
import { foldGutter, foldKeymap, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { CopyIcon, DownloadSimpleIcon, FileArrowUpIcon, MagnifyingGlassIcon, LockSimpleIcon, LockSimpleOpenIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { TextField } from '../../ui/TextField';
import { SliderField } from '../../ui/SliderField';
import { CheckboxField } from '../../ui/CheckboxField';
import { useJob } from '../general/use-job';
import { ErrorText, errorText, saveBlob, useBlobUrl } from '../general/ui';
import { detectCapabilities, type Capabilities } from '../image/browser-codec';
import { type ImageLimits, avifOutputLimits } from '../image/limits';
import { ImageResources } from '../image/resources';
import type { AvifEncoder } from '../image/avif-encoder';
import type { Locale } from '../../i18n/locale';
import { validateSvg, formatSvg, sourceEditorLimit, type StaticSvg } from './policy';
import { createSvgNamer, icoSizes, outputSize, previewSize, readSvgFile, renderIco, renderRaster, sizedSvg, type IconSize, type RasterFormat, type Size } from './core';
import { BackgroundChoice, Choice, Preview, type Backdrop, type Translate } from './Preview';
import svgSample from './librecosta-black-white.svg?raw';
import s from './studio.module.scss';

type Source = { text: string; name: string; verified?: StaticSvg };
const sample: Source = { text: svgSample, name: 'librecosta-black-white.svg' };
const aspect = (svg?: StaticSvg) => svg?.width && svg?.height ? svg.width / svg.height : undefined;
const formatLabels: RasterFormat[] = ['png', 'jpeg', 'webp', 'avif', 'ico'];
const editorLabel = (t: Translate) => t('SVG 源码', 'SVG source');
const xmlHighlight = HighlightStyle.define([
  { tag: tags.tagName, color: 'var(--t4f-accent)', fontWeight: '600' },
  { tag: tags.attributeName, color: 'var(--t4f-info)' },
  { tag: [tags.attributeValue, tags.string], color: 'var(--t4f-positive)' },
  { tag: [tags.angleBracket, tags.punctuation, tags.comment, tags.meta], color: 'var(--t4f-text-secondary)' },
  { tag: tags.character, color: 'var(--t4f-warning)' },
]);

export function Rasterize({ locale, t, imageLimits, nameOutput }: {
  locale: Locale; t: Translate; imageLimits: ImageLimits; nameOutput: ReturnType<typeof createSvgNamer>;
}) {
  const [source, setSource] = useState<Source>(sample);
  const [checked, setChecked] = useState<{ source: Source; svg: StaticSvg }>();
  const [issue, setIssue] = useState<{ source: Source; message: string }>();
  const [failedPreview, setFailedPreview] = useState<Blob>();
  const [background, setBackground] = useState<Backdrop>('grid');
  const [display, setDisplay] = useState<'source' | 'preview'>('source');
  const [split, setSplit] = useState(50);
  const [format, setFormat] = useState<RasterFormat>('png');
  const [scale, setScale] = useState('4');
  const [custom, setCustom] = useState({ width: '', height: '' });
  const [locked, setLocked] = useState(true);
  const [transparent, setTransparent] = useState(true);
  const [color, setColor] = useState('#ffffff');
  const [quality, setQuality] = useState(90);
  const [icons, setIcons] = useState<IconSize[]>([16, 32, 48, 256]);
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [feedback, setFeedback] = useState('');
  const [editorLimit, setEditorLimit] = useState(false);
  const input = useRef<HTMLInputElement>(null), editor = useRef<HTMLDivElement>(null), splitArea = useRef<HTMLDivElement>(null);
  const avif = useRef<AvifEncoder | null>(null);
  const js = useJob<void>(locale), imported = useJob<Source>(locale);

  useEffect(() => {
    let current = true;
    void detectCapabilities(new ImageResources(), imageLimits).then(value => { if (current) setCapabilities(value); });
    return () => { current = false; avif.current?.dispose(); avif.current = null; };
  }, [imageLimits]);
  useEffect(() => {
    if (source.verified) { setChecked({ source, svg: source.verified }); return; }
    const controller = new AbortController();
    if (!source.text.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const svg = await validateSvg(source.text, controller.signal);
        if (!controller.signal.aborted) setChecked({ source, svg });
      } catch (error) {
        if (!controller.signal.aborted) setIssue({ source, message: errorText(error, locale) });
      }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [source, locale]);
  useEffect(() => {
    if (imported.result) {
      setSource(imported.result);
      setFeedback('');
      setEditorLimit(false);
    }
  }, [imported.result]);

  const raw = checked?.svg;
  const ratio = aspect(raw);
  const scaled = raw?.width && raw.height && /^\d+(?:\.\d+)?$/.test(scale) && +scale > 0 && +scale <= 128;
  const width = custom.width || (scaled ? String(Math.max(1, Math.round(raw!.width! * +scale))) : '');
  const height = custom.height || (scaled ? String(Math.max(1, Math.round(raw!.height! * +scale))) : '');
  const cap = format === 'avif' ? avifOutputLimits : undefined;
  let size: Size | undefined;
  if (format !== 'ico') {
    try { size = outputSize(Number(width), Number(height), cap?.pixels, cap?.edge); }
    catch { /* Dimensions remain editable. */ }
  }
  const viewportWidth = raw?.width ?? Number(width);
  const viewportHeight = raw?.height ?? Number(height);
  const preview = useMemo(() => {
    if (!raw || !viewportWidth || !viewportHeight || !Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight)
      || viewportWidth > 1e7 || viewportHeight > 1e7) return;
    const dims = { width: viewportWidth, height: viewportHeight };
    return { dims, blob: sizedSvg(raw, previewSize(dims), dims) };
  }, [raw, viewportWidth, viewportHeight]);
  const url = useBlobUrl(preview?.blob);
  const valid = checked?.source === source && !imported.busy && !imported.error &&
    (!imported.result || imported.result === source) && (!preview || preview.blob !== failedPreview);
  const stale = checked && (!valid || issue?.source === source);
  const isLarge = source.text.length > sourceEditorLimit;
  const currentError = js.error ?? imported.error ?? (issue?.source === source ? issue.message : undefined);
  const clipboardImage = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  const canExport = valid && raw && (format === 'ico' ? icons.length > 0 && !!preview : size && (format === 'png' || capabilities?.[format].supported));
  const onChange = (text: string, name?: string) => {
    js.invalidate();
    imported.invalidate();
    setFeedback('');
    setEditorLimit(false);
    setSource(previous => ({ text, name: name ?? previous.name }));
  };
  const editorExtensions = useMemo(() => [
    xml(), search({ top: true }), foldGutter(), syntaxHighlighting(xmlHighlight),
    keymap.of([...searchKeymap, ...foldKeymap]),
    EditorState.changeFilter.of(transaction => {
      if (transaction.newDoc.length <= sourceEditorLimit) return true;
      queueMicrotask(() => setEditorLimit(true));
      return false;
    }),
  ], []);
  const selectFile = (file?: File) => {
    if (!file) return;
    js.invalidate();
    void imported.run(signal => readSvgFile(file, signal).then(({ text, name, svg }) => ({ text, name, verified: svg })));
  };
  const moveSplit = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = splitArea.current?.getBoundingClientRect();
    if (bounds) setSplit(Math.max(28, Math.min(72, (event.clientX - bounds.x) / bounds.width * 100)));
  };
  const getEditor = () => {
    const element = editor.current?.querySelector<HTMLElement>('.cm-editor');
    return element ? EditorView.findFromDOM(element) : null;
  };
  const dimension = (value: string, key: keyof Size) => {
    js.invalidate();
    setScale('');
    const opposite = key === 'width' ? 'height' : 'width';
    const n = Number(value);
    setCustom({ width, height, [key]: value, ...(locked && ratio && /^\d+$/.test(value) && n > 0
      ? { [opposite]: String(Math.max(1, Math.round(key === 'width' ? n / ratio : n * ratio))) } : {}) });
  };
  const setMultiplier = (value: string) => { js.invalidate(); setScale(value); setCustom({ width: '', height: '' }); };
  const updateFormat = (value: RasterFormat) => { js.invalidate(); setFormat(value); };
  const matte = transparent ? undefined : color;
  const deliver = (copy: boolean) => {
    if (!valid || !raw || js.busy || (copy ? !size : !canExport)) return;
    setFeedback('');
    void js.run(async signal => {
      if (copy && size) {
        const job = renderRaster(raw, size, 'png', quality, matte, signal);
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': job })]);
          if (!signal.aborted) setFeedback(t('PNG 已复制', 'PNG copied'));
        } catch (error) {
          await job.catch(() => {});
          throw error;
        }
        return;
      }
      if (format === 'avif' && !avif.current) {
        const { AvifEncoder: Encoder } = await import('../image/avif-encoder');
        signal.throwIfAborted();
        avif.current = new Encoder();
      }
      const blob = format === 'ico'
        ? await renderIco(raw, icoSizes.filter(icon => icons.includes(icon)), signal, preview?.dims)
        : await renderRaster(raw, size!, format, quality, matte, signal, avif.current ?? undefined);
      if (!signal.aborted) saveBlob(blob, nameOutput(source.name, format));
    });
  };

  return <div className={s.stack} data-svg-rasterize>
    <Choice value={display} label={t('窄屏显示', 'Compact view')} className={s.compactView} onChange={setDisplay} items={[
      { value: 'source', label: t('编辑源码', 'Source') }, { value: 'preview', label: t('查看预览', 'Preview') },
    ]} />
    <div className={s.split} ref={splitArea} data-view={display} style={{ '--split': split + '%' } as CSSProperties}>
      <section className={s.sourcePane}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
        onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); selectFile(event.dataTransfer.files[0]); } }}>
        <header className={s.panelHead}>
          <strong>{editorLabel(t)}</strong>
          <div className={s.compactActions}>
            <input ref={input} type="file" accept=".svg,image/svg+xml" hidden onChange={event => { selectFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
            <Button size="sm" variant="ghost" onClick={() => input.current?.click()} disabled={imported.busy}><FileArrowUpIcon size={16}/>{t('导入', 'Import')}</Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(sample.text, sample.name)}>{t('示例', 'Sample')}</Button>
            <Button size="sm" variant="ghost" disabled={!valid || isLarge} onClick={() => {
              const view = getEditor();
              if (!view || !raw) return;
              const text = formatSvg(raw);
              if (text !== source.text) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, userEvent: 'input.format' });
            }}>{t('格式化', 'Format')}</Button>
            <IconButton size="sm" variant="ghost" label={t('查找替换', 'Find and replace')} disabled={isLarge} onClick={() => {
              const view = getEditor(); if (view) openSearchPanel(view);
            }}><MagnifyingGlassIcon size={15}/></IconButton>
            <IconButton size="sm" variant="ghost" label={t('复制源码', 'Copy SVG source')} onClick={() => {
              void navigator.clipboard.writeText(source.text).then(() => setFeedback(t('源码已复制', 'Source copied')), () => setFeedback(t('无法访问剪贴板', 'Clipboard unavailable')));
            }}><CopyIcon size={15}/></IconButton>
          </div>
        </header>
        <div ref={editor} className={s.editor}>
          {isLarge ? <div className={s.largeSource}><p>{t('文件超过源码编辑预算。可预览与转换完整文件。', 'This file exceeds the editor budget. The complete file is still available for preview and conversion.')}</p>
            <pre>{source.text.slice(0, 1800)}…</pre></div>
            : <TextEditor ariaLabel={editorLabel(t)} value={source.text} onChange={onChange} extensions={editorExtensions} />}
        </div>
        <footer className={s.paneFoot}>
          <span title={source.name}>{source.name}</span>
          <span>{raw?.width !== undefined && raw.height !== undefined ? Math.round(raw.width) + ' × ' + Math.round(raw.height) : t('未确定固有尺寸', 'No intrinsic dimensions')}</span>
          {raw?.viewBox && <span>viewBox {raw.viewBox.join(' ')}</span>}
        </footer>
      </section>
      <div className={s.divider} role="separator" tabIndex={0} aria-label={t('调整分栏', 'Resize panels')} aria-orientation="vertical"
        aria-valuemin={28} aria-valuemax={72} aria-valuenow={Math.round(split)}
        onDoubleClick={() => setSplit(50)}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); moveSplit(event); }}
        onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveSplit(event); }}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home') return;
          event.preventDefault();
          setSplit(previous => event.key === 'Home' ? 50 : Math.max(28, Math.min(72, previous + (event.key === 'ArrowLeft' ? -3 : 3))));
        }}><span/></div>
      <section className={s.previewPane}>
        <header className={s.panelHead}><strong>{t('实时预览', 'Live preview')}</strong>
          <BackgroundChoice t={t} value={background} onChange={setBackground}/>
        </header>
        <Preview t={t} background={background} mode="result" onError={preview ? () => setFailedPreview(preview.blob) : undefined}
          result={preview && url ? { ...preview.dims, url, alt: t('SVG 图形', 'SVG artwork') } : undefined}
          status={stale ? t('上一份有效预览 · 已过期', 'Last valid preview · out of date')
            : valid && preview ? t('有效 SVG', 'Valid SVG') : valid ? t('请指定图形宽高', 'Set the viewport width and height')
            : currentError ? t('无法预览当前源码', 'Current source cannot be previewed') : t('正在验证 SVG…', 'Validating SVG…')}/>
      </section>
    </div>
    <div className={s.output}>
      <div className={s.setting}>
        <label>{t('输出格式', 'Output format')}</label>
        <Choice value={format} label={t('输出格式', 'Output format')} onChange={updateFormat}
          items={formatLabels.map(value => ({ value, label: value.toUpperCase(), disabled: value !== 'png' && value !== 'ico' && !capabilities?.[value].supported }))}/>
      </div>
      {format === 'ico' ? <>
        <div className={s.setting}>
          <label>{t('图标尺寸', 'Icon sizes')}</label>
          <div role="group" aria-label={t('图标尺寸', 'Icon sizes')} className={s.choice}>
            {icoSizes.map(icon => <Button key={icon} variant="ghost" size="sm" aria-pressed={icons.includes(icon)}
              onClick={() => { js.invalidate(); setIcons(previous => previous.includes(icon) ? previous.filter(size => size !== icon) : [...previous, icon]); }}>{icon}</Button>)}
          </div>
        </div>
        {!ratio && <div className={s.dimensionPair}>
          <TextField label={t('视口宽度', 'Viewport width')} inputMode="numeric" value={width} onChange={value => dimension(value, 'width')}/>
          <TextField label={t('视口高度', 'Viewport height')} inputMode="numeric" value={height} onChange={value => dimension(value, 'height')}/>
        </div>}
      </> : <>
        <div className={s.setting}>
          <label>{t('倍率', 'Scale')}</label>
          <Choice value={scale} onChange={setMultiplier} label={t('预设倍率', 'Scale presets')}
            items={['1', '2', '4', '8'].map(value => ({ value, label: value + '×', disabled: !ratio }))}/>
        </div>
        <div className={s.scaleCustom}>
          <TextField label={t('自定义倍率', 'Custom scale')} value={scale} inputMode="decimal" disabled={!ratio} onChange={setMultiplier}/>
        </div>
        <div className={s.dimensionPair}>
          <TextField label={t('宽度 (px)', 'Width (px)')} inputMode="numeric" value={width} onChange={value => dimension(value, 'width')}/>
          <IconButton variant="ghost" size="sm" label={t('保持原始宽高比', 'Lock original aspect ratio')} aria-pressed={locked}
            onClick={() => setLocked(!locked)} disabled={!ratio}>{locked ? <LockSimpleIcon size={18}/> : <LockSimpleOpenIcon size={18}/>}</IconButton>
          <TextField label={t('高度 (px)', 'Height (px)')} inputMode="numeric" value={height} onChange={value => dimension(value, 'height')}/>
        </div>
        <div className={s.backgroundOption}>
          <CheckboxField label={format === 'jpeg' ? t('使用白底', 'Use white matte') : t('透明背景', 'Transparent')} checked={transparent}
            onCheckedChange={value => { js.invalidate(); setTransparent(value); }}/>
          {!transparent && <input aria-label={t('自定义背景颜色', 'Custom background color')} type="color" value={color}
            onChange={event => { js.invalidate(); setColor(event.target.value); }}/>}
        </div>
        {format !== 'png' && <div className={s.quality}>
          <SliderField label={t('质量', 'Quality')} value={quality} min={1} max={100} unit="%"
            onValueChange={value => { js.invalidate(); setQuality(value); }}/>
        </div>}
      </>}
      <div className={s.compactActions}>
        {format !== 'ico' && <Button variant="ghost" className={s.fieldButton} size="sm" disabled={!valid || !size || !clipboardImage || js.busy} onClick={() => deliver(true)}>
          <CopyIcon size={16}/>{t('复制 PNG', 'Copy PNG')}</Button>}
        <Button variant="primary" size="sm" loading={js.busy} disabled={!canExport} onClick={() => deliver(false)}>
          <DownloadSimpleIcon size={17}/>{t('下载', 'Download') + ' ' + format.toUpperCase()}</Button>
      </div>
    </div>
    <div className={s.status} role="status">
      {format === 'ico' ? icons.length + t(' 个图标尺寸 · 透明背景', ' icon sizes · transparent')
        : size ? size.width + ' × ' + size.height + ' · ' + (size.width * size.height / 1e6).toFixed(2) + ' MP'
        : t('请输入符合预算的整数宽高。', 'Enter whole-pixel dimensions within the output budget.')}
      {format === 'avif' && t(' · AVIF 最多 4.19 MP / 单边 4096 px', ' · AVIF up to 4.19 MP / 4096 px per edge')}
      {feedback && ' · ' + feedback}
      {editorLimit && ' · ' + t('源码编辑上限为 512 Ki 字符。请导入完整 SVG 文件。', 'Source editor limit is 512 Ki code units. Import the full SVG as a file.')}
    </div>
    <ErrorText error={currentError}/>
  </div>;
}
