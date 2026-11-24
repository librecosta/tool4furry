import { useState } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import { Popover } from '@base-ui/react/popover';
import { CheckIcon, DownloadSimpleIcon, ImageSquareIcon, TrashIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { Tooltip } from '../../ui/Tooltip';
import { ErrorText, errorText, saveBlob, tr, useBlobUrl } from '../general/ui';
import { displayTime, relativeTime, sheetLayout, type SheetSettings } from './core';
import type { GalleryFrame, VideoInfo } from './protocol';
import s from './video.module.scss';

function FrameTile({ frame, time, locale, selected, disabled, toggle, remove, view }: {
  frame: GalleryFrame; time: string; locale: Locale; selected: boolean; disabled: boolean;
  toggle: () => void; remove: () => void; view: () => void;
}) {
  const url = useBlobUrl(frame.thumbnail ?? frame.image);
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const download = t('下载画面', 'Download frame') + ' ' + time;
  const removeLabel = t('删除画面', 'Delete frame') + ' ' + time;
  return <li className={s.tile}>
    <div className={s.thumbnail}>
      <button className={s.tileView} type="button" aria-label={t('查看画面', 'View frame') + ' ' + time} onClick={view}>
        {url && <img src={url} alt="" loading="lazy" decoding="async" />}
      </button>
      <Checkbox.Root aria-label={t('选择画面', 'Select frame') + ' ' + time} className={s.tileCheck}
        checked={selected} onCheckedChange={toggle} disabled={disabled}>
        <Checkbox.Indicator><CheckIcon weight="bold" size={13} /></Checkbox.Indicator>
      </Checkbox.Root>
    </div>
    <div className={s.tileInfo}>
      <time title={frame.name}>{time}</time>
      <Tooltip content={download}><IconButton label={download} size="sm" variant="ghost" onClick={() => saveBlob(frame.image, frame.name)}>
        <DownloadSimpleIcon size={15} /></IconButton></Tooltip>
      <Tooltip content={removeLabel}><IconButton label={removeLabel} size="sm" variant="ghost" disabled={disabled} onClick={remove}>
        <TrashIcon size={15} /></IconButton></Tooltip>
    </div>
  </li>;
}

export function FrameGallery({ frames, selected, info, locale, disabled, onSelect, onRemove, onClear, onZip, onSheet }: {
  frames: readonly GalleryFrame[]; selected: ReadonlySet<number>; info: VideoInfo; locale: Locale; disabled: boolean;
  onSelect: (set: Set<number>) => void; onRemove: (id: number) => void; onClear: () => void;
  onZip: () => void; onSheet: (settings: SheetSettings) => void;
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [view, setView] = useState<GalleryFrame>(), [clear, setClear] = useState(false);
  const [sheet, setSheet] = useState(false), [columns, setColumns] = useState('4');
  const [thumbnail, setThumbnail] = useState('320'), [timestamps, setTimestamps] = useState(true);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const sheetSettings = { columns: Number(columns), thumbnail: Number(thumbnail), timestamps, format };
  const viewUrl = useBlobUrl(view?.image);
  const selectedAll = !!frames.length && selected.size === frames.length;
  let layout: ReturnType<typeof sheetLayout> | undefined, sheetError: string | undefined;
  if (sheet) {
    try { layout = sheetLayout(selected.size, sheetSettings); }
    catch (cause) { sheetError = errorText(cause, locale); }
  }

  return <section className={s.gallery} aria-labelledby="video-gallery">
    <header className={s.galleryHead}>
      <h2 id="video-gallery">{t('帧画廊', 'Frame gallery')}</h2>
      <span className={s.note}>{t(frames.length + ' 帧 · 已选 ' + selected.size + ' 帧', frames.length + ' frames · ' + selected.size + ' selected')}</span>
      <div className={s.galleryActions}>
        <Button size="sm" variant="ghost" disabled={!frames.length || disabled}
          onClick={() => onSelect(new Set(selectedAll ? [] : frames.map(frame => frame.id)))}>
          {selectedAll ? t('取消选择', 'Deselect all') : t('全选', 'Select all')}
        </Button>
        <Popover.Root open={sheet} onOpenChange={setSheet}>
          <Popover.Trigger render={<Button size="sm" disabled={!selected.size || disabled} />}>
            {t('联系表', 'Contact sheet')}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} collisionPadding={12} className={s.positioner}>
              <Popover.Popup className={s.sheet}>
                <Popover.Title>{t('联系表设置', 'Contact sheet settings')}</Popover.Title>
                <div className={s.fields}>
                  <TextField label={t('列数', 'Columns')} value={columns} onChange={setColumns} inputMode="numeric" />
                  <TextField label={t('缩略图宽度', 'Thumbnail width')} value={thumbnail} onChange={setThumbnail} inputMode="numeric" />
                </div>
                <SelectField label={t('联系表格式', 'Sheet format')} value={format} onValueChange={value => setFormat(value as typeof format)}
                  options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }]} />
                <CheckboxField label={t('显示时间戳', 'Show timestamps')} checked={timestamps} onCheckedChange={setTimestamps} />
                <ErrorText error={sheetError} />
                <Button size="sm" variant="primary" disabled={!layout || disabled}
                  onClick={() => { onSheet(sheetSettings); setSheet(false); }}>
                  {t('下载联系表', 'Download contact sheet')}{layout && ' · ' + layout.width + ' × ' + layout.height}
                </Button>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Button size="sm" disabled={!selected.size || disabled} onClick={onZip}>{t('下载所选 ZIP', 'Download selected ZIP')}</Button>
        <ConfirmDialog open={clear} onOpenChange={setClear} danger popupClassName={s.confirmation}
          title={t('清空画廊？', 'Clear the frame gallery?')}
          description={t('清除本次提取的所有图片。', 'Remove all extracted images from this gallery.')}
          confirmLabel={t('清空', 'Clear')} cancelLabel={t('取消', 'Cancel')} onConfirm={onClear}
          trigger={<Button size="sm" disabled={!frames.length || disabled}>{t('清空画廊', 'Clear gallery')}</Button>} />
      </div>
    </header>
    {frames.length > 0 ? <ul className={s.tiles}>
      {frames.map(frame => <FrameTile key={frame.id} frame={frame} time={displayTime(relativeTime(frame.timestamp, info.origin), 6)}
        locale={locale} selected={selected.has(frame.id)} disabled={disabled}
        remove={() => onRemove(frame.id)} view={() => setView(frame)} toggle={() => {
          const next = new Set(selected);
          if (next.has(frame.id)) next.delete(frame.id); else next.add(frame.id);
          onSelect(next);
        }} />)}
    </ul> : <div className={s.empty}><ImageSquareIcon size={21} aria-hidden="true" />
      {t('提取的画面会出现在这里。', 'Extracted frames will appear here.')}</div>}
    <FilePreviewDialog open={!!view} onOpenChange={open => { if (!open) setView(undefined); }}
      title={view?.name ?? t('帧预览', 'Frame preview')}
      labels={{ close: t('关闭', 'Close'), maximize: t('全屏', 'Fullscreen'), restore: t('退出全屏', 'Exit fullscreen') }}>
      {viewUrl && <img className={s.fullFrame} src={viewUrl} alt={view?.name ?? ''} />}
    </FilePreviewDialog>
  </section>;
}
