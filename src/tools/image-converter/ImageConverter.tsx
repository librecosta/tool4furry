import { useEffect, useId, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { FieldFrame, useField } from '../../ui/Field';
import { SliderField } from '../../ui/SliderField';
import { controls as c } from '../../styles/controls';
import { ImageThumbnail } from '../image/ImageThumbnail';
import { FileTaskList, type FileTaskStatus } from '../../ui/FileTaskList';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { useOwnedUrl } from './use-owned-url';
import { formats, imageBudget, type ImageErrorCode } from '../image/types';
import { createProcessingState, isCustomSettings } from '../processing-state';
import { recommendations, sameSettings } from './presets';
import { ConverterSession, type ConverterView } from './session';
import { downloadName } from './filename';
import { converterMessages } from './messages';
import { converterStyles as s } from './converter.styles';

const bytes = (value: number) => {
  const unit =
    Math.abs(value) >= 1024 ** 2
      ? 'MiB'
      : Math.abs(value) >= 1024
        ? 'KiB'
        : 'B';
  const divisor = unit === 'MiB' ? 1024 ** 2 : unit === 'KiB' ? 1024 : 1;
  return `${(value / divisor).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit}`;
};
export default function ImageConverter({ region }: ToolProps) {
  const t = converterMessages[region];
  const [session, setSession] = useState<ConverterSession>();
  const [view, setView] = useState<ConverterView>(() => ({
    processing: createProcessingState(recommendations.webp),
    checkingCapabilities: true,
    filename: '',
  }));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState<Blob>();
  const [qualityDraft, setQualityDraft] = useState<string>();
  const [lastValidBackground, setLastValidBackground] = useState('#FFFFFF');
  const [debug, setDebug] = useState(false);
  const qualityId = useId();
  const formatGroup = useId();
  useEffect(() => {
    if (import.meta.env.DEV)
      setDebug(
        new URLSearchParams(window.location.search).get('debug') === '1',
      );
    const current = new ConverterSession(setView);
    setSession(current);
    current.start();
    return () => current.dispose();
  }, []);
  const state = view.processing,
    settings = state.settings,
    result = state.result?.value;
  useEffect(
    () => setPreviewError(undefined),
    [view.source?.blob, result?.blob],
  );
  useEffect(() => setPreviewOpen(false), [view.source?.blob]);
  const sourceUrl = useOwnedUrl(view.source?.blob, session?.resources);
  const ownedResultUrl = useOwnedUrl(
    result?.blob !== view.source?.blob ? result?.blob : undefined,
    session?.resources,
  );
  const resultUrl =
    result?.blob === view.source?.blob ? sourceUrl : ownedResultUrl;
  const download = session?.download();
  const name = downloadName(
    view.source?.file.name ?? 'image',
    settings.format,
    result?.kind ?? 'encoded',
    view.filename,
  );
  const qualityText = qualityDraft ?? String(settings.quality ?? '');
  const qualityInvalid =
    settings.format !== 'png' &&
    (!/^\d+$/.test(qualityText) ||
      !Number.isInteger(Number(qualityText)) ||
      Number(qualityText) < 1 ||
      Number(qualityText) > 100);
  const downloadable =
    download &&
    resultUrl &&
    !name.error &&
    !qualityInvalid &&
    previewError !== download.blob;
  const backgroundInvalid =
    settings.format === 'jpeg' &&
    !/^#[0-9a-f]{6}$/i.test(settings.jpegBackground);
  useEffect(() => {
    if (
      settings.format === 'jpeg' &&
      /^#[0-9a-f]{6}$/i.test(settings.jpegBackground)
    )
      setLastValidBackground(settings.jpegBackground);
  }, [settings.format, settings.jpegBackground]);
  const backgroundField = {
    label: t.background,
    error: backgroundInvalid ? t.backgroundError : undefined,
  };
  const backgroundIds = useField(backgroundField);
  const canGenerate =
    !!view.source &&
    !view.candidate &&
    !view.checkingCapabilities &&
    !!view.capabilities?.[settings.format].supported &&
    !qualityInvalid &&
    state.validSettings;
  const summary =
    settings.format === 'png'
      ? t.standard
      : `${t.qualitySummary} ${settings.quality ?? '—'}${settings.format === 'jpeg' ? ` · ${settings.jpegBackground}` : ''}`;
  const taskStatus: FileTaskStatus = view.candidate
    ? 'validating'
    : qualityInvalid || backgroundInvalid
      ? result
        ? 'stale'
        : 'queued'
      : state.status === 'idle' || (state.status === 'stale' && !result)
        ? 'queued'
        : state.status;
  const status = t.taskStatus[taskStatus];
  const validOutput =
    state.status === 'ready' && !qualityInvalid && state.validSettings
      ? result
      : undefined;
  const downloadDisabledReason = name.error
    ? t.filenameError
    : qualityInvalid
      ? t.qualityError
      : backgroundInvalid
        ? t.backgroundError
        : previewError && previewError === download?.blob
          ? t.previewError
          : status;
  const remove = () => {
    setPreviewOpen(false);
    session?.remove();
    document.getElementById('converter-source-button')?.focus();
  };
  const labels = {
    parameters: t.settings,
    close: '',
    showParameters: '',
    hideParameters: '',
    showTools: '',
    hideTools: '',
    main: t.settings,
    toolbar: '',
  };
  return (
    <WorkbenchShell mode="form" formWidth="wide" labels={labels}>
      <div
        data-image-converter
        {...stylex.props(s.layout, !view.source && s.emptyLayout)}
      >
        <section
          data-converter-part="file"
          aria-label={t.file}
          {...stylex.props(s.file, !view.source && s.emptyFile)}
        >
          <FileDropzone
            id="converter-source"
            appearance={view.source ? 'compact' : 'expanded'}
            label={view.source ? t.replace : t.pick}
            hint={!view.source ? `PNG / JPEG / WebP · ${t.local}` : undefined}
            maxFiles={1}
            maxSizeBytes={imageBudget.bytes}
            issueMessages={{
              type: t.disabledType,
              size: t.disabledSize,
              count: t.disabledCount,
            }}
            onSelection={(selection) => {
              if (!selection.accepted.length) session?.rejectSelection('bytes');
            }}
            onFilesSelected={(files) => session?.select(files[0])}
          />
          {!view.source && (
            <details {...stylex.props(s.help)}>
              <summary>{t.fileDetails}</summary>
              <p {...stylex.props(s.note)}>{t.budget}</p>
              <p {...stylex.props(s.note)}>{t.limitations}</p>
            </details>
          )}
          {view.candidate && !view.source && (
            <p role="status" {...stylex.props(s.note)}>
              {view.candidate} · {t.validating}
            </p>
          )}
          {view.inputError && (
            <p role="alert" {...stylex.props(s.error)}>
              {t.errors[view.inputError]} {view.errorDetail}
            </p>
          )}
        </section>
        <section
          data-converter-part="settings"
          aria-labelledby="converter-settings"
          {...stylex.props(s.settings, !view.source && s.emptySettings)}
        >
          <div {...stylex.props(s.settingsHeader)}>
            <h2 id="converter-settings" {...stylex.props(s.settingsTitle)}>
              {t.settings}
            </h2>
            <div role="group" aria-label={t.modes} {...stylex.props(s.modes)}>
              {(['quick', 'advanced'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={state.mode === mode}
                  {...stylex.props(
                    s.mode,
                    state.mode === mode && s.currentMode,
                  )}
                  onClick={() => {
                    setQualityDraft(undefined);
                    session?.mode(mode);
                  }}
                >
                  {t[mode]}
                </button>
              ))}
            </div>
          </div>
          <fieldset {...stylex.props(s.group)}>
            <legend {...stylex.props(s.legend)}>{t.formats}</legend>
            <div {...stylex.props(s.choices)}>
              {formats.map((format) => {
                const disabled =
                  view.checkingCapabilities ||
                  !view.capabilities?.[format].supported;
                return (
                  <label
                    key={format}
                    {...stylex.props(
                      s.choice,
                      settings.format === format && s.chosen,
                      disabled && s.disabled,
                    )}
                  >
                    <input
                      type="radio"
                      name={formatGroup}
                      value={format}
                      checked={settings.format === format}
                      disabled={disabled}
                      onChange={() => {
                        setQualityDraft(undefined);
                        session?.format(format);
                      }}
                      aria-describedby={
                        disabled && !view.checkingCapabilities
                          ? `format-${format}-hint`
                          : undefined
                      }
                      {...stylex.props(s.radio)}
                    />
                    <span {...stylex.props(s.choiceLabel)}>
                      {format.toUpperCase()}
                      {disabled && !view.checkingCapabilities && (
                        <small
                          id={`format-${format}-hint`}
                          {...stylex.props(s.choiceHint)}
                        >
                          {t.unavailable}
                        </small>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {view.checkingCapabilities ? (
            <p role="status" {...stylex.props(s.note)}>
              {t.checking}
            </p>
          ) : (
            <>
              {!view.capabilities?.webp.supported && (
                <p {...stylex.props(s.note)}>
                  {view.capabilities?.png.supported ? t.fallback : t.none}
                </p>
              )}
              {view.capabilityError && (
                <p role="alert" {...stylex.props(s.error)}>
                  {t.errors[view.capabilityError]}
                </p>
              )}
              {(!view.capabilities ||
                formats.some((f) => !view.capabilities?.[f].supported)) && (
                <Button onClick={() => session?.retryCapabilities()}>
                  {t.retryCapability}
                </Button>
              )}
            </>
          )}
          <p {...stylex.props(s.note)}>
            {isCustomSettings(state, sameSettings) ? t.custom : t.recommended} ·{' '}
            {summary}
          </p>
          {state.mode === 'advanced' && (
            <>
              {settings.format !== 'png' && (
                <div>
                  <SliderField
                    id={qualityId}
                    label={t.quality}
                    value={
                      Number.isFinite(settings.quality)
                        ? Math.max(1, Math.min(100, settings.quality!))
                        : 85
                    }
                    min={1}
                    max={100}
                    step={1}
                    error={qualityInvalid ? t.qualityError : undefined}
                    onValueChange={(quality) => {
                      setQualityDraft(undefined);
                      session?.settings({ ...settings, quality });
                    }}
                    valueControl={
                      <input
                        aria-label={t.precise}
                        aria-invalid={qualityInvalid || undefined}
                        aria-describedby={`${qualityId}-scale${qualityInvalid ? ` ${qualityId}-error` : ''}`}
                        inputMode="numeric"
                        value={qualityText}
                        {...stylex.props(
                          c.input,
                          s.qualityInput,
                          qualityInvalid && c.invalid,
                        )}
                        onChange={(event) => {
                          const text = event.target.value;
                          setQualityDraft(text);
                          const quality = Number(text);
                          if (
                            /^\d+$/.test(text) &&
                            Number.isInteger(quality) &&
                            quality >= 1 &&
                            quality <= 100
                          )
                            session?.settings({ ...settings, quality });
                        }}
                      />
                    }
                  />
                  <div
                    id={`${qualityId}-scale`}
                    {...stylex.props(s.qualityScale)}
                  >
                    <span>{t.smallerFile}</span>
                    <span>{t.higherQuality}</span>
                  </div>
                </div>
              )}
              {settings.format === 'jpeg' && (
                <FieldFrame {...backgroundField} ids={backgroundIds}>
                  <div {...stylex.props(s.backgroundControl)}>
                    <input
                      id={backgroundIds.id}
                      value={settings.jpegBackground}
                      maxLength={7}
                      aria-invalid={backgroundInvalid || undefined}
                      aria-describedby={backgroundIds.describedBy}
                      {...stylex.props(c.input, backgroundInvalid && c.invalid)}
                      onChange={(event) =>
                        session?.settings({
                          ...settings,
                          jpegBackground: event.target.value,
                        })
                      }
                    />
                    <input
                      type="color"
                      aria-label={t.pickBackground}
                      value={
                        backgroundInvalid
                          ? lastValidBackground
                          : settings.jpegBackground
                      }
                      {...stylex.props(c.input, s.colorPicker)}
                      onChange={(event) =>
                        session?.settings({
                          ...settings,
                          jpegBackground: event.target.value,
                        })
                      }
                    />
                  </div>
                </FieldFrame>
              )}
              <TextField
                label={t.filename}
                value={view.filename}
                maxLength={180}
                error={name.error ? t.filenameError : undefined}
                onChange={(value) => session?.name(value)}
              />
              {view.filename && (
                <Button variant="ghost" onClick={() => session?.name('')}>
                  {t.resetName}
                </Button>
              )}
            </>
          )}
          {(state.mode === 'advanced' ||
            isCustomSettings(state, sameSettings)) && (
            <Button
              onClick={() => {
                setQualityDraft(undefined);
                session?.restore();
              }}
              disabled={view.checkingCapabilities}
            >
              {t.restore}
            </Button>
          )}
          {view.source &&
            state.status !== 'error' &&
            (state.mode === 'advanced' ||
              state.status === 'stale' ||
              state.status === 'idle') && (
              <Button
                variant="primary"
                loading={state.status === 'processing'}
                disabled={!canGenerate || state.status === 'processing'}
                onClick={() => session?.generate()}
              >
                {state.mode === 'advanced' &&
                view.source.info.format === settings.format
                  ? t.reencode
                  : t.generate}
              </Button>
            )}
        </section>
        <section
          hidden={!view.source}
          data-converter-part="tasks"
          aria-label={t.tasks}
          {...stylex.props(s.tasks)}
        >
          {view.source && (
            <FileTaskList
              label={t.tasks}
              items={[
                {
                  id: 'source',
                  name: view.source.file.name,
                  media: (
                    <ImageThumbnail
                      src={sourceUrl}
                      checking={!!view.candidate}
                    />
                  ),
                  metadata: `${view.source.info.format.toUpperCase()} · ${view.source.width}×${view.source.height} · ${bytes(view.source.file.size)}`,
                  output: validOutput
                    ? `${validOutput.mime.replace('image/', '').toUpperCase()} · ${bytes(validOutput.bytes)} (${validOutput.bytes - view.source.file.size >= 0 ? '+' : ''}${bytes(validOutput.bytes - view.source.file.size)})`
                    : undefined,
                  status: taskStatus,
                  statusLabel: status,
                  error: state.error
                    ? (t.errors[state.error as ImageErrorCode] ??
                      t.errors.encode)
                    : undefined,
                  actions: [
                    {
                      kind: 'preview',
                      id: 'converter-preview-button',
                      label: t.preview,
                      onClick: () => setPreviewOpen(true),
                    },
                    {
                      kind: 'download',
                      label:
                        result?.kind === 'passthrough'
                          ? t.originalDownload
                          : t.download,
                      href: downloadable ? resultUrl : undefined,
                      download: name.name,
                      disabled: !downloadable,
                      disabledReason: !downloadable
                        ? downloadDisabledReason
                        : undefined,
                    },
                    ...(state.status === 'error'
                      ? [
                          {
                            kind: 'retry' as const,
                            label: t.retry,
                            disabled: !canGenerate,
                            onClick: () => session?.generate(),
                          },
                        ]
                      : []),
                    { kind: 'remove', label: t.remove, onClick: remove },
                  ],
                },
              ]}
            />
          )}
          {previewError && !previewOpen && (
            <p role="alert" {...stylex.props(s.error)}>
              {t.previewError}
            </p>
          )}
        </section>
        {view.source && session && (
          <ImagePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            source={view.source}
            output={validOutput}
            sourceUrl={sourceUrl}
            outputUrl={resultUrl}
            t={t}
            onError={setPreviewError}
            onLoad={(blob) =>
              setPreviewError((error) => (error === blob ? undefined : error))
            }
          />
        )}
        {import.meta.env.DEV && debug && (
          <details {...stylex.props(s.details)}>
            <summary>DEV · ownership diagnostics</summary>
            <pre data-converter-diagnostics>
              {JSON.stringify(
                {
                  sourceRevision: state.sourceRevision,
                  settingsRevision: state.settingsRevision,
                  requestId: state.requestId,
                  status: state.status,
                  kind: result?.kind,
                  ...session?.resources,
                  maxActive: session?.jobs.maxActive,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </div>
    </WorkbenchShell>
  );
}
