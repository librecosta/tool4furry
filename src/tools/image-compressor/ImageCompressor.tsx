import { useEffect, useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { TextField } from '../../ui/TextField';
import { FileTaskList, type FileTaskItem } from '../../ui/FileTaskList';
import { ImageTaskMedia } from '../image/ImageTaskMedia';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import type { NativeImageFormat } from '../image/types';
import type { ToolProps } from '../types';
import { CompressorSession, type CompressionTask, type CompressionView } from './session';
import { recommendedSettings, type CompressionSettings } from './compress';
import { messages, comparisonLabels } from './messages';
import { s } from './styles';

export const bytesLabel = (bytes: number) => Math.abs(bytes) < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(2)} MB`;
export default function ImageCompressor({locale}: ToolProps) {
  const t = messages[locale];
  const [session, setSession] = useState<CompressorSession>();
  const [view, setView] = useState<CompressionView>({tasks: [], settings: {...recommendedSettings}, issues: [], version: 0});
  const [target, setTarget] = useState('200'), [unit, setUnit] = useState('KB'), [edge, setEdge] = useState(''), [background, setBackground] = useState('#FFFFFF');
  const [invalid, setInvalid] = useState(false), [zipError, setZipError] = useState(false), [packing, setPacking] = useState(false), [previewId, setPreviewId] = useState<string>();
  useEffect(() => {
    const owner = new CompressorSession(); setSession(owner); setView(owner.snapshot());
    const off = owner.subscribe(() => setView(owner.snapshot()));
    return () => { off(); owner.dispose(); };
  }, []);
  const settings = view.settings;
  const configure = (patch: Partial<CompressionSettings>) => { session?.configure(patch); setZipError(false); };
  const commit = () => {
    const size = Number(target) * (unit === 'KB' ? 1024 : 1024 ** 2), longestEdge = edge === '' ? undefined : Number(edge);
    const valid = (settings.mode !== 'target' || /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(target) && size >= 1024 && size <= 128 * 1024 ** 2) &&
      (edge === '' || /^\d+$/.test(edge) && Number.isSafeInteger(longestEdge) && longestEdge! >= 1 && longestEdge! <= 10000) &&
      (settings.format !== 'jpeg' || /^#[\da-f]{6}$/i.test(background));
    setInvalid(!valid);
    if (valid) configure({longestEdge, ...(settings.mode === 'target' ? {targetBytes: Math.round(size)} : {}), ...(settings.format === 'jpeg' ? {background} : {})});
    return valid;
  };
  const enter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } };
  const pending = view.tasks.some(task => ['validating', 'queued', 'processing'].includes(task.status));
  const archivePending = view.tasks.some(task => ['validating', 'queued', 'processing', 'stale'].includes(task.status));
  const ready = view.tasks.filter(task => task.status === 'ready' && task.result).length;
  const failed = view.tasks.filter(task => task.status === 'error').length;
  const canStart = view.tasks.some(task => task.source && ['stale', 'error'].includes(task.status));
  const label = (task: CompressionTask) => {
    if (task.result && task.status === 'ready') {
      const size = task.result.saved > 0 ? t.reduced : task.result.saved < 0 ? t.larger : t.unchanged;
      return task.result.targetMet ? size : `${size} · ${t.missed}`;
    }
    return task.status === 'ready' ? t.reduced : t[task.status];
  };
  const taskItems: FileTaskItem[] = view.tasks.map(task => ({
    id: task.id, name: task.file.name, status: task.status, statusLabel: label(task),
    media: <ImageTaskMedia source={task.sourceUrl} output={task.result?.url} checking={task.status === 'validating'} labels={t}/>,
    metadata: `${bytesLabel(task.file.size)}${task.source ? ` · ${task.source.width}×${task.source.height}` : ''}`,
    output: task.result ? `${task.result.format.toUpperCase()} · ${task.result.width}×${task.result.height} · ${bytesLabel(task.result.blob.size)} · ${Math.abs(task.result.saved / task.file.size * 100).toFixed(1)}% ${task.result.saved > 0 ? t.saved : t.increase}` : undefined,
    error: task.error ? task.error === 'bytes' ? t.budget : task.error === 'timeout' ? t.timeout : t.failed : undefined,
    actions: [
      ...(task.source ? [{kind: 'preview' as const, label: t.preview, id: `compressor-preview-${task.id}`, onClick: () => setPreviewId(task.id)}] : []),
      ...(task.result ? [{kind: 'download' as const, label: t.download, onClick: () => session?.download(task.id)}] : []),
      ...(task.status === 'error' ? [{kind: 'retry' as const, label: t.retry, onClick: () => { if (commit()) session?.retry(task.id); }}] : []),
      {kind: 'remove', label: t.remove, onClick: () => session?.remove(task.id)},
    ],
  }));
  const preview = view.tasks.find(task => task.id === previewId);
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.settings, main: t.title, toolbar: t.tasks, close: t.close, showParameters: t.settings, hideParameters: t.settings, showTools: t.import, hideTools: t.import}}>
    <div data-image-compressor {...stylex.props(s.stack)}>
      <FileDropzone id="compressor-source" label={view.tasks.length ? t.append : t.import} disabled={!session} multiple accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif" appearance={view.tasks.length ? 'compact' : 'expanded'} issueMessages={{count: t.failed, size: t.failed, type: t.failed}} onFilesReceived={files => session?.add(files)}/>
      <details {...stylex.props(s.help)}><summary>{t.limits}</summary><p>{t.limitText}</p>{session && <p>≤ {session.limits.files} · {bytesLabel(session.limits.bytes)} {t.perFile} · {session.limits.pixels / 1e6} MP · {session.limits.edge}px · {bytesLabel(session.limits.totalBytes)}</p>}</details>
      {view.issues.length > 0 && <p role="alert" {...stylex.props(s.error)}>{t.rejected} {view.issues.join('、')}</p>}
      <section aria-label={t.settings} {...stylex.props(s.settings)}>
        <h2 {...stylex.props(s.heading)}>{t.settings}</h2>
        <div role="group" aria-label={t.mode} {...stylex.props(s.row)}>{(['recommended', 'quality', 'target'] as const).map(mode => <Button key={mode} variant="ghost" aria-pressed={settings.mode === mode} xstyle={[s.action, settings.mode === mode && s.choice]} onClick={() => { configure({mode, ...(mode === 'recommended' ? {quality: 82} : {})}); setInvalid(false); }}>{t[mode]}</Button>)}</div>
        <div {...stylex.props(s.grid)}>
          <SelectField label={t.format} value={settings.format} onValueChange={value => configure({format: value as NativeImageFormat})} options={['webp', 'jpeg', 'png'].map(value => ({value, label: value.toUpperCase()}))}/>
          <TextField label={t.longest} hint={t.longestHint} value={edge} onChange={setEdge} inputMode="numeric" onBlur={commit} onKeyDown={enter}/>
          {settings.mode === 'target' && <div {...stylex.props(s.unit)}><TextField label={t.targetLabel} value={target} onChange={setTarget} inputMode="decimal" onBlur={commit} onKeyDown={enter}/><SelectField label={t.unit} value={unit} onValueChange={value => { setUnit(value); setTarget(String(settings.targetBytes / (value === 'KB' ? 1024 : 1024 ** 2))); }} options={[{value: 'KB', label: 'KB'}, {value: 'MB', label: 'MB'}]}/></div>}
          {settings.format !== 'png' && settings.mode !== 'recommended' && <SliderField label={settings.mode === 'target' ? t.maxQuality : t.qualityLabel} value={settings.quality} onValueChange={quality => configure({quality})} min={1} max={100} unit="%" accent="lavender"/>}
          {settings.format === 'jpeg' && <TextField label={t.background} value={background} onChange={setBackground} onBlur={commit} onKeyDown={enter} maxLength={7} spellCheck={false}/>}
        </div>
        {settings.mode === 'target' && <p {...stylex.props(s.note)}>{t.targetHint}</p>}
        {settings.format === 'png' && <p {...stylex.props(s.note)}>{t.pngHint}</p>}
        {invalid && <p role="alert" {...stylex.props(s.error)}>{t.invalid}</p>}
        <div {...stylex.props(s.row)}><Button variant="ghost" xstyle={s.main} disabled={!session || !canStart || view.tasks.some(task => task.status === 'validating')} onClick={() => { if (commit()) session?.start(); }}>{t.start}</Button>{pending && <Button variant="ghost" xstyle={s.action} onClick={() => session?.cancel()}>{t.cancel}</Button>}</div>
      </section>
      {view.tasks.length > 0 && <>
        <div {...stylex.props(s.row)}><span role="status" {...stylex.props(s.note)}>{t.completed}: {ready} · {t.failedCount}: {failed}</span><Button variant="ghost" xstyle={s.action} onClick={() => { session?.clear(); setPreviewId(undefined); }}>{t.clear}</Button>{ready > 0 && <Button variant="ghost" xstyle={s.action} disabled={archivePending || packing} onClick={() => { setPacking(true); setZipError(false); void session?.zip().catch(() => setZipError(true)).finally(() => setPacking(false)); }}>{t.zip}</Button>}</div>
        {failed > 0 && ready > 0 && <p {...stylex.props(s.note)}>{t.zipPartial}</p>}
        {zipError && <p role="alert" {...stylex.props(s.error)}>{t.zipError}</p>}
        <FileTaskList label={t.tasks} items={taskItems}/>
      </>}
      {preview?.source && <ImageComparisonDialog open onOpenChange={open => { if (!open) setPreviewId(undefined); }} name={preview.file.name} labels={comparisonLabels[locale]} finalFocus={() => document.getElementById(`compressor-preview-${preview.id}`) ?? document.getElementById('compressor-source-button')}
        source={{url: preview.sourceUrl, width: preview.source.width, height: preview.source.height, format: preview.source.info.format, onError: () => session?.previewFailed(preview.id)}}
        output={preview.result ? {url: preview.result.url, width: preview.result.width, height: preview.result.height, format: preview.result.format, onError: () => session?.previewFailed(preview.id)} : undefined}/>}
    </div>
  </WorkbenchShell>;
}
