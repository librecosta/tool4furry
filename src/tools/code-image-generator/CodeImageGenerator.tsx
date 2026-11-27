import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { Popover } from '@base-ui/react/popover';
import { CaretDownIcon, CodeIcon, CopySimpleIcon, DownloadSimpleIcon, FolderOpenIcon, ImageSquareIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { Frame, errorText, saveBlob, tr } from '../general/ui';
import type { ToolProps } from '../types';
import aurora from '../../assets/code-image-presets/code-preset-aurora.webp?url';
import forest from '../../assets/code-image-presets/code-preset-forest.webp?url';
import glacier from '../../assets/code-image-presets/code-preset-glacier.webp?url';
import lavender from '../../assets/code-image-presets/code-preset-lavender.webp?url';
import midnight from '../../assets/code-image-presets/code-preset-midnight.webp?url';
import monochrome from '../../assets/code-image-presets/code-preset-monochrome.webp?url';
import paper from '../../assets/code-image-presets/code-preset-paper.webp?url';
import sunset from '../../assets/code-image-presets/code-preset-sunset.webp?url';
import { AppearancePanel } from './AppearancePanel';
import { Stage } from './Stage';
import { StudioChoices } from './StudioChoices';
import { canvasMeasure, prepareFont } from './fonts';
import { createCodeNamer, readCode } from './delivery';
import { editorAppearance, editorHighlight } from './editor-highlight';
import { composeScene, layoutCode, outputSize } from './core';
import { renderRaster, renderSvg, webpSupported } from './render';
import { highlightBudget } from './highlight-data';
import { useHighlight } from './use-highlight';
import { useLocalPhoto } from './use-local-photo';
import type { PhotoControlsProps } from './PhotoControls';
import { defaultPhotoPlacement, defaultPreset, defaults, defaultWindowLayers, languageForFile, languages, presets, sampleCode, scales,
  type CodeImageSettings, type Language, type OutputFormat, type PhotoPlacement, type PhotoTarget, type Preset, type Scale,
  type WindowLayers } from './settings';
import license from './code-image.NOTICE.txt?url&no-inline';
import editorLicense from '../../ui/text-editor/codemirror.NOTICE.txt?url&no-inline';
import s from './studio.module.scss';

const thumbnails: Record<Preset, string> = {
  Midnight: midnight, Glacier: glacier, Sunset: sunset, Forest: forest,
  Paper: paper, Aurora: aurora, Monochrome: monochrome, Lavender: lavender,
};
const formats: readonly [OutputFormat, string][] = [['png', 'PNG'], ['svg', 'SVG'], ['jpeg', 'JPEG'], ['webp', 'WebP']];
const scaleChoices = scales.map(value => [value, `${value}×`] as const);
const photoDefaults: Record<PhotoTarget, PhotoPlacement> = {
  canvas: defaultPhotoPlacement,
  window: { ...defaultPhotoPlacement, fit: 'cover' },
};

export default function CodeImageGenerator({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [code, setCode] = useState(sampleCode);
  const [language, setLanguage] = useState<Language>('typescript');
  const [settings, setSettings] = useState(defaults);
  const [preset, setPreset] = useState<Preset | undefined>(defaultPreset);
  const [editing, setEditing] = useState(false);
  const [filename, setFilename] = useState('');
  const [placements, setPlacements] = useState(photoDefaults);
  const [windowLayers, setWindowLayers] = useState(defaultWindowLayers);
  const [dragTarget, setDragTarget] = useState<PhotoTarget>();
  const canvasInput = useLocalPhoto(locale, () => resetPlacement('canvas'));
  const windowInput = useLocalPhoto(locale, () => {
    resetPlacement('window');
    changeWindowLayers({ photoVisible: true });
  });
  const [scale, setScale] = useState<Scale>(2);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(90);
  const [fullscreen, setFullscreen] = useState(false);
  const [webp, setWebp] = useState(false);
  const [canCopyImage, setCanCopyImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [makeName] = useState(createCodeNamer);
  const root = useRef<HTMLDivElement>(null);
  const sourceInput = useRef<HTMLInputElement>(null);
  const sourceRead = useRef(0);
  const revision = useRef(0);
  const delivering = useRef(false);
  const editFocus = useRef(false);

  const { tokens, editorResult, surface, foreground } = useHighlight(code, language, settings.theme);
  const fontRequest = useMemo(() => ({ font: settings.font, text: code + settings.title }), [settings.font, code, settings.title]);
  const [readyFont, setReadyFont] = useState<{ request: typeof fontRequest; error?: unknown }>();
  useEffect(() => {
    if (fontRequest.text.length > highlightBudget + 120) return;
    let current = true;
    void prepareFont(fontRequest.font, fontRequest.text).then(
      () => { if (current) setReadyFont({ request: fontRequest }); },
      (error: unknown) => { if (current) setReadyFont({ request: fontRequest, error }); },
    );
    return () => { current = false; };
  }, [fontRequest]);

  useEffect(() => {
    let active = true;
    setCanCopyImage(typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write &&
      (!ClipboardItem.supports || ClipboardItem.supports('image/png')));
    void webpSupported().then(supported => { if (active) setWebp(supported); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const synchronize = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', synchronize);
    return () => document.removeEventListener('fullscreenchange', synchronize);
  }, []);
  useEffect(() => () => { sourceRead.current++; revision.current++; }, []);

  const canvasBitmap = settings.background.kind === 'image' ? canvasInput.photo?.bitmap : undefined;
  const windowBitmap = windowInput.photo?.bitmap;
  const picture = useMemo(() => {
    if (!tokens || readyFont?.request !== fontRequest || readyFont.error || (settings.background.kind === 'image' && !canvasBitmap)) return {};
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D is unavailable');
      return { layout: layoutCode(tokens, settings, canvasMeasure(ctx, settings.font), canvasBitmap) };
    } catch (error) {
      return { error };
    } finally {
      canvas.width = canvas.height = 0;
    }
  }, [fontRequest, readyFont, tokens, settings, canvasBitmap]);

  const scene = useMemo(() => picture.layout && composeScene(
    picture.layout, settings.background,
    canvasBitmap && { bitmap: canvasBitmap, placement: placements.canvas },
    windowBitmap && { bitmap: windowBitmap, placement: placements.window }, windowLayers,
  ), [picture.layout, settings.background, canvasBitmap, windowBitmap, placements, windowLayers]);
  const dimensions = useMemo(() => {
    if (!picture.layout) return {};
    try { return { output: outputSize(picture.layout.width, picture.layout.height, scale) }; }
    catch (error) { return { error }; }
  }, [picture.layout, scale]);

  useLayoutEffect(() => {
    revision.current++;
    setMessage('');
    setActionError('');
  }, [code, language, settings, canvasBitmap, windowBitmap, placements, windowLayers, scale, quality]);
  useLayoutEffect(() => {
    if (editing && editFocus.current) {
      editFocus.current = false;
      root.current?.querySelector<HTMLElement>('.cm-content')?.focus();
    }
  }, [editing]);
  const editorBindings = useMemo(() => [
    EditorState.tabSize.of(settings.tabWidth), keymap.of([indentWithTab]),
    editorAppearance(surface, foreground), editorResult ? editorHighlight(editorResult.source, editorResult.result) : [],
  ], [settings.tabWidth, surface, foreground, editorResult]);
  const edit = () => { setDragTarget(undefined); editFocus.current = true; setEditing(true); };
  const sample = () => {
    sourceRead.current++;
    setCode(sampleCode);
    setLanguage('typescript');
    setFilename('');
    setSettings(previous => ({ ...previous, title: 'greet.ts' }));
  };
  function change(patch: Partial<CodeImageSettings>) {
    if (patch.background && patch.background.kind !== 'image') {
      setDragTarget(target => target === 'canvas' ? undefined : target);
    }
    if (['background', 'theme', 'margin', 'style', 'radius', 'shadow', 'padding'].some(key => Object.hasOwn(patch, key))) setPreset(undefined);
    setSettings(previous => ({ ...previous, ...patch }));
  }
  function changePreset(id: Preset) {
    setSettings(previous => ({ ...previous, ...presets[id] }));
    setWindowLayers(defaultWindowLayers);
    setDragTarget(undefined);
    setPreset(id);
  }
  async function importSource(file: File) {
    const id = ++sourceRead.current;
    try {
      const value = await readCode(file);
      if (sourceRead.current !== id) return;
      setCode(value);
      setLanguage(languageForFile(file.name));
      setFilename(file.name);
      setSettings(previous => ({ ...previous, title: Array.from(file.name).slice(0, 120).join('') }));
      edit();
    } catch (error) {
      if (sourceRead.current === id) setActionError(errorText(error, locale));
    }
  }
  function changePlacement(target: PhotoTarget, patch: Partial<PhotoPlacement>) {
    setPlacements(previous => {
      const existing = previous[target];
      if (Object.entries(patch).every(([key, value]) => existing[key as keyof PhotoPlacement] === value)) return previous;
      return { ...previous, [target]: { ...existing, ...patch } };
    });
  }
  function resetPlacement(target: PhotoTarget) {
    changePlacement(target, photoDefaults[target]);
    setDragTarget(active => active === target ? undefined : active);
  }
  function changeWindowLayers(patch: Partial<WindowLayers>) {
    if (patch.photoVisible === false || patch.photoOpacity === 0) {
      setDragTarget(target => target === 'window' ? undefined : target);
    }
    setWindowLayers(previous => ({ ...previous, ...patch }));
    setPreset(undefined);
  }
  function photoControls(target: PhotoTarget): PhotoControlsProps {
    const input = target === 'canvas' ? canvasInput : windowInput;
    const photo = target === 'canvas' ? scene?.canvasPhoto : scene?.windowPhoto;
    return {
      ...input,
      placement: placements[target],
      change: patch => changePlacement(target, patch),
      reset: () => resetPlacement(target),
      dragging: dragTarget === target,
      drag: () => {
        if (dragTarget === target) { setDragTarget(undefined); return; }
        setEditing(false);
        setDragTarget(target);
        root.current?.querySelector('[data-code-stage]')?.scrollIntoView({ block: 'nearest' });
      },
      panX: !!photo && photo.travelX > 0.01,
      panY: !!photo && photo.travelY > 0.01,
    };
  }
  function reset() {
    sourceRead.current++;
    setCode(sampleCode);
    setLanguage('typescript');
    setSettings(defaults);
    setPreset(defaultPreset);
    setFilename('');
    canvasInput.clear();
    windowInput.clear();
    setPlacements(photoDefaults);
    setWindowLayers(defaultWindowLayers);
    setDragTarget(undefined);
    setScale(2);
    setFormat('png');
    setQuality(90);
    setEditing(false);
    setActionError('');
    setMessage('');
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch { setActionError(t('此浏览器无法进入全屏。', 'This browser could not open full screen.')); }
  }

  const emptyImage = settings.background.kind === 'image' && !canvasBitmap;
  const visualError = code.length > highlightBudget
    ? t('源码仍可编辑和复制。请将 40 万 UTF-16 单元以内的片段用于制图。', 'You can still edit and copy the code. Use an excerpt up to 400,000 UTF-16 code units for artwork.')
    : picture.error ? errorText(picture.error, locale)
      : readyFont?.request === fontRequest && readyFont.error ? t('字体加载失败。请切换字体后重试。', 'The font did not load. Choose another font and try again.') : '';
  const vectorError = scene && !scene.vectorSafe
    ? t('SVG 需要本地内置字体与基本拉丁字符。', 'SVG requires a bundled font and basic Latin text.') : '';
  const rasterError = dimensions.error ? errorText(dimensions.error, locale) : '';
  const loadingText = !code ? t('输入或导入代码，开始制作图片。', 'Enter or import code to start your image.')
    : t('正在排版…', 'Preparing artwork…');
  const artwork = emptyImage || visualError ? undefined : scene;
  const exportDisabled = !artwork || (format === 'svg' ? !!vectorError : !dimensions.output) || (format === 'webp' && !webp);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(t('已复制代码。', 'Code copied.'));
    } catch { setActionError(t('无法写入剪贴板。', 'Could not write to the clipboard.')); }
  }
  async function deliver(format: OutputFormat, copy = false) {
    if (!artwork || delivering.current || (format === 'svg' ? vectorError : !dimensions.output)) return;
    const stamp = revision.current;
    const name = copy ? '' : makeName(settings.title, filename, format);
    delivering.current = true;
    setBusy(true);
    setActionError('');
    setMessage('');
    try {
      const output = (format === 'svg' ? renderSvg(artwork, settings.font)
        : renderRaster(artwork, settings.font, scale, format, quality / 100)).then(blob => {
        if (revision.current !== stamp) throw new Error('Artwork changed');
        return blob;
      });
      if (copy) {
        // ClipboardItem's promise preserves the original trusted click during asynchronous encoding.
        void output.catch(() => {});
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': output })]);
        if (revision.current === stamp) setMessage(t('已复制 PNG。', 'PNG copied.'));
      } else {
        const blob = await output;
        if (revision.current === stamp) saveBlob(blob, name);
      }
    } catch (error) {
      if (revision.current === stamp) setActionError(copy
        ? t('无法复制图片，可通过导出菜单下载 PNG。', 'Could not copy the image. Download PNG from the export menu.')
        : errorText(error, locale));
    } finally {
      delivering.current = false;
      setBusy(false);
    }
  }

  return <Frame locale={locale}>
    <link rel="license" href={license} />
    <link rel="license" href={editorLicense} />
    <div ref={root} className={s.studio} data-code-image-studio>
      {([['canvas', canvasInput, t('背景图片文件', 'Background image file')],
        ['window', windowInput, t('窗口背景图片文件', 'Window background image file')]] as const).map(([target, input, label]) =>
        <input key={target} type="file" ref={input.input} accept="image/png,image/jpeg,image/webp,image/avif" hidden
          aria-label={label} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void input.load(file);
          }} />)}
      <div className={s.toolbar} aria-label={t('创作工具栏', 'Studio toolbar')}>
        <div className={s.toolbarGroup}>
          <input type="file" ref={sourceInput} hidden aria-label={t('源码文件', 'Source file')} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void importSource(file);
          }} />
          <Button className={s.fieldButton} size="sm" variant="ghost" onClick={() => sourceInput.current?.click()}>
            <FolderOpenIcon size={17} />{t('导入', 'Import')}
          </Button>
          <Button size="sm" variant="ghost" onClick={sample}>{t('示例', 'Sample')}</Button>
          <div className={s.language}>
            <SelectField appearance="quiet" label={t('语言', 'Language')} value={language}
              options={Object.entries(languages).map(([value, [name]]) => ({ value, label: value === 'text' ? t('纯文本', 'Plain Text') : name }))}
              onValueChange={value => { sourceRead.current++; setLanguage(value as Language); }} />
          </div>
        </div>
        <div role="group" aria-label={t('工作区视图', 'Workspace view')} className={s.mode}>
          <Button size="sm" variant="ghost" aria-pressed={editing} onClick={edit}><CodeIcon size={15} />{t('编辑代码', 'Edit code')}</Button>
          <Button size="sm" variant="ghost" aria-pressed={!editing} onClick={() => setEditing(false)}><ImageSquareIcon size={15} />{t('图片预览', 'Image preview')}</Button>
        </div>
        <div className={s.toolbarActions}>
          <Button size="sm" variant="ghost" onClick={reset}>{t('重置', 'Reset')}</Button>
          <Button size="sm" variant="ghost" className={s.fieldButton} disabled={!code} onClick={() => void copyCode()}>
            <CopySimpleIcon size={15} />{t('复制代码', 'Copy code')}
          </Button>
          {canCopyImage && <Button size="sm" variant="ghost" className={s.fieldButton} disabled={!artwork || !dimensions.output || busy} onClick={() => void deliver('png', true)}>
            <CopySimpleIcon size={15} />{t('复制图片', 'Copy image')}
          </Button>}
          <Popover.Root>
            <Popover.Trigger render={<Button size="sm" variant="primary" loading={busy} />}>
              <DownloadSimpleIcon size={15} /> {t('导出', 'Export')} <CaretDownIcon size={13} />
            </Popover.Trigger>
            <Popover.Portal container={fullscreen ? root.current : undefined}>
              <Popover.Positioner align="end" sideOffset={8} className={s.positioner}>
                <Popover.Popup className={s.exportPopup} aria-label={t('导出设置', 'Export settings')}>
                  <StudioChoices label={t('图片格式', 'Image format')} value={format} options={formats} change={setFormat}
                    disabled={value => value === 'webp' && !webp} />
                  {format !== 'svg' && <StudioChoices label={t('位图倍率', 'Raster scale')} value={scale}
                    options={scaleChoices} change={setScale} />}
                  {(format === 'jpeg' || format === 'webp') && <SliderField label={t('图片质量', 'Image quality')}
                    value={quality} min={10} max={100} unit="%" onValueChange={setQuality} />}
                  {format === 'jpeg' && <p>{t('透明区域填充为白色。', 'Transparent areas are filled with white.')}</p>}
                  {format === 'svg' && vectorError && <p>{vectorError}</p>}
                  {!webp && <p>{t('当前浏览器不支持 WebP 编码。', 'This browser does not support WebP encoding.')}</p>}
                  <Button variant="primary" size="sm" disabled={exportDisabled} loading={busy}
                    onClick={() => void deliver(format)}><DownloadSimpleIcon size={16} />{t('导出图片', 'Export image')}</Button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
      <div className={s.workspace}>
        <Stage t={t} editing={editing} scene={artwork} font={settings.font} scale={format === 'svg' ? 1 : scale}
          size={artwork && (format === 'svg' ? artwork : dimensions.output)} status={loadingText}
          photoPrompt={emptyImage ? canvasInput : undefined}
          dragTarget={dragTarget}
          movePhoto={(target, position) => changePlacement(target, position)}
          error={visualError} report={e => setActionError(errorText(e, locale))}
          fullscreen={fullscreen} toggleFullscreen={() => void toggleFullscreen()} beginEdit={edit}
          editor={<TextEditor value={code} ariaLabel={t('源码', 'Source code')} extensions={editorBindings}
            onChange={value => { sourceRead.current++; setCode(value); }} />} />
        <AppearancePanel t={t} settings={settings} selected={preset} thumbnails={thumbnails} canvasPhoto={photoControls('canvas')}
          windowPhoto={photoControls('window')} windowLayers={windowLayers} changeWindowLayers={changeWindowLayers}
          change={change} selectPreset={changePreset} />
      </div>
      {(actionError || rasterError || message || (tokens?.fallback && language !== 'text')) && <div className={s.feedback}>
        {(actionError || rasterError) && <p role="alert">{actionError || rasterError}</p>}
        {message && <p role="status">{message}</p>}
        {tokens?.fallback && language !== 'text' && <p role="status">{t('语法高亮不可用，已使用纯文本排版。', 'Syntax highlighting was unavailable. The artwork uses plain text.')}</p>}
      </div>}
    </div>
  </Frame>;
}
