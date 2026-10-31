import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { CheckboxField } from '../../ui/CheckboxField';
import { SliderField } from '../../ui/SliderField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { mobileImageLimits, resolveImageLimits } from '../image/limits';
import { checkDimensions, type NativeImageFormat } from '../image/types';
import { validFilenameLabel } from '../file-naming';
import { aspects, fullCrop, type Aspect } from './geometry';
import { ResizeCollection, initialCollection } from './collection';
import { CollectionControls } from './CollectionControls';
import { BatchPanel } from './BatchPanel';
import { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';
import { CropEditor } from './CropEditor';
import cropLicense from './crop.NOTICE.txt?url';

const accept =
  '.png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif';
export default function ImageResizeCrop({ locale }: ToolProps) {
  const t = resizeMessages[locale];
  const [manager, setManager] = useState<ResizeCollection>();
  const [collection, setCollection] = useState(initialCollection);
  const session = manager?.editor;
  const view = collection.editor;
  const [url, setUrl] = useState<string>();
  const [confirm, setConfirm] = useState<'replace' | 'clear'>();
  const [draft, setDraft] = useState<{
    width: string;
    height: string;
    axis: 'width' | 'height';
  }>();
  const [percent, setPercent] = useState<string>();
  const [background, setBackground] = useState<string>();
  const [inputError, setInputError] = useState(false);
  const hadSource = useRef(false);
  const replacement = useRef<HTMLInputElement>(null);
  const downloads = useRef(new Set<string>());
  const limits = manager?.limits ?? mobileImageLimits;
  const { source, crop, output } = view;
  useEffect(() => {
    if (hadSource.current && !source)
      document.getElementById('resize-source-button')?.focus();
    hadSource.current = !!source;
  }, [source]);
  useEffect(() => {
    const current = new ResizeCollection(
      setCollection,
      undefined,
      resolveImageLimits({
        mobile: (
          navigator as Navigator & { userAgentData?: { mobile?: boolean } }
        ).userAgentData?.mobile,
        userAgent: navigator.userAgent,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
      }),
    );
    setManager(current);
    current.start();
    return () => {
      current.dispose();
      for (const url of downloads.current) current.resources.revoke(url);
      downloads.current.clear();
    };
  }, []);
  useEffect(() => {
    if (!view.preview || !manager) {
      setUrl(undefined);
      return;
    }
    const url = manager.resources.url(view.preview);
    setUrl(url);
    return () => manager.resources.revoke(url);
  }, [view.preview, manager]);
  const resetInputs = () => {
    setDraft(undefined);
    setPercent(undefined);
    setBackground(undefined);
    setInputError(false);
  };
  useEffect(resetInputs, [source]);
  const pending =
    draft !== undefined || percent !== undefined || background !== undefined;
  const busy = view.status === 'loading';
  let dimensionsInvalid = false;
  try {
    checkDimensions(output.width, output.height, limits);
  } catch {
    dimensionsInvalid = true;
  }
  const labelInvalid = !validFilenameLabel(view.label);
  const filename = session?.filename();
  const load = (file?: File) => {
    if (file) {
      resetInputs();
      manager?.replace(file);
    }
  };
  const save = (result?: { blob: Blob; name: string }) => {
    if (!result || !manager) return;
    const url = manager.resources.url(result.blob);
    downloads.current.add(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.name;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
    setTimeout(() => {
      if (downloads.current.delete(url)) manager.resources.revoke(url);
    }, 1000);
  };
  const download = () => {
    if (pending) return;
    save(session?.download());
    session?.markDownloaded();
  };
  const labels = {
    parameters: t.settings,
    close: t.cancel,
    showParameters: t.settings,
    hideParameters: t.settings,
    showTools: t.editor,
    hideTools: t.editor,
    main: t.editor,
    toolbar: t.editor,
  };
  return (
    <WorkbenchShell mode="form" formWidth="wide" labels={labels}>
      <div data-image-resize-crop {...stylex.props(s.stack)}>
        <p {...stylex.props(s.note)}>{t.local}</p>
        <FileDropzone
          id="resize-source"
          label={collection.files.length ? t.append : t.pick}
          hint={`${t.input} ≤ ${limits.bytes / 1024 ** 2} MiB; ≤ ${limits.files} ${t.files}; ≤ ${limits.totalBytes / 1024 ** 2} MiB ${t.totalInput}.`}
          accept={accept}
          multiple
          appearance={collection.files.length ? 'compact' : 'expanded'}
          maxSizeBytes={limits.bytes}
          disabled={!manager}
          issueMessages={{ type: t.reject, size: t.reject, count: t.reject }}
          onFilesReceived={(files) => manager?.add(files)}
        />
        {manager && (
          <CollectionControls manager={manager} view={collection} t={t} />
        )}
        {collection.mode === 'batch' && manager && (
          <BatchPanel manager={manager} view={collection} t={t} save={save} />
        )}
        {collection.mode === 'single' && source && (
          <div {...stylex.props(s.actions)}>
            <ConfirmDialog
              open={confirm === 'replace'}
              onOpenChange={(open) => setConfirm(open ? 'replace' : undefined)}
              title={t.confirm}
              description={t.confirmText}
              confirmLabel={t.replace}
              cancelLabel={t.cancel}
              onConfirm={() => replacement.current?.click()}
              trigger={<Button disabled={busy}>{t.replace}</Button>}
            />
            <ConfirmDialog
              open={confirm === 'clear'}
              onOpenChange={(open) => setConfirm(open ? 'clear' : undefined)}
              title={t.confirm}
              description={t.confirmText}
              confirmLabel={t.remove}
              cancelLabel={t.cancel}
              danger
              onConfirm={() => {
                if (collection.selectedId)
                  manager?.remove(collection.selectedId);
                resetInputs();
              }}
              trigger={<Button>{t.remove}</Button>}
            />
            <input
              ref={replacement}
              type="file"
              accept={accept}
              hidden
              aria-label={t.replace}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                load(file);
              }}
            />
            <span {...stylex.props(s.filename)}>{source.file.name}</span>
          </div>
        )}
        {collection.mode === 'single' && (
          <div {...stylex.props(source && s.grid)}>
            {source && crop && url && (
              <CropEditor
                key={url}
                view={view}
                url={url}
                t={t}
                onCrop={(crop) => {
                  resetInputs();
                  session?.crop(crop);
                }}
              />
            )}
            {source && crop && (
              <aside aria-label={t.settings} {...stylex.props(s.panel)}>
                <h2 {...stylex.props(s.heading)}>{t.settings}</h2>
                <SelectField
                  label={t.aspect}
                  value={view.aspect}
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
                      setInputError(true);
                    }
                  }}
                />
                <Button
                  disabled={busy}
                  onClick={() => {
                    resetInputs();
                    session?.aspect('free');
                    session?.crop(fullCrop(source));
                  }}
                >
                  {t.full}
                </Button>
                <CheckboxField
                  label={t.lock}
                  checked={view.locked}
                  disabled={busy}
                  onCheckedChange={(locked) => session?.lock(locked)}
                />
                <form
                  {...stylex.props(s.stack)}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!draft) return;
                    try {
                      session?.dimensions(
                        draft.width,
                        draft.height,
                        draft.axis,
                      );
                      resetInputs();
                    } catch {
                      setInputError(true);
                    }
                  }}
                >
                  <div {...stylex.props(s.pair)}>
                    <TextField
                      label={t.width}
                      inputMode="numeric"
                      value={draft?.width ?? String(output.width)}
                      disabled={busy}
                      onChange={(width) => {
                        setDraft({
                          width,
                          height: draft?.height ?? String(output.height),
                          axis: 'width',
                        });
                        setInputError(false);
                      }}
                    />
                    <TextField
                      label={t.height}
                      inputMode="numeric"
                      value={draft?.height ?? String(output.height)}
                      disabled={busy}
                      onChange={(height) => {
                        setDraft({
                          width: draft?.width ?? String(output.width),
                          height,
                          axis: 'height',
                        });
                        setInputError(false);
                      }}
                    />
                  </div>
                  <Button type="submit" disabled={busy || !draft}>
                    {t.apply}
                  </Button>
                </form>
                <form
                  {...stylex.props(s.stack)}
                  onSubmit={(event) => {
                    event.preventDefault();
                    try {
                      session?.scale(percent ?? '100');
                      resetInputs();
                    } catch {
                      setInputError(true);
                    }
                  }}
                >
                  <TextField
                    label={t.scale}
                    inputMode="decimal"
                    value={
                      percent ??
                      String(
                        Math.round((output.width / crop.width) * 10000) / 100,
                      )
                    }
                    disabled={busy}
                    onChange={(value) => {
                      setPercent(value);
                      setInputError(false);
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={busy || percent === undefined}
                  >
                    {t.applyScale}
                  </Button>
                </form>
                <Button
                  disabled={busy}
                  onClick={() => {
                    resetInputs();
                    session?.natural();
                  }}
                >
                  {t.natural}
                </Button>
                {(inputError || dimensionsInvalid) && (
                  <p role="alert" {...stylex.props(s.note, s.error)}>
                    {t.dimensionsError}
                  </p>
                )}
                <p {...stylex.props(s.note)}>
                  ≤ {limits.edge}px · ≤ {limits.pixels / 1000000} MP
                </p>
                {(output.width > crop.width || output.height > crop.height) && (
                  <p {...stylex.props(s.note)}>{t.upscale}</p>
                )}
                {source.info.format === 'avif' && (
                  <p {...stylex.props(s.note)}>{t.avif}</p>
                )}
                <SelectField
                  label={t.format}
                  value={output.format}
                  disabled={busy}
                  options={['png', 'jpeg', 'webp'].map((value) => ({
                    value,
                    label: value.toUpperCase(),
                    disabled:
                      !view.capabilities?.[value as NativeImageFormat]
                        ?.supported,
                  }))}
                  onValueChange={(format) =>
                    session?.output({ format: format as NativeImageFormat })
                  }
                />
                {!view.capabilities?.[output.format]?.supported && (
                  <p {...stylex.props(s.note)}>{t.unsupported}</p>
                )}
                {output.format !== 'png' && (
                  <SliderField
                    label={t.quality}
                    min={1}
                    max={100}
                    value={output.quality}
                    disabled={busy}
                    onValueChange={(quality) => session?.output({ quality })}
                  />
                )}
                {output.format === 'jpeg' && (
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
                    onChange={(value) => {
                      if (/^#[0-9a-f]{6}$/i.test(value)) {
                        session?.output({ background: value });
                        setBackground(undefined);
                      } else setBackground(value);
                    }}
                  />
                )}
                <TextField
                  label={t.label}
                  value={view.label}
                  error={labelInvalid ? t.labelError : undefined}
                  onChange={(value) => session?.label(value)}
                />
                <p {...stylex.props(s.filename)}>{filename?.name}</p>
                {pending && (
                  <div {...stylex.props(s.stack)}>
                    <p {...stylex.props(s.note)}>{t.pending}</p>
                    <Button onClick={resetInputs}>{t.resetInputs}</Button>
                  </div>
                )}
                <Button
                  variant="primary"
                  disabled={
                    busy ||
                    pending ||
                    dimensionsInvalid ||
                    !session?.validOutput() ||
                    view.status === 'exporting'
                  }
                  onClick={() => session?.export()}
                >
                  {view.status === 'failed' ? t.retry : t.export}
                </Button>
                <Button
                  disabled={pending || !session?.download()}
                  onClick={download}
                >
                  {t.download}
                </Button>
              </aside>
            )}
          </div>
        )}
        {collection.mode === 'single' && (
          <p role="status" aria-live="polite" {...stylex.props(s.note)}>
            {t.statuses[view.status]}
            {view.result
              ? ` (${(view.result.size / 1024).toFixed(1)} KiB)`
              : ''}
          </p>
        )}
        {collection.mode === 'single' && view.error && (
          <p role="alert" {...stylex.props(s.note, s.error)}>
            {t.failed}
            {t.errors[view.error as keyof typeof t.errors] ?? t.errors.fallback}
          </p>
        )}
        <a
          href={cropLicense}
          target="_blank"
          rel="noreferrer"
          {...stylex.props(s.note)}
        >
          {t.license}
        </a>
      </div>
    </WorkbenchShell>
  );
}
