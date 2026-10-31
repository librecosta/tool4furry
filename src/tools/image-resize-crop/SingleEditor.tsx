import { useEffect, useId, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { CheckboxField } from '../../ui/CheckboxField';
import { SliderField } from '../../ui/SliderField';
import { checkDimensions } from '../image/types';
import { validFilenameLabel } from '../file-naming';
import { converterStyles as c } from '../image-converter/converter.styles';
import { aspects, fullCrop, type Aspect } from './geometry';
import { CollectionControls } from './CollectionControls';
import { CropEditor } from './CropEditor';
import { CompositionPreview } from './CompositionPreview';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import { useOwnedUrl } from '../image-converter/use-owned-url';
import {
  FormatChoices,
  ParameterModes,
  type ResizeMessages,
} from './ParameterControls';
import type { ResizeCollection, CollectionView } from './collection';
import type { ResizeSession } from './session';
import { resizeStyles as s } from './resize.styles';

export function SingleEditor({
  manager,
  view,
  url,
  advanced,
  onAdvancedChange,
  save,
  t,
}: {
  manager: ResizeCollection;
  view: CollectionView;
  url?: string;
  advanced: boolean;
  onAdvancedChange: (advanced: boolean) => void;
  save: (result?: { blob: Blob; name: string }) => void;
  t: ResizeMessages;
}) {
  const session = manager.editor;
  const editor = view.editor;
  const { source, crop, output } = editor;
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButtonId = useId();
  const actual = session?.download();
  const sourceURL = useOwnedUrl(
    previewOpen ? source?.blob : undefined,
    manager.resources,
  );
  const outputURL = useOwnedUrl(
    previewOpen ? actual?.blob : undefined,
    manager.resources,
  );
  useEffect(() => setPreviewOpen(false), [source]);
  const [draft, setDraft] = useState<{
    width: string;
    height: string;
    axis: 'width' | 'height';
  }>();
  const [percent, setPercent] = useState<string>();
  const [background, setBackground] = useState<string>();
  const [dimensionError, setDimensionError] = useState(false);
  const [scaleError, setScaleError] = useState(false);
  const request = useRef<{
    session: ResizeSession;
    source: typeof source;
    crop: typeof crop;
    output: typeof output;
  }>(undefined);
  const resetInputs = () => {
    request.current = undefined;
    setDraft(undefined);
    setPercent(undefined);
    setBackground(undefined);
    setDimensionError(false);
    setScaleError(false);
  };
  useEffect(resetInputs, [source]);
  // Presentation-only convenience: the established Session still owns encoding,
  // verification and result validity. An edit/selection/unmount cancels auto-save.
  useEffect(() => {
    const pending = request.current;
    if (!pending) return;
    const current = pending.session.snapshot;
    if (
      manager.editor !== pending.session ||
      current.source !== pending.source ||
      current.crop !== pending.crop ||
      current.output !== pending.output
    ) {
      request.current = undefined;
      return;
    }
    if (current.status === 'failed') request.current = undefined;
    if (current.status === 'ready') {
      request.current = undefined;
      save(pending.session.download());
      pending.session.markDownloaded();
    }
  }, [editor, manager, save]);
  const commitDimensions = () => {
    if (!draft || !session) return true;
    try {
      session.dimensions(draft.width, draft.height, draft.axis);
      setDraft(undefined);
      setDimensionError(false);
      return true;
    } catch {
      setDimensionError(true);
      return false;
    }
  };
  const commitScale = () => {
    if (percent === undefined || !session) return true;
    try {
      session.scale(percent);
      setPercent(undefined);
      setScaleError(false);
      return true;
    } catch {
      setScaleError(true);
      return false;
    }
  };
  const commitBackground = () => {
    if (
      background === undefined ||
      !session ||
      session.snapshot.output.format !== 'jpeg'
    )
      return true;
    if (!/^#[0-9a-f]{6}$/i.test(background)) return false;
    session.output({ background });
    setBackground(undefined);
    return true;
  };
  const startDownload = () => {
    if (!session || !commitDimensions()) return;
    if (!commitScale() || !commitBackground()) {
      onAdvancedChange(true);
      return;
    }
    const current = session.snapshot;
    if (!session.validOutput()) return;
    const ready = session.download();
    if (ready) {
      save(ready);
      session.markDownloaded();
      return;
    }
    request.current = {
      session,
      source: current.source,
      crop: current.crop,
      output: current.output,
    };
    session.export();
  };
  let dimensionsInvalid = false;
  try {
    checkDimensions(output.width, output.height, manager.limits);
  } catch {
    dimensionsInvalid = true;
  }
  const busy = editor.status === 'loading';
  const labelInvalid = !validFilenameLabel(editor.label);
  const custom =
    output.quality !== 85 || output.background.toUpperCase() !== '#FFFFFF';
  return (
    <div {...stylex.props(s.grid)}>
      <section aria-label={t.editor} {...stylex.props(s.stack)}>
        <CollectionControls
          manager={manager}
          view={view}
          t={t}
          onPreview={() => setPreviewOpen(true)}
          previewButtonId={previewButtonId}
        />
        {source && (
          <ImageComparisonDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            name={source.file.name}
            source={{
              url: sourceURL,
              width: source.width,
              height: source.height,
              format: source.info.format,
              onError: () => {},
            }}
            output={actual ? {
              url: outputURL,
              width: output.width,
              height: output.height,
              format: output.format,
              onError: () => {},
            } : undefined}
            composition={url && crop ? {
              label: t.composition,
              note: t.compositionNote,
              content: <CompositionPreview view={editor} url={url} t={t} />,
            } : undefined}
            labels={t.preview}
            finalFocus={() => document.getElementById(previewButtonId) ?? document.getElementById('resize-source-button')}
          />
        )}
        {source && crop && url && (
          <CropEditor
            view={editor}
            url={url}
            t={t}
            onReset={() => {
              resetInputs();
              session?.aspect('free');
              session?.crop(fullCrop(source));
            }}
            onCrop={(crop) => {
              resetInputs();
              session?.crop(crop);
            }}
          />
        )}
      </section>
      {source && crop && (
        <aside aria-label={t.settings} {...stylex.props(c.settings)}>
          <div {...stylex.props(c.settingsHeader)}>
            <h2 {...stylex.props(c.settingsTitle)}>{t.settings}</h2>
            <ParameterModes
              advanced={advanced}
              onChange={onAdvancedChange}
              t={t}
            />
          </div>
          <SelectField
            label={t.aspect}
            value={editor.aspect}
            disabled={busy}
            options={Object.keys(aspects).map((value) => ({
              value,
              label: value === 'free' ? t.free : value,
            }))}
            onValueChange={(value) => {
              resetInputs();
              try {
                session?.aspect(value as Aspect);
              } catch {
                setDimensionError(true);
              }
            }}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              commitDimensions();
            }}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                commitDimensions();
            }}
          >
            <div {...stylex.props(s.pair)}>
              <TextField
                label={t.width}
                inputMode="numeric"
                value={draft?.width ?? String(output.width)}
                disabled={busy}
                error={dimensionError ? t.dimensionsError : undefined}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraft(undefined);
                    setDimensionError(false);
                  }
                }}
                onChange={(width) => {
                  request.current = undefined;
                  setDraft({
                    width,
                    height: draft?.height ?? String(output.height),
                    axis: 'width',
                  });
                  setDimensionError(false);
                }}
              />
              <TextField
                label={t.height}
                inputMode="numeric"
                value={draft?.height ?? String(output.height)}
                disabled={busy}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraft(undefined);
                    setDimensionError(false);
                  }
                }}
                onChange={(height) => {
                  request.current = undefined;
                  setDraft({
                    width: draft?.width ?? String(output.width),
                    height,
                    axis: 'height',
                  });
                  setDimensionError(false);
                }}
              />
            </div>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
          {advanced && (
            <>
              <CheckboxField
                label={t.lock}
                checked={editor.locked}
                disabled={busy}
                onCheckedChange={(locked) => session?.lock(locked)}
              />
              <TextField
                label={t.scale}
                inputMode="decimal"
                value={
                  percent ??
                  String(Math.round((output.width / crop.width) * 10000) / 100)
                }
                disabled={busy}
                error={scaleError ? t.dimensionsError : undefined}
                onBlur={commitScale}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitScale();
                  }
                  if (event.key === 'Escape') {
                    setPercent(undefined);
                    setScaleError(false);
                  }
                }}
                onChange={(value) => {
                  request.current = undefined;
                  setPercent(value);
                  setScaleError(false);
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  resetInputs();
                  session?.natural();
                }}
              >
                {t.natural}
              </Button>
            </>
          )}
          {dimensionsInvalid && (
            <p role="alert" {...stylex.props(c.error)}>
              {t.dimensionsError}
            </p>
          )}
          <FormatChoices
            value={output.format}
            capabilities={view.capabilities}
            disabled={busy}
            t={t}
            onChange={(format) => {
              request.current = undefined;
              session?.output({ format });
            }}
          />
          {view.capabilities &&
            !view.capabilities[output.format]?.supported && (
              <p role="alert" {...stylex.props(c.error)}>
                {t.unsupported}
              </p>
            )}
          {source.info.format === 'avif' && (
            <p {...stylex.props(c.note)}>{t.avif}</p>
          )}
          {advanced && (
            <>
              {output.format !== 'png' && (
                <SliderField
                  accent="lavender"
                  label={t.quality}
                  min={1}
                  max={100}
                  value={output.quality}
                  disabled={busy}
                  onValueChange={(quality) => {
                    request.current = undefined;
                    session?.output({ quality });
                  }}
                />
              )}
              {output.format === 'jpeg' && (
                <div {...stylex.props(c.backgroundControl, s.colorControl)}>
                  <TextField
                    label={t.background}
                    value={background ?? output.background}
                    disabled={busy}
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
                    onChange={(value) => {
                      request.current = undefined;
                      setBackground(value);
                    }}
                  />
                  <input
                    type="color"
                    aria-label={t.pickBackground}
                    disabled={busy}
                    value={output.background}
                    {...stylex.props(s.colorPicker)}
                    onChange={(event) => {
                      setBackground(undefined);
                      request.current = undefined;
                      session?.output({ background: event.target.value });
                    }}
                  />
                </div>
              )}
              <TextField
                label={t.label}
                value={editor.label}
                error={labelInvalid ? t.labelError : undefined}
                maxLength={80}
                onChange={(label) => session?.label(label)}
              />
              {custom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    request.current = undefined;
                    setBackground(undefined);
                    session?.output({ quality: 85, background: '#FFFFFF' });
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
            (scaleError ||
              (output.format === 'jpeg' && background !== undefined) ||
              labelInvalid) && (
              <p role="alert" {...stylex.props(c.error)}>
                {t.checkAdvanced}
              </p>
            )}
          <div {...stylex.props(s.download)}>
            <span {...stylex.props(s.outputSize)}>
              {output.width} × {output.height}
              <span {...stylex.props(c.note)}>
                {' '}
                px · {output.format.toUpperCase()}
              </span>
            </span>
            <Button
              variant="primary"
              xstyle={c.supportAction}
              loading={editor.status === 'exporting'}
              disabled={busy || dimensionsInvalid || !session?.validOutput()}
              onClick={startDownload}
            >
              {editor.status === 'failed' ? t.retryDownload : t.download}
            </Button>
            {editor.status === 'ready' && editor.downloaded && (
              <p role="status" {...stylex.props(s.success)}>
                {t.downloaded}
              </p>
            )}
            {editor.status === 'exporting' && (
              <p role="status" {...stylex.props(c.note)}>
                {t.processing}
              </p>
            )}
            {editor.error && (
              <p role="alert" {...stylex.props(c.error)}>
                {t.errors[editor.error as keyof typeof t.errors] ??
                  t.errors.fallback}
              </p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
