import { useEffect, useId, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SliderField } from '../../ui/SliderField';
import { controls as c } from '../../styles/controls';
import { ImageResources } from '../image/resources';
import { formats, imageBudget, type ImageErrorCode } from '../image/types';
import { createProcessingState, isCustomSettings } from '../processing-state';
import { recommendations, sameSettings } from './presets';
import { ConverterSession, type ConverterView } from './session';
import { downloadName } from './filename';
import { converterMessages } from './messages';
import { converterStyles as s } from './converter.styles';

function useOwnedUrl(
  blob: Blob | undefined,
  resources: ImageResources | undefined,
) {
  const [owned, setOwned] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob || !resources) {
      setOwned(undefined);
      return;
    }
    const url = resources.url(blob);
    setOwned({ blob, url });
    return () => resources.revoke(url);
  }, [blob, resources]);
  return owned?.blob === blob ? owned?.url : undefined;
}
const bytes = (value: number) => `${value.toLocaleString('en-US')} B`;
export default function ImageConverter({ region }: ToolProps) {
  const t = converterMessages[region];
  const [session, setSession] = useState<ConverterSession>();
  const [view, setView] = useState<ConverterView>(() => ({
    processing: createProcessingState(recommendations.webp),
    checkingCapabilities: true,
    filename: '',
  }));
  const [preview, setPreview] = useState<'source' | 'output'>('source');
  const [previewError, setPreviewError] = useState<Blob>();
  const [qualityDraft, setQualityDraft] = useState<string>();
  const [debug, setDebug] = useState(false);
  const qualityId = useId();
  const formatGroup = useId();
  useEffect(() => {
    if (import.meta.env.DEV)
      setDebug(new URLSearchParams(window.location.search).get('debug') === '1');
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
  const sourceUrl = useOwnedUrl(view.source?.blob, session?.resources);
  const resultUrl = useOwnedUrl(result?.blob, session?.resources);
  const visiblePreview = result ? preview : 'source';
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
      Number(qualityText) < 1 || Number(qualityText) > 100);
  const downloadable =
    download && resultUrl && !name.error && !qualityInvalid &&
    previewError !== download.blob;
  const backgroundInvalid =
    settings.format === 'jpeg' &&
    !/^#[0-9a-f]{6}$/i.test(settings.jpegBackground);
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
  const status = view.candidate
    ? t.validating
    : state.status === 'processing'
      ? t.processing
      : state.status === 'stale' && result
        ? t.stale
        : state.status === 'ready'
          ? result?.kind === 'passthrough'
            ? t.passthrough
            : t.ready
          : view.source
            ? t.sourceReady
            : t.idle;
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
          {...stylex.props(s.file)}
        >
          <div {...stylex.props(s.strip, !view.source && s.emptyStrip)}>
            {view.source && (
              <div {...stylex.props(s.metadata)}>
                <strong
                  title={view.source.file.name}
                  {...stylex.props(s.fileName)}
                >
                  {view.source.file.name}
                </strong>
                <span {...stylex.props(s.note)}>
                  {view.source.info.format.toUpperCase()} · {view.source.width}{' '}
                  × {view.source.height} · {bytes(view.source.file.size)}
                </span>
              </div>
            )}
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
            {view.source && (
              <Button
                onClick={() => {
                  session?.remove();
                  setPreview('source');
                  document.getElementById('converter-source-button')?.focus();
                }}
              >
                {t.remove}
              </Button>
            )}
          </div>
          {!view.source && (
            <details {...stylex.props(s.help)}>
              <summary>{t.fileDetails}</summary>
              <p {...stylex.props(s.note)}>{t.budget}</p>
              <p {...stylex.props(s.note)}>{t.limitations}</p>
            </details>
          )}
          {view.candidate && (
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
                  {...stylex.props(s.mode, state.mode === mode && s.currentMode)}
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
                        {...stylex.props(c.input, s.qualityInput, qualityInvalid && c.invalid)}
                        onChange={(event) => {
                          const text = event.target.value;
                          setQualityDraft(text);
                          const quality = Number(text);
                          if (/^\d+$/.test(text) && Number.isInteger(quality) &&
                              quality >= 1 && quality <= 100)
                            session?.settings({ ...settings, quality });
                        }}
                      />
                    }
                  />
                  <div id={`${qualityId}-scale`} {...stylex.props(s.qualityScale)}>
                    <span>{t.smallerFile}</span><span>{t.higherQuality}</span>
                  </div>
                </div>
              )}
              {settings.format === 'jpeg' && (
                <>
                  <TextField
                    label={t.background}
                    value={settings.jpegBackground}
                    maxLength={7}
                    error={backgroundInvalid ? t.backgroundError : undefined}
                    onChange={(jpegBackground) =>
                      session?.settings({ ...settings, jpegBackground })
                    }
                  />
                  <div {...stylex.props(s.row)}>
                    <span
                      aria-hidden
                      {...stylex.props(
                        s.swatch(
                          backgroundInvalid
                            ? 'transparent'
                            : settings.jpegBackground,
                        ),
                      )}
                    />
                    <p {...stylex.props(s.note)}>{t.jpegNote}</p>
                  </div>
                </>
              )}
              <TextField
                label={t.filename}
                value={view.filename}
                maxLength={180}
                hint={t.filenameHint}
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
          {(state.mode === 'advanced' || isCustomSettings(state, sameSettings)) && (
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
          <details {...stylex.props(s.help)}>
            <summary>{t.settingsHelp}</summary>
            <p {...stylex.props(s.note)}>{t.formatNote}</p>
          </details>
          {view.source && (
            <a href="#converter-result" {...stylex.props(c.button, c.ghost)}>
              {t.viewResult}
            </a>
          )}
        </section>
        <section
          hidden={!view.source}
          data-converter-part="preview"
          aria-labelledby="converter-preview"
          {...stylex.props(s.preview)}
        >
          <h2 id="converter-preview" {...stylex.props(s.heading)}>
            {t.preview}
          </h2>
          {result && (
            <div
              role="group"
              aria-label={t.previewToggle}
              {...stylex.props(s.mobileTabs)}
            >
              <Button
                aria-pressed={visiblePreview === 'source'}
                onClick={() => setPreview('source')}
              >
                {t.original}
              </Button>
              <Button
                aria-pressed={visiblePreview === 'output'}
                onClick={() => setPreview('output')}
              >
                {t.output}
              </Button>
            </div>
          )}
          <div {...stylex.props(s.previews, !result && s.singlePreview)}>
            {(['source', 'output'] as const)
              .filter((which) => which === 'source' || result)
              .map((which) => {
                const source = which === 'source',
                  url = source ? sourceUrl : resultUrl,
                  blob = source ? view.source?.blob : result?.blob;
                return (
                  <figure
                    key={which}
                    {...stylex.props(
                      s.figure,
                      visiblePreview !== which && s.mobileHidden,
                    )}
                  >
                    <div {...stylex.props(s.imageBox)}>
                      {url ? (
                        <img
                          src={url}
                          alt={
                            source
                              ? t.original
                              : state.status === 'ready'
                                ? t.output
                                : t.old
                          }
                          onError={() => setPreviewError(blob)}
                          {...stylex.props(s.image)}
                        />
                      ) : (
                        <p {...stylex.props(s.note)}>
                          {source ? t.sourceReady : t.noOutput}
                        </p>
                      )}
                    </div>
                    <figcaption {...stylex.props(s.caption)}>
                      {source
                        ? t.original
                        : !result || state.status === 'ready'
                          ? t.output
                          : t.old}
                      {source && view.source
                        ? ` · ${view.source.info.format.toUpperCase()} · ${view.source.width}×${view.source.height} · ${bytes(view.source.file.size)}`
                        : !source && result
                          ? ` · ${result.mime} · ${result.width}×${result.height} · ${bytes(result.bytes)}`
                          : ''}
                    </figcaption>
                  </figure>
                );
              })}
          </div>
          {previewError &&
            (previewError === view.source?.blob ||
              previewError === result?.blob) && (
              <p role="alert" {...stylex.props(s.error)}>
                {t.previewError}
              </p>
            )}
        </section>
        <section
          id="converter-result"
          hidden={!view.source}
          data-converter-part="result"
          aria-labelledby="converter-result-heading"
          {...stylex.props(s.result)}
        >
          <h2 id="converter-result-heading" {...stylex.props(s.heading)}>
            {t.result}
          </h2>
          <p role="status" {...stylex.props(s.note)}>
            {status}
          </p>
          {state.error && (
            <p role="alert" {...stylex.props(s.error)}>
              {t.errors[state.error as ImageErrorCode] ?? t.errors.encode}
            </p>
          )}
          {result && view.source && (
            <p {...stylex.props(s.note)}>
              {t.saved}: {result.bytes - view.source.file.size >= 0 ? '+' : ''}
              {bytes(result.bytes - view.source.file.size)}
              {state.status !== 'ready' ? ` · ${t.old}` : ''}
            </p>
          )}
          {!name.error && view.source && (
            <p {...stylex.props(s.note)}>{name.name}</p>
          )}
          <div {...stylex.props(s.row)}>
            {downloadable ? (
              <a
                href={resultUrl}
                download={name.name}
                {...stylex.props(c.button, c.primary)}
              >
                {download.kind === 'passthrough'
                  ? t.originalDownload
                  : t.download}
              </a>
            ) : (
              <Button disabled>
                {result?.kind === 'passthrough'
                  ? t.originalDownload
                  : t.download}
              </Button>
            )}
            {(state.mode === 'advanced' ||
              state.status === 'error' ||
              state.status === 'stale' ||
              (view.source && state.status === 'idle')) && (
              <Button
                variant={!downloadable ? 'primary' : 'secondary'}
                loading={state.status === 'processing'}
                disabled={!canGenerate || state.status === 'processing'}
                onClick={() => session?.generate()}
              >
                {state.status === 'error'
                  ? t.retry
                  : state.mode === 'advanced' &&
                      view.source?.info.format === settings.format
                    ? t.reencode
                    : t.generate}
              </Button>
            )}
          </div>
        </section>
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
