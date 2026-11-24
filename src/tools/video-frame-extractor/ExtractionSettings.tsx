import { useState } from 'react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { ErrorText, errorText, tr } from '../general/ui';
import { displayTime, framePlan, galleryLimit, outputSize, VideoError, type FramePlan, type ImageFormat, type ImageSettings,
  type Mode, type SizePreset } from './core';
import type { VideoInfo } from './protocol';
import s from './video.module.scss';

export function ExtractionSettings({ info, timestamp, locale, disabled, onExtract }: {
  info: VideoInfo; timestamp?: number; locale: Locale; disabled: boolean;
  onExtract: (plan: FramePlan, settings: ImageSettings, zip: boolean) => void;
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [mode, setMode] = useState<Mode>('single');
  const [start, setStart] = useState('00:00.000'), [end, setEnd] = useState(displayTime(info.duration, 6));
  const [interval, setInterval] = useState('5'), [fps, setFps] = useState('1');
  const [sampling, setSampling] = useState<'seconds' | 'fps'>('seconds'), [count, setCount] = useState('12');
  const [preset, setPreset] = useState<SizePreset>('original'), [format, setFormat] = useState<ImageFormat>('png');
  const [width, setWidth] = useState(String(info.width)), [height, setHeight] = useState(String(info.height));
  const [quality, setQuality] = useState('90'), [zip, setZip] = useState(false);
  let plan: FramePlan | undefined, settings: ImageSettings | undefined, error: string | undefined;
  try {
    if (mode !== 'single' || timestamp !== undefined) {
      plan = framePlan({ mode, start, end, interval: sampling === 'seconds' ? interval : fps, sampling, count }, info.duration, timestamp);
    }
    if (format !== 'png' && (!/^\d+$/.test(quality) || Number(quality) < 1 || Number(quality) > 100)) throw new VideoError('encode');
    settings = { size: outputSize(info, preset, { width: Number(width), height: Number(height) }),
      format, quality: format === 'png' ? 1 : Number(quality) / 100 };
  } catch (cause) { error = errorText(cause, locale); }
  const estimate = !plan ? undefined : plan.mode === 'single' ? 1 : plan.mode === 'every'
    ? Math.ceil((plan.end - plan.start) * info.fps) : plan.count;
  const modes = [
    ['single', t('单帧', 'Single Frame')], ['interval', t('间隔', 'Interval')],
    ['count', t('数量', 'Count')], ['every', t('逐帧', 'Every Frame')],
  ] as const;

  return <section className={s.settings} aria-labelledby="video-settings">
    <h2 id="video-settings">{t('提取设置', 'Extraction settings')}</h2>
    <div role="group" aria-label={t('提取模式', 'Extraction mode')} className={s.modes}>
      {modes.map(([key, label]) => <Button key={key} aria-pressed={mode === key} data-selected={mode === key || undefined}
        variant="ghost" size="sm" disabled={disabled} onClick={() => setMode(key)}>{label}</Button>)}
    </div>
    {mode !== 'single' && <div className={s.fields}>
      <TextField label={t('起点', 'Start')} value={start} onChange={setStart} disabled={disabled} />
      <TextField label={t('终点（不含）', 'End (exclusive)')} value={end} onChange={setEnd} disabled={disabled} />
    </div>}
    {mode === 'interval' && <div className={s.fields}>
      <SelectField label={t('采样方式', 'Sampling unit')} value={sampling} onValueChange={value => setSampling(value as typeof sampling)}
        disabled={disabled} options={[{ value: 'seconds', label: t('间隔秒数', 'Seconds') }, { value: 'fps', label: t('采样 FPS', 'Sample FPS') }]} />
      {sampling === 'seconds'
        ? <TextField label={t('提取间隔（秒）', 'Interval (seconds)')} value={interval} onChange={setInterval} inputMode="decimal" disabled={disabled} />
        : <TextField label={t('每秒采样', 'Samples per second')} value={fps} onChange={setFps} inputMode="decimal" disabled={disabled} />}
    </div>}
    {mode === 'count' && <TextField label={t('采样数量', 'Sample count')} value={count} onChange={setCount} inputMode="numeric" disabled={disabled} />}
    <div className={s.fields}>
      <SelectField label={t('图片格式', 'Image format')} value={format} onValueChange={value => setFormat(value as ImageFormat)}
        disabled={disabled} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, { value: 'webp', label: 'WebP' }]} />
      <SelectField label={t('输出尺寸', 'Output size')} value={preset} onValueChange={value => setPreset(value as SizePreset)}
        disabled={disabled} options={[{ value: 'original', label: t('原始尺寸', 'Original size') },
          { value: '1080', label: '1080p' }, { value: '720', label: '720p' }, { value: 'custom', label: t('自定义', 'Custom') }]} />
    </div>
    {preset === 'custom' && <div className={s.fields}>
      <TextField label={t('最大宽度', 'Maximum width')} value={width} onChange={setWidth} inputMode="numeric" disabled={disabled} />
      <TextField label={t('最大高度', 'Maximum height')} value={height} onChange={setHeight} inputMode="numeric" disabled={disabled} />
    </div>}
    {format !== 'png' && <TextField label={t('图片质量（1–100）', 'Image quality (1–100)')} value={quality}
      onChange={setQuality} inputMode="numeric" disabled={disabled} />}
    <div className={s.extractBottom}>
      <CheckboxField checked={zip} onCheckedChange={setZip} label={t('仅导出 ZIP', 'Export ZIP only')} disabled={disabled} />
      {info.hdr && <p className={s.note}>{t('HDR 画面将转换为 8 位 sRGB。', 'HDR frames are converted to 8-bit sRGB by the browser.')}</p>}
      {estimate !== undefined && <p className={s.note}>
        {mode === 'count' || mode === 'interval'
          ? t('采样 ' + estimate + ' 次 · 同一显示帧只导出一次', estimate + ' samples · Duplicate frames are skipped')
          : t('预计提取 ' + estimate + ' 帧', 'Estimated ' + estimate + ' frames')}
        {settings && ' · ' + settings.size.width + ' × ' + settings.size.height}
      </p>}
      {!zip && estimate !== undefined && estimate > galleryLimit && <p className={s.note}>
        {t('大批量提取建议仅导出 ZIP。', 'For large batches, use Export ZIP only.')}
      </p>}
      {!plan && mode === 'single' && !error && <p className={s.note}>{t('暂停或定位后可提取当前画面。', 'Pause or seek to extract the displayed frame.')}</p>}
      <ErrorText error={error} />
      <Button variant="primary" disabled={disabled || !plan || !settings}
        onClick={() => { if (plan && settings) onExtract(plan, settings, zip); }}>
        <DownloadSimpleIcon size={16} aria-hidden="true" /> {t('提取图片', 'Extract images')}
      </Button>
    </div>
  </section>;
}
