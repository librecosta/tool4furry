import { useId, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  CropIcon,
  EyeIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { SliderField } from '../../ui/SliderField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Tooltip } from '../../ui/Tooltip';
import { FileTaskList, fileTaskStyles as rows } from '../../ui/FileTaskList';
import { ImageTaskMedia } from '../image/ImageTaskMedia';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import { useOwnedUrl } from '../image-converter/use-owned-url';
import { converterStyles as c } from '../image-converter/converter.styles';
import type {
  ResizeCollection,
  CollectionView,
  ResizeFile,
} from './collection';
import type { BatchRule } from './batch';
import {
  ParameterModes,
  ParameterChoices,
  FormatChoices,
  type ResizeMessages,
} from './ParameterControls';
import { resizeStyles as s } from './resize.styles';

type Save = (result?: { blob: Blob; name: string }) => void;
export function BatchPanel({
  manager,
  view,
  advanced,
  onAdvancedChange,
  t,
  save,
}: {
  manager: ResizeCollection;
  view: CollectionView;
  advanced: boolean;
  onAdvancedChange: (advanced: boolean) => void;
  t: ResizeMessages;
  save: Save;
}) {
  const [value, setValue] = useState<string>();
  const [background, setBackground] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const settings = view.settings;
  const delivery = manager.delivery();
  const running = view.files.some((file) =>
    ['waiting', 'processing'].includes(file.batch.status),
  );
  const importing = view.files.some((file) =>
    ['waiting', 'validating'].includes(file.intake),
  );
  const pending =
    value !== undefined ||
    (settings.format === 'jpeg' && background !== undefined);
  const supported = view.capabilities?.[settings.format]?.supported;
  const needsProcessing = view.files.some(
    (item) => item.source && ['stale', 'failed'].includes(item.batch.status),
  );
  const commitValue = () => {
    if (value === undefined) return true;
    try {
      manager.batchSettings({ value });
      setValue(undefined);
      setInvalid(false);
      return true;
    } catch {
      setInvalid(true);
      return false;
    }
  };
  const commitBackground = () => {
    if (background === undefined || settings.format !== 'jpeg') return true;
    if (!/^#[0-9a-f]{6}$/i.test(background)) return false;
    manager.batchSettings({ background });
    setBackground(undefined);
    return true;
  };
  const custom =
    settings.quality !== 85 || settings.background.toUpperCase() !== '#FFFFFF';
  return (
    <section aria-label={t.batch} {...stylex.props(s.batchGrid)}>
      <aside
        aria-label={t.batchSettings}
        {...stylex.props(c.settings, s.batchSettings)}
      >
        <div {...stylex.props(c.settingsHeader)}>
          <h2 {...stylex.props(c.settingsTitle)}>{t.batchSettings}</h2>
          <ParameterModes
            advanced={advanced}
            onChange={onAdvancedChange}
            t={t}
          />
        </div>
        <ParameterChoices
          label={t.rule}
          value={settings.rule}
          options={Object.entries(t.rules).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(rule) => {
            manager.batchSettings({
              rule: rule as BatchRule,
              value:
                rule === 'percent'
                  ? '100'
                  : settings.rule === 'percent'
                    ? '1200'
                    : settings.value,
            });
            setValue(undefined);
            setInvalid(false);
          }}
        />
        <TextField
          label={settings.rule === 'percent' ? t.percentValue : t.pixelValue}
          inputMode={settings.rule === 'percent' ? 'decimal' : 'numeric'}
          value={value ?? settings.value}
          error={invalid ? t.dimensionsError : undefined}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitValue();
            }
            if (event.key === 'Escape') {
              setValue(undefined);
              setInvalid(false);
            }
          }}
          onChange={(value) => {
            setValue(value);
            setInvalid(false);
          }}
        />
        <CheckboxField
          label={t.noUpscale}
          hint={t.noUpscaleHint}
          checked={settings.noUpscale}
          onCheckedChange={(noUpscale) => manager.batchSettings({ noUpscale })}
        />
        <FormatChoices
          value={settings.format}
          capabilities={view.capabilities}
          t={t}
          onChange={(format) => manager.batchSettings({ format })}
        />
        {view.capabilities && !supported && (
          <p role="alert" {...stylex.props(c.error)}>
            {t.unsupported}
          </p>
        )}
        {view.files.some((item) => item.source?.info.format === 'avif') && (
          <p {...stylex.props(c.note)}>{t.avif}</p>
        )}
        {advanced && (
          <>
            {settings.format !== 'png' && (
              <SliderField
                accent="lavender"
                label={t.quality}
                min={1}
                max={100}
                value={settings.quality}
                onValueChange={(quality) => manager.batchSettings({ quality })}
              />
            )}
            {settings.format === 'jpeg' && (
              <div {...stylex.props(c.backgroundControl, s.colorControl)}>
                <TextField
                  label={t.background}
                  value={background ?? settings.background}
                  error={
                    background !== undefined &&
                    !/^#[0-9a-f]{6}$/i.test(background)
                      ? t.backgroundError
                      : undefined
                  }
                  onBlur={commitBackground}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitBackground();
                  }}
                  onChange={setBackground}
                />
                <input
                  type="color"
                  aria-label={t.pickBackground}
                  value={settings.background}
                  {...stylex.props(s.colorPicker)}
                  onChange={(event) => {
                    setBackground(undefined);
                    manager.batchSettings({ background: event.target.value });
                  }}
                />
              </div>
            )}
            {custom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBackground(undefined);
                  manager.batchSettings({ quality: 85, background: '#FFFFFF' });
                }}
              >
                {t.defaults}
              </Button>
            )}
          </>
        )}
        {!advanced && custom && (
          <p {...stylex.props(c.note)}>{t.customSettings}</p>
        )}
        {!advanced &&
          settings.format === 'jpeg' &&
          background !== undefined && (
            <p role="alert" {...stylex.props(c.error)}>
              {t.checkAdvanced}
            </p>
          )}
        <div {...stylex.props(s.download)}>
          {(needsProcessing || value !== undefined) && (
            <Button
              variant="primary"
              xstyle={c.supportAction}
              disabled={importing || !supported}
              onClick={() => {
                if (!commitValue()) return;
                if (!commitBackground()) {
                  onAdvancedChange(true);
                  return;
                }
                manager.startBatch();
              }}
            >
              {t.startBatch}
            </Button>
          )}
          {running && (
            <Button variant="ghost" onClick={() => manager.cancelBatch()}>
              {t.cancelBatch}
            </Button>
          )}
          {delivery.entries.length > 0 && view.files.length > 1 && (
            <Button
              variant={
                delivery.allowed && !needsProcessing ? 'primary' : 'secondary'
              }
              xstyle={
                delivery.allowed && !needsProcessing
                  ? c.supportAction
                  : undefined
              }
              loading={view.zipStatus === 'packing'}
              disabled={pending || !delivery.allowed}
              onClick={async () => save(await manager.zip())}
            >
              {t.zip.download}
            </Button>
          )}
          {!delivery.pending &&
            delivery.failed > 0 &&
            delivery.entries.length > 0 && (
              <p {...stylex.props(c.note)}>{t.zip.partial}</p>
            )}
          {view.zipError && (
            <p role="alert" {...stylex.props(c.error)}>
              {t.zip[view.zipError]}
            </p>
          )}
        </div>
      </aside>
      <div {...stylex.props(s.batchTasks)}>
        <div {...stylex.props(s.taskHeading)}>
          <h2 {...stylex.props(s.heading)}>{t.batchResults}</h2>
          <span role="status" aria-live="polite" {...stylex.props(c.note)}>
            {delivery.entries.length}/{view.files.length} {t.completed}
            {delivery.failed ? ` · ${delivery.failed} ${t.failedCount}` : ''}
          </span>
        </div>
        <FileTaskList label={t.batchResults}>
          {view.files.map((item) => (
            <ResizeTaskRow
              key={item.id}
              item={item}
              manager={manager}
              view={view}
              t={t}
              save={save}
              blocked={pending || importing}
            />
          ))}
        </FileTaskList>
      </div>
    </section>
  );
}

function ResizeTaskRow({
  item,
  manager,
  view,
  t,
  save,
  blocked,
}: {
  item: ResizeFile;
  manager: ResizeCollection;
  view: CollectionView;
  t: ResizeMessages;
  save: Save;
  blocked: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButtonId = useId();
  const nameId = useId();
  const error = item.error ?? item.batch.error;
  const failed = item.intake === 'failed' || item.batch.status === 'failed';
  const active =
    ['waiting', 'validating'].includes(item.intake) ||
    ['waiting', 'processing'].includes(item.batch.status);
  const result = manager.download(item.id);
  const sourceURL = useOwnedUrl(item.source?.blob, manager.resources);
  const outputURL = useOwnedUrl(result?.blob, manager.resources);
  const status =
    item.intake !== 'ready'
      ? t.intakeStates[item.intake]
      : t.batchStates[item.batch.status];
  return (
    <li
      aria-labelledby={nameId}
      data-task-id={item.id}
      data-task-status={item.batch.status}
      {...stylex.props(rows.item)}
    >
      <div aria-hidden="true" {...stylex.props(rows.media)}>
        <ImageTaskMedia
          source={sourceURL}
          output={result ? outputURL : undefined}
          checking={active && !item.source}
          labels={t.preview}
        />
      </div>
      <div {...stylex.props(rows.heading)}>
        <span id={nameId} title={item.file.name} {...stylex.props(rows.name)}>
          {item.file.name}
        </span>
        <span
          role="status"
          {...stylex.props(
            rows.status,
            result && s.success,
            failed && s.error,
            active && s.waiting,
          )}
        >
          {status}
        </span>
      </div>
      <div {...stylex.props(rows.metadataRow)}>
        <div {...stylex.props(rows.metadata)}>
          {item.source ? `${item.source.width} × ${item.source.height}` : '—'} →{' '}
          {item.batch.target
            ? `${item.batch.target.width} × ${item.batch.target.height}`
            : '—'}{' '}
          · {view.settings.format.toUpperCase()}
          {error && (
            <p role="alert" {...stylex.props(s.error)}>
              {t.errors[error as keyof typeof t.errors] ?? t.errors.fallback}
            </p>
          )}
        </div>
      </div>
      <div {...stylex.props(rows.actions)}>
        {item.source && (
          <Tooltip content={t.preview.preview}>
            <IconButton
              id={previewButtonId}
              variant="ghost"
              label={`${t.preview.preview}: ${item.file.name}`}
              xstyle={rows.action}
              onClick={() => setPreviewOpen(true)}
            >
              <EyeIcon size={18} />
            </IconButton>
          </Tooltip>
        )}
        {result && (
          <Tooltip content={t.download}>
            <IconButton
              variant="ghost"
              xstyle={rows.action}
              label={`${t.download}: ${item.file.name}`}
              onClick={() => save(manager.download(item.id))}
            >
              <DownloadSimpleIcon size={18} />
            </IconButton>
          </Tooltip>
        )}
        {failed && !active && (
          <Tooltip content={t.retryFile}>
            <IconButton
              variant="ghost"
              xstyle={rows.action}
              label={`${t.retryFile}: ${item.file.name}`}
              disabled={blocked}
              onClick={() => manager.retry(item.id)}
            >
              <ArrowClockwiseIcon size={18} />
            </IconButton>
          </Tooltip>
        )}
        {item.source && (
          <Tooltip content={t.editFile}>
            <IconButton
              variant="ghost"
              xstyle={rows.action}
              label={`${t.editFile}: ${item.file.name}`}
              onClick={() => {
                manager.select(item.id);
                manager.setMode('single');
              }}
            >
              <CropIcon size={18} />
            </IconButton>
          </Tooltip>
        )}
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title={t.remove}
          description={t.confirmText}
          confirmLabel={t.remove}
          cancelLabel={t.cancel}
          danger
          onConfirm={() => manager.remove(item.id)}
          trigger={
            <IconButton
              variant="ghost"
              xstyle={rows.action}
              label={`${t.remove}: ${item.file.name}`}
              title={t.remove}
            >
              <TrashIcon size={18} />
            </IconButton>
          }
        />
      </div>
      {item.source && (
        <ImageComparisonDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          name={item.file.name}
          source={{
            url: sourceURL,
            width: item.source.width,
            height: item.source.height,
            format: item.source.info.format,
            onError: () => {},
          }}
          output={result && item.batch.target ? {
            url: outputURL,
            ...item.batch.target,
            format: view.settings.format,
            onError: () => {},
          } : undefined}
          labels={t.preview}
          finalFocus={() => document.getElementById(previewButtonId) ?? document.getElementById('resize-source-button')}
        />
      )}
    </li>
  );
}
