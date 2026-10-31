import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { SliderField } from '../../ui/SliderField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import type { NativeImageFormat } from '../image/types';
import type { ResizeCollection, CollectionView } from './collection';
import type { BatchRule } from './batch';
import type { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';

export function BatchPanel({
  manager,
  view,
  t,
  save,
}: {
  manager: ResizeCollection;
  view: CollectionView;
  t: (typeof resizeMessages)['zh'];
  save: (result?: { blob: Blob; name: string }) => void;
}) {
  const [value, setValue] = useState<string>();
  const [background, setBackground] = useState<string>();
  const [invalid, setInvalid] = useState(false);
  const [confirm, setConfirm] = useState<string>();
  const settings = view.settings;
  const delivery = manager.delivery();
  const running = view.files.some((file) =>
    ['waiting', 'processing'].includes(file.batch.status),
  );
  const importing = view.files.some((file) =>
    ['waiting', 'validating'].includes(file.intake),
  );
  const pending = value !== undefined || background !== undefined;
  const supported = view.capabilities?.[settings.format]?.supported;
  const error = (code?: string) =>
    t.errors[code as keyof typeof t.errors] ?? t.errors.fallback;
  return (
    <section aria-label={t.batch} {...stylex.props(s.stack)}>
      <div {...stylex.props(s.panel)}>
        <h2 {...stylex.props(s.heading)}>{t.batch}</h2>
        <p {...stylex.props(s.note)}>{t.batchNote}</p>
        <SelectField
          label={t.rule}
          value={settings.rule}
          options={Object.entries(t.rules).map(([value, label]) => ({
            value,
            label,
          }))}
          onValueChange={(rule) => {
            manager.batchSettings({
              rule: rule as BatchRule,
              value: rule === 'percent' ? '100' : '1200',
            });
            setValue(undefined);
            setInvalid(false);
          }}
        />
        <form
          {...stylex.props(s.actions)}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              manager.batchSettings({ value: value ?? settings.value });
              setValue(undefined);
              setInvalid(false);
            } catch {
              setInvalid(true);
            }
          }}
        >
          <TextField
            label={settings.rule === 'percent' ? t.percentValue : t.pixelValue}
            inputMode={settings.rule === 'percent' ? 'decimal' : 'numeric'}
            value={value ?? settings.value}
            onChange={(value) => {
              setValue(value);
              setInvalid(false);
            }}
          />
          <Button type="submit" disabled={value === undefined}>
            {t.applyRule}
          </Button>
        </form>
        {invalid && (
          <p role="alert" {...stylex.props(s.note, s.error)}>
            {t.dimensionsError}
          </p>
        )}
        <CheckboxField
          label={t.noUpscale}
          checked={settings.noUpscale}
          onCheckedChange={(noUpscale) => manager.batchSettings({ noUpscale })}
        />
        <SelectField
          label={t.format}
          value={settings.format}
          options={['png', 'jpeg', 'webp'].map((value) => ({
            value,
            label: value.toUpperCase(),
            disabled:
              !view.capabilities?.[value as NativeImageFormat]?.supported,
          }))}
          onValueChange={(format) =>
            manager.batchSettings({ format: format as NativeImageFormat })
          }
        />
        {!supported && <p {...stylex.props(s.note)}>{t.unsupported}</p>}
        {settings.format !== 'png' && (
          <SliderField
            label={t.quality}
            min={1}
            max={100}
            value={settings.quality}
            onValueChange={(quality) => manager.batchSettings({ quality })}
          />
        )}
        {settings.format === 'jpeg' && (
          <TextField
            label={t.background}
            value={background ?? settings.background}
            error={background === undefined ? undefined : t.backgroundError}
            onChange={(value) => {
              if (/^#[0-9a-f]{6}$/i.test(value)) {
                manager.batchSettings({ background: value });
                setBackground(undefined);
              } else setBackground(value);
            }}
          />
        )}
        {pending && (
          <div {...stylex.props(s.actions)}>
            <p {...stylex.props(s.note)}>{t.pending}</p>
            <Button
              onClick={() => {
                setValue(undefined);
                setBackground(undefined);
                setInvalid(false);
              }}
            >
              {t.resetInputs}
            </Button>
          </div>
        )}
        {view.files.some((item) => item.source?.info.format === 'avif') && (
          <p {...stylex.props(s.note)}>{t.avif}</p>
        )}
        <p {...stylex.props(s.note)}>
          ≤ {manager.limits.edge}px · ≤ {manager.limits.pixels / 1000000} MP ·{' '}
          {t.resultLimit} {manager.limits.totalBytes / 1024 ** 2} MiB
        </p>
        <div {...stylex.props(s.actions)}>
          <Button
            variant="primary"
            disabled={
              pending ||
              importing ||
              !supported ||
              !view.files.some(
                (item) =>
                  item.source &&
                  ['stale', 'failed'].includes(item.batch.status),
              )
            }
            onClick={() => manager.startBatch()}
          >
            {t.startBatch}
          </Button>
          <Button disabled={!running} onClick={() => manager.cancelBatch()}>
            {t.cancelBatch}
          </Button>
          <Button
            disabled={
              pending || !delivery.allowed || view.zipStatus === 'packing'
            }
            onClick={async () => save(await manager.zip())}
          >
            {view.zipStatus === 'packing' ? t.zip.packing : t.zip.download}
          </Button>
        </div>
        <p role="status" aria-live="polite" {...stylex.props(s.note)}>
          {t.successCount} {delivery.entries.length} · {t.failedCount}{' '}
          {delivery.failed} · {t.totalCount} {view.files.length}
        </p>
        <p {...stylex.props(s.note)}>
          {delivery.pending
            ? t.zip.wait
            : delivery.failed
              ? t.zip.partial
              : t.zip.ready}
        </p>
        {view.zipError && (
          <p role="alert" {...stylex.props(s.note, s.error)}>
            {t.zip[view.zipError]}
          </p>
        )}
      </div>
      <ul aria-label={t.batchResults} {...stylex.props(s.list)}>
        {view.files.map((item) => (
          <li
            key={item.id}
            data-task-id={item.id}
            data-task-status={item.batch.status}
            {...stylex.props(s.panel)}
          >
            <p {...stylex.props(s.filename)}>{item.file.name}</p>
            <p {...stylex.props(s.note)}>
              {t.source}:{' '}
              {item.source
                ? `${item.source.width} × ${item.source.height}`
                : '—'}{' '}
              → {t.output}:{' '}
              {item.batch.target
                ? `${item.batch.target.width} × ${item.batch.target.height}`
                : '—'}{' '}
              · {settings.format.toUpperCase()}
            </p>
            <p role="status" {...stylex.props(s.note)}>
              {item.intake !== 'ready'
                ? t.intakeStates[item.intake]
                : t.batchStates[item.batch.status]}
            </p>
            {(item.error || item.batch.error) && (
              <p role="alert" {...stylex.props(s.note, s.error)}>
                {error(item.error ?? item.batch.error)}
              </p>
            )}
            <div {...stylex.props(s.actions)}>
              <Button
                disabled={!manager.download(item.id)}
                onClick={() => save(manager.download(item.id))}
              >
                {t.download}
              </Button>
              <Button
                disabled={
                  pending || importing || item.batch.status !== 'failed'
                }
                onClick={() => manager.retry(item.id)}
              >
                {t.retryFile}
              </Button>
              <Button
                aria-pressed={item.id === view.selectedId}
                disabled={!item.source}
                onClick={() => {
                  manager.select(item.id);
                  manager.setMode('single');
                }}
              >
                {t.editFile}
              </Button>
              <ConfirmDialog
                open={confirm === item.id}
                onOpenChange={(open) => setConfirm(open ? item.id : undefined)}
                title={t.remove}
                description={t.confirmText}
                confirmLabel={t.remove}
                cancelLabel={t.cancel}
                danger
                onConfirm={() => manager.remove(item.id)}
                trigger={<Button>{t.remove}</Button>}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
