import { useEffect, useId, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { FieldFrame, useField } from '../../ui/Field';
import { SliderField } from '../../ui/SliderField';
import { controls as c } from '../../styles/controls';
import { FileTaskList } from '../../ui/FileTaskList';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ConverterTaskRow } from './ConverterTaskRow';
import { intakeBudget, sortedFolderFiles } from './intake';
import { formats, type ImageResult } from '../image/types';
import { createProcessingState, isCustomSettings } from '../processing-state';
import { recommendations, sameSettings, type EncodeSettings } from './presets';
import { ConverterSession, type ConverterView } from './session';
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
  const [view, setView] = useState<ConverterView>(() => {
    const processing = createProcessingState<EncodeSettings, ImageResult>(
      recommendations.webp,
    );
    return {
      processing,
      controls: processing,
      checkingCapabilities: true,
      batch: { id: '', time: '' },
      tasks: [],
      label: '',
    };
  });
  const [previewId, setPreviewId] = useState<string>();
  const [confirmClear, setConfirmClear] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  const [folderSupported, setFolderSupported] = useState<boolean>();
  const previousTasks = useRef(false);
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
  const state = view.controls,
    settings = state.settings;
  const hasTasks = view.tasks.length > 0;
  const name = session?.filename() ?? { name: '', error: false };
  useEffect(() => {
    setFolderSupported('webkitdirectory' in document.createElement('input'));
  }, []);
  useEffect(() => {
    if (
      (previewId && !view.tasks.some((task) => task.id === previewId)) ||
      (previousTasks.current && !hasTasks)
    ) {
      setPreviewId(undefined);
      document.getElementById('converter-source-button')?.focus();
    }
    previousTasks.current = hasTasks;
  }, [view.tasks, previewId, hasTasks]);
  const qualityText = qualityDraft ?? String(settings.quality ?? '');
  const qualityInvalid =
    settings.format !== 'png' &&
    (!/^\d+$/.test(qualityText) ||
      !Number.isInteger(Number(qualityText)) ||
      Number(qualityText) < 1 ||
      Number(qualityText) > 100);
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
  const canProcess =
    !view.checkingCapabilities &&
    !!view.capabilities?.[settings.format].supported &&
    !qualityInvalid &&
    state.validSettings;
  const pending = view.tasks.some((task) =>
    ['validating', 'queued', 'stale'].includes(task.status),
  );
  const blocked = qualityInvalid
    ? t.qualityError
    : backgroundInvalid
      ? t.backgroundError
      : undefined;
  const rejected = view.intake
    ? Object.entries(view.intake.rejected).filter(([, count]) => count > 0)
    : [];
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
        {...stylex.props(s.layout, !hasTasks && s.emptyLayout)}
      >
        <section
          data-converter-part="file"
          aria-label={t.file}
          {...stylex.props(s.file, !hasTasks && s.emptyFile)}
        >
          <div {...stylex.props(s.intakeActions, hasTasks && s.compactIntake)}>
            <FileDropzone
              id="converter-source"
              appearance={hasTasks ? 'compact' : 'expanded'}
              label={hasTasks ? t.addImages : t.pick}
              hint={!hasTasks ? `PNG / JPEG / WebP · ${t.local}` : undefined}
              multiple
              issueMessages={{
                type: t.disabledType,
                size: t.disabledSize,
                count: t.disabledCount,
              }}
              onFilesSelected={(files) => session?.add(files)}
            />
            <input
              ref={(node) => {
                folderInput.current = node;
                node?.setAttribute('webkitdirectory', '');
              }}
              id="converter-folder"
              type="file"
              multiple
              hidden
              aria-label={t.addFolder}
              onChange={(event) => {
                const input = event.currentTarget;
                try {
                  if (input.files?.length)
                    session?.add(sortedFolderFiles(Array.from(input.files)));
                } finally {
                  input.value = '';
                }
              }}
            />
            <Button
              disabled={folderSupported === false}
              aria-describedby={
                folderSupported === false ? 'converter-folder-hint' : undefined
              }
              onClick={() => folderInput.current?.click()}
            >
              {t.addFolder}
            </Button>
          </div>
          {folderSupported === false && (
            <p id="converter-folder-hint" {...stylex.props(s.note)}>
              {t.folderUnavailable}
            </p>
          )}
          {!hasTasks && (
            <details {...stylex.props(s.help)}>
              <summary>{t.fileDetails}</summary>
              <p {...stylex.props(s.note)}>{t.budget}</p>
              <p {...stylex.props(s.note)}>{t.limitations}</p>
            </details>
          )}
          {rejected.length > 0 && (
            <p role="status" {...stylex.props(s.note)}>
              {t.intakeAccepted} {view.intake!.accepted} · {t.intakeSkipped}{' '}
              {rejected
                .map(
                  ([reason, count]) =>
                    `${t.intakeReasons[reason as keyof typeof t.intakeReasons]} × ${count}`,
                )
                .join('；')}
            </p>
          )}
          <div {...stylex.props(s.listActions)}>
            {hasTasks && (
              <span {...stylex.props(s.note)}>
                {view.tasks.length}/{intakeBudget.files} ·{' '}
                {bytes(
                  view.tasks.reduce((total, task) => total + task.file.size, 0),
                )}
                /100 MiB
              </span>
            )}
            <ConfirmDialog
              open={confirmClear}
              onOpenChange={setConfirmClear}
              title={t.clear}
              description={t.clearDescription}
              confirmLabel={t.clearConfirm}
              cancelLabel={t.cancel}
              danger
              trigger={
                <Button variant="ghost" disabled={!hasTasks}>
                  {t.clear}
                </Button>
              }
              onConfirm={() => {
                setPreviewId(undefined);
                session?.remove();
              }}
            />
          </div>
        </section>
        <section
          data-converter-part="settings"
          aria-labelledby="converter-settings"
          {...stylex.props(s.settings, !hasTasks && s.emptySettings)}
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
                value={view.label}
                maxLength={80}
                hint={
                  !name.error ? `${t.filenameExample} ${name.name}` : undefined
                }
                error={name.error ? t.filenameError : undefined}
                onChange={(value) => session?.label(value)}
              />
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
          {hasTasks && (state.mode === 'advanced' || pending) && (
            <Button
              variant="primary"
              disabled={!canProcess || !pending}
              onClick={() => session?.generateAll()}
            >
              {t.generateAll}
            </Button>
          )}
        </section>
        <section
          hidden={!hasTasks}
          data-converter-part="tasks"
          aria-label={t.tasks}
          {...stylex.props(s.tasks)}
        >
          {session && (
            <FileTaskList label={t.tasks}>
              {view.tasks.map((task) => (
                <ConverterTaskRow
                  key={task.id}
                  task={task}
                  session={session}
                  t={t}
                  previewOpen={previewId === task.id}
                  onPreviewChange={(open) =>
                    setPreviewId((current) =>
                      open
                        ? task.id
                        : current === task.id
                          ? undefined
                          : current,
                    )
                  }
                  blocked={blocked}
                  canProcess={canProcess}
                  formatBytes={bytes}
                />
              ))}
            </FileTaskList>
          )}
        </section>
        {import.meta.env.DEV && debug && (
          <details {...stylex.props(s.details)}>
            <summary>DEV · ownership diagnostics</summary>
            <pre data-converter-diagnostics>
              {JSON.stringify(
                {
                  batch: view.batch,
                  tasks: view.tasks.map((task) => ({
                    id: task.id,
                    sequence: task.sequence,
                    status: task.status,
                    sourceRevision: task.processing.sourceRevision,
                    settingsRevision: task.processing.settingsRevision,
                    requestId: task.processing.requestId,
                    kind: task.processing.result?.value.kind,
                  })),
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
