import { useEffect, useId, useState } from 'react';
import { EyeIcon, TrashIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button, IconButton } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { Tooltip } from '../../ui/Tooltip';
import { ImageThumbnail } from '../image/ImageThumbnail';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import { imagePreviewMessages } from '../image/preview-messages';
import { useOwnedUrl } from '../image-converter/use-owned-url';
import type { ImageOutputFormat } from '../image/types';
import { recommendations } from '../image-converter/presets';
import c from '../image-converter/converter.styles.module.scss';
import form from '../../workbench/form-tool-layout.module.scss';
import pickerNotice from '../palette-extractor/react-colorful.NOTICE.txt?url';
import { defaults, validSettings, type WatermarkSettings } from './render';
import { WatermarkSession, type View } from './session';
import { WatermarkPreview } from './WatermarkPreview';
import { messages } from './messages';
import s from './styles.module.scss';
import { ColorField } from './ColorField';

const accept = 'image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif';
export default function ImageWatermark({locale}: ToolProps) {
  const t = messages[locale], [session, setSession] = useState<WatermarkSession>();
  const [view, setView] = useState<View>({tasks: [], settings: defaults, assetBusy: false, version: 0});
  const [previewId, setPreviewId] = useState<string>(), [packing, setPacking] = useState(false), [deliveryError, setDeliveryError] = useState(false);
  const [text, setText] = useState(defaults.text), [color, setColor] = useState(defaults.color), [background, setBackground] = useState(defaults.background);
  const [invalid, setInvalid] = useState<string>();
  const [advanced, setAdvanced] = useState(false);
  const buttonPrefix = useId();
  useEffect(() => {
    const owner = new WatermarkSession(); setSession(owner); setView(owner.snapshot);
    const off = owner.subscribe(() => setView(owner.snapshot));
    return () => { off(); owner.dispose(); };
  }, []);
  const current = view.tasks.find(task => task.id === previewId), selected = view.tasks.find(task => task.id === view.selected);
  const sourceUrl = useOwnedUrl(current?.source?.blob, session?.resources), outputUrl = useOwnedUrl(current?.status === 'ready' ? current.result : undefined, session?.resources);
  useEffect(() => { if (previewId && !current?.source) setPreviewId(undefined); }, [current?.source, previewId]);
  const settings = view.settings, working = view.tasks.some(task => ['checking', 'queued', 'processing'].includes(task.status));
  const ready = view.tasks.filter(task => task.status === 'ready').length, failed = view.tasks.filter(task => task.status === 'error').length;
  const update = (patch: Partial<WatermarkSettings>) => { setDeliveryError(false); session?.update({...settings, ...patch}); };
  const commit = (key: 'text' | 'color' | 'background', value: string) => {
    if (!validSettings({...settings, [key]: value})) { setInvalid(key); return; }
    setInvalid(undefined); update({[key]: value});
  };
  const reset = () => {
    setText(defaults.text); setColor(defaults.color); setBackground(defaults.background); setInvalid(undefined);
    update({...defaults});
  };
  const hasDraftError = settings.kind === 'text' && (text !== settings.text || color !== settings.color || invalid === 'text' || invalid === 'color')
    || settings.format === 'jpeg' && (background !== settings.background || invalid === 'background');
  const issue = {type: t.errors.input, count: t.errors.budget, size: t.errors.budget};
  const errorMessage = (error?: string) => error && t.errors[error as keyof typeof t.errors] || t.errors.output;
  const positionName = `${buttonPrefix}-positions`;
  const customized = settings.layout !== defaults.layout || settings.angle !== defaults.angle || settings.density !== defaults.density || settings.fontSize !== defaults.fontSize || settings.imagePercent !== defaults.imagePercent || settings.margin !== defaults.margin || settings.background !== defaults.background || settings.format !== 'png' && settings.quality !== recommendations[settings.format].settings.quality;
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.settings, close: t.close, showParameters: t.settings, hideParameters: t.settings, showTools: t.addMore, hideTools: t.addMore, main: t.title, toolbar: t.title}}>
    <link rel="license" href={pickerNotice}/>
    <div data-image-watermark className={s.stack}>
      <FileDropzone label={view.tasks.length ? t.addMore : t.add} accept={accept} multiple appearance={view.tasks.length ? 'compact' : 'expanded'} disabled={!session} issueMessages={issue} onFilesReceived={files => session?.add(files)}/>
      <details className={s.note}><summary>{t.limits}</summary><p>{t.limitCopy}</p>{session && <p>{`≤ ${session.limits.files} · ${session.limits.bytes / 1024 ** 2} MiB/file · ${session.limits.totalBytes / 1024 ** 2} MiB · ${session.limits.pixels / 1e6} MP · ${session.limits.edge}px`}</p>}</details>
      {view.error && <p role="alert" className={s.error}>{errorMessage(view.error)}</p>}
      <div className={s.workspace}>
        <div className={s.stack}>
          <div className={s.actions}><h2 className={s.title}>{t.preview}</h2>{selected?.source && <span className={s.note}>{selected.source.width} × {selected.source.height}</span>}</div>
          {view.preview && selected ? <WatermarkPreview view={view} label={t.preview} failure={t.errors.preview}/> : <div className={s.preview}><p className={s.note}>{t.none}</p></div>}
          <div className={s.actions}>
            <Button variant="ghost" className={s.accent} disabled={!session || hasDraftError || !view.tasks.some(task => task.source) || view.assetBusy || settings.kind === 'image' && !view.watermark || working} onClick={() => session?.start()}>{t.process}</Button>
            {working && <Button variant="ghost" onClick={() => session?.cancel()}>{t.cancel}</Button>}
            {ready > 0 && !working && !hasDraftError && <Button variant="ghost" className={s.secondary} loading={packing} onClick={async () => { setPacking(true); setDeliveryError(false); try { await session?.zip(); } catch { setDeliveryError(true); } finally { setPacking(false); } }}>{packing ? t.packing : t.zip}</Button>}
            {view.tasks.length > 0 && <Button variant="ghost" onClick={() => session?.clear()}>{t.clear}</Button>}
          </div>
          {view.tasks.length > 0 && <p role="status" className={s.note}>{t.result}: {ready} · {t.failed}: {failed}</p>}
          {deliveryError && <p role="alert" className={s.error}>{t.errors.zip}</p>}
          <ul aria-label={t.title} className={s.list}>{view.tasks.map(task => <li key={task.id} className={[s.row, view.selected === task.id && s.selected].filter(Boolean).join(' ')}>
            <button type="button" aria-label={`${t.selectFile}: ${task.file.name}`} aria-pressed={view.selected === task.id} disabled={!task.source} onClick={() => session?.select(task.id)} className={s.selectFile}>
              <span className={s.thumb}><ImageThumbnail src={task.thumbnail} checking={task.status === 'checking'}/></span>
              <span className={s.info}><span className={s.name}>{task.file.name}</span><span className={s.note}>{task.source ? `${task.source.width} × ${task.source.height} · ` : ''}{t.status[task.status]}{task.result ? ` · ${(task.result.size / 1024).toFixed(1)} KB` : ''}</span></span>
            </button>
            {task.error && <p role="alert" className={s.error}>{errorMessage(task.error)}</p>}
            <div className={s.actions}>
              {task.source && <Tooltip content={t.view}><IconButton id={`${buttonPrefix}-${task.id}`} label={`${t.view}: ${task.file.name}`} variant="ghost" size="sm" onClick={() => setPreviewId(task.id)}><EyeIcon size={18}/></IconButton></Tooltip>}
              {task.status === 'ready' && task.result && <Tooltip content={t.download}><IconButton label={`${t.download}: ${task.file.name}`} disabled={hasDraftError} variant="ghost" size="sm" onClick={() => session?.download(task.result!, session.filename(task))}><DownloadSimpleIcon size={18}/></IconButton></Tooltip>}
              {task.source && ['idle', 'stale', 'error'].includes(task.status) && <Button variant="ghost" size="sm" disabled={hasDraftError || view.assetBusy || settings.kind === 'image' && !view.watermark} onClick={() => session?.start([task.id])}>{task.status === 'error' ? t.retry : t.generate}</Button>}
              <Tooltip content={t.remove}><IconButton label={`${t.remove}: ${task.file.name}`} variant="ghost" size="sm" onClick={() => session?.remove(task.id)}><TrashIcon size={18}/></IconButton></Tooltip>
            </div>
          </li>)}</ul>
        </div>
        <div className={s.panel}>
          <div className={s.heading}><h2 className={s.title}>{t.settings}</h2>
            <div role="group" aria-label={t.parameterModes} className={form.segmented}>{([false,true] as const).map(value => <button key={String(value)} type="button" aria-pressed={advanced === value} className={[form.segment, c.parameterControl, advanced === value && form.segmentSelected].filter(Boolean).join(' ')} onClick={() => setAdvanced(value)}>{value ? t.advanced : t.quick}</button>)}</div>
          </div>
          {!advanced && settings.format === 'jpeg' && (background !== settings.background || invalid === 'background') && <p role="alert" className={s.error}>{t.errors.invalid}</p>}
          {!advanced && customized && <Button variant="ghost" size="sm" className={s.secondary} onClick={() => setAdvanced(true)}>{t.advanced}: {settings.layout === 'tile' ? `${t.tile} · ${t[settings.density]}` : `${t.single} · ${t.margin} ${settings.margin}px`} · {settings.angle}° · {settings.kind === 'text' ? `${settings.fontSize}px` : `${settings.imagePercent}%`}{settings.format !== 'png' ? ` · ${settings.quality}%` : ''}{settings.format === 'jpeg' ? ` · ${settings.background}` : ''}</Button>}
          <SelectField appearance="quiet" label={t.kind} value={settings.kind} onValueChange={value => update({kind: value as 'text' | 'image'})} options={[{value:'text', label:t.text}, {value:'image', label:t.image}]}/>
          {settings.kind === 'text' ? <>
            <TextField label={t.content} value={text} maxLength={160} onChange={value => {setText(value); setInvalid(undefined); if (validSettings({...settings, text: value})) update({text: value});}} onBlur={() => commit('text', text)} onKeyDown={event => {if (event.key === 'Enter') commit('text', text);}} error={invalid === 'text' ? t.errors.invalid : undefined}/>
            <ColorField label={t.color} value={settings.color} draft={color} onDraft={value => {setColor(value); setInvalid(undefined); if (/^#[a-f\d]{6}$/i.test(value)) update({color: value});}} onCommit={value => commit('color', value)} error={invalid === 'color' ? t.errors.invalid : undefined} invalid={t.errors.invalid} apply={t.apply} cancel={t.dismiss}/>
          </> : <>
            <FileDropzone label={t.uploadMark} accept={`${accept},image/svg+xml,.svg`} appearance="compact" disabled={!session} issueMessages={issue} onFilesReceived={files => {if(files[0]) session?.setWatermark(files[0]);}}/>
            {view.watermark && <div className={s.actions}><span className={s.note}>{view.watermark.source.file.name}</span><Button variant="ghost" size="sm" onClick={() => session?.removeWatermark()}>{t.removeMark}</Button></div>}
          </>}
          <SliderField label={t.opacity} value={settings.opacity} min={0} max={100} unit="%" accent="lavender" onValueChange={value => update({opacity: value})}/>
          {advanced && <>
            <SelectField appearance="quiet" label={t.layout} value={settings.layout} onValueChange={value => update({layout: value as WatermarkSettings['layout']})} options={[{value:'single',label:t.single},{value:'tile',label:t.tile}]}/>
            <SliderField label={t.angle} value={settings.angle} min={-45} max={45} unit="°" accent="lavender" onValueChange={value => update({angle: value})}/>
            {settings.layout === 'tile' && <SelectField appearance="quiet" label={t.density} value={settings.density} onValueChange={value => update({density: value as WatermarkSettings['density']})} options={(['sparse','standard','dense'] as const).map(value => ({value,label:t[value]}))}/>}
            {settings.kind === 'text' ? <SliderField label={t.fontSize} value={settings.fontSize} min={1} max={500} unit="px" accent="lavender" onValueChange={value => update({fontSize: value})}/> : <SliderField label={t.scale} value={settings.imagePercent} min={1} max={100} unit="%" accent="lavender" onValueChange={value => update({imagePercent: value})}/>}
          </>}
          {settings.layout === 'single' && <>
            <fieldset className={s.group}><legend className={s.legend}>{t.position}</legend><div className={s.positions}>{t.positions.map((label, index) => <label key={label} className={[s.choice, index === settings.position && s.chosen].filter(Boolean).join(' ')}><input type="radio" name={positionName} value={index} checked={settings.position === index} onChange={() => update({position: index})} className={s.radio}/>{label}</label>)}</div></fieldset>
            {advanced && <SliderField label={t.margin} value={settings.margin} min={0} max={1000} unit="px" accent="lavender" onValueChange={value => update({margin: value})}/>}
          </>}
          <SelectField appearance="quiet" label={t.format} value={settings.format} onValueChange={value => update({format: value as ImageOutputFormat, quality: recommendations[value as ImageOutputFormat].settings.quality ?? 90})} options={['png','jpeg','webp','avif'].map(value => ({value,label:value.toUpperCase(),disabled:value === 'avif' && !session?.avifSupported}))}/>
          {advanced && settings.format !== 'png' && <SliderField label={t.quality} value={settings.quality} min={1} max={100} unit="%" accent="lavender" onValueChange={value => update({quality: value})}/>}
          {advanced && settings.format === 'jpeg' && <TextField label={t.background} value={background} maxLength={7} onChange={value => {setBackground(value); setInvalid(undefined); if (/^#[a-f\d]{6}$/i.test(value)) update({background: value});}} onBlur={() => commit('background', background)} onKeyDown={event => {if(event.key === 'Enter') commit('background', background);}} error={invalid === 'background' ? t.errors.invalid : undefined}/>}
          {advanced && <Button variant="ghost" className={s.secondary} onClick={reset}>{t.reset}</Button>}
        </div>
      </div>
      {current?.source && <ImageComparisonDialog open={!!previewId} onOpenChange={open => {if (!open) setPreviewId(undefined);}} name={current.file.name} labels={imagePreviewMessages[locale]} finalFocus={() => document.getElementById(`${buttonPrefix}-${current.id}`)} source={{url: sourceUrl, width: current.source.width, height: current.source.height, format: current.source.info.format, onError: () => setDeliveryError(true)}} output={current.status === 'ready' && current.result && !hasDraftError ? {url: outputUrl, width: current.source.width, height: current.source.height, format: settings.format, onError: () => setDeliveryError(true)} : undefined}/>}
    </div>
  </WorkbenchShell>;
}
