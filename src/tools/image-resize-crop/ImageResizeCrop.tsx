import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { CropIcon, StackIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { mobileImageLimits, resolveImageLimits } from '../image/limits';
import { imageAccept } from '../image-converter/intake';
import { converterStyles as c } from '../image-converter/converter.styles';
import { ResizeCollection, initialCollection } from './collection';
import { SingleEditor } from './SingleEditor';
import { BatchPanel } from './BatchPanel';
import { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';
import cropLicense from './crop.NOTICE.txt?url';

export default function ImageResizeCrop({ locale }: ToolProps) {
  const t = resizeMessages[locale];
  const [manager, setManager] = useState<ResizeCollection>();
  const [view, setView] = useState(initialCollection);
  const [url, setUrl] = useState<string>();
  const [singleAdvanced, setSingleAdvanced] = useState(false);
  const [batchAdvanced, setBatchAdvanced] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const downloads = useRef(new Set<string>());
  const hadFiles = useRef(false);
  const limits = manager?.limits ?? mobileImageLimits;
  const hasFiles = !!view.files.length;
  useEffect(() => {
    const current = new ResizeCollection(
      setView,
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
    if (hadFiles.current && !hasFiles)
      document.getElementById('resize-source-button')?.focus();
    hadFiles.current = hasFiles;
  }, [hasFiles]);
  useEffect(() => {
    if (!view.editor.preview || !manager) {
      setUrl(undefined);
      return;
    }
    const url = manager.resources.url(view.editor.preview);
    setUrl(url);
    return () => manager.resources.revoke(url);
  }, [view.editor.preview, manager]);
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
      setTimeout(() => {
        if (downloads.current.delete(url)) manager.resources.revoke(url);
      }, 1000);
    }
  };
  const rejected = Object.entries(view.intakeSummary?.rejected ?? {}).filter(
    ([, count]) => count > 0,
  );
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
    <>
      {/* Non-visual license metadata retains the notice in this Draft-only asset graph. */}
      <link rel="license" href={cropLicense} />
      <WorkbenchShell mode="form" formWidth="wide" labels={labels}>
        <div
          data-image-resize-crop
          data-resize-mode={view.mode}
          {...stylex.props(s.stack, !hasFiles && s.empty)}
        >
          <div {...stylex.props(hasFiles && s.toolbar, !hasFiles && s.stack)}>
            {hasFiles && (
              <div
                role="group"
                aria-label={t.workflows}
                {...stylex.props(s.workflows)}
              >
                {(['single', 'batch'] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={view.mode === mode}
                    {...stylex.props(
                      s.workflow,
                      view.mode === mode && s.currentWorkflow,
                    )}
                    onClick={() => manager?.setMode(mode)}
                  >
                    {mode === 'single' ? (
                      <CropIcon size={20} />
                    ) : (
                      <StackIcon size={20} />
                    )}
                    {t[mode]}
                  </button>
                ))}
              </div>
            )}
            <div {...stylex.props(hasFiles && s.addFiles)}>
              <FileDropzone
                id="resize-source"
                label={hasFiles ? t.append : t.pick}
                hint={hasFiles ? undefined : 'PNG / JPEG / WebP / AVIF'}
                accept={imageAccept}
                multiple
                appearance={hasFiles ? 'compact' : 'expanded'}
                disabled={!manager}
                issueMessages={{
                  type: t.intake.type,
                  size: t.intake.size,
                  count: t.intake.count,
                }}
                onFilesReceived={(files) => manager?.add(files)}
              />
              {view.files.length > 1 && (
                <ConfirmDialog
                  open={confirmClear}
                  onOpenChange={setConfirmClear}
                  title={t.clearAll}
                  description={t.clearAllText}
                  confirmLabel={t.clearAll}
                  cancelLabel={t.cancel}
                  danger
                  onConfirm={() => manager?.clear()}
                  trigger={
                    <Button variant="ghost" size="sm">
                      {t.clearAll}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
          <details {...stylex.props(c.help)}>
            <summary>{t.fileDetails}</summary>
            <p {...stylex.props(c.note)}>{t.input}</p>
            <p {...stylex.props(c.note)}>
              {t.limitPerFile} {limits.bytes / 1024 ** 2} MiB · {t.limitFiles}{' '}
              {limits.files} · {t.limitTotal} {limits.totalBytes / 1024 ** 2}{' '}
              MiB
            </p>
            <p {...stylex.props(c.note)}>
              {t.limitSize} {limits.edge}px · {limits.pixels / 1000000} MP
            </p>
            <p {...stylex.props(c.note)}>{t.inputLimitations}</p>
          </details>
          {!!rejected.length && (
            <p role="alert" {...stylex.props(c.error)}>
              {t.intakeRejected}{' '}
              {rejected
                .map(
                  ([reason, count]) =>
                    `${t.intake[reason as keyof typeof t.intake]} × ${count}`,
                )
                .join(' · ')}
            </p>
          )}
          {view.mode === 'single' &&
            view.files
              .filter((item) => item.intake === 'failed')
              .map((item) => (
                <p key={item.id} role="alert" {...stylex.props(c.error)}>
                  {item.file.name}:{' '}
                  {t.errors[item.error as keyof typeof t.errors] ??
                    t.errors.fallback}
                </p>
              ))}
          {manager &&
            hasFiles &&
            (view.mode === 'single' ? (
              <SingleEditor
                key={view.selectedId}
                manager={manager}
                view={view}
                url={url}
                advanced={singleAdvanced}
                onAdvancedChange={setSingleAdvanced}
                save={save}
                t={t}
              />
            ) : (
              <BatchPanel
                manager={manager}
                view={view}
                advanced={batchAdvanced}
                onAdvancedChange={setBatchAdvanced}
                t={t}
                save={save}
              />
            ))}
        </div>
      </WorkbenchShell>
    </>
  );
}
