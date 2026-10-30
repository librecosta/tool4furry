import { useEffect, useState } from 'react';
import { FileTaskRow, type FileTaskItem } from '../../ui/FileTaskList';
import { ImageThumbnail } from '../image/ImageThumbnail';
import { useOwnedUrl } from './use-owned-url';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import type { ConverterSession, ConverterTask } from './session';
import type { converterMessages } from './messages';

export const previewButtonId = (id: string) => `converter-preview-${id}`;
export function ConverterTaskRow({
  task,
  session,
  t,
  previewOpen,
  onPreviewChange,
  blocked,
  canProcess,
  formatBytes,
}: {
  task: ConverterTask;
  session: ConverterSession;
  t: (typeof converterMessages)['zh'];
  previewOpen: boolean;
  onPreviewChange: (open: boolean) => void;
  blocked?: string;
  canProcess: boolean;
  formatBytes: (value: number) => string;
}) {
  const [previewError, setPreviewError] = useState<Blob>();
  const source = task.source;
  const result = session.download(task.id);
  const sourceUrl = useOwnedUrl(source?.blob, session.resources);
  const ownedResultUrl = useOwnedUrl(
    result?.blob !== source?.blob ? result?.blob : undefined,
    session.resources,
  );
  const resultUrl = result?.blob === source?.blob ? sourceUrl : ownedResultUrl;
  useEffect(() => setPreviewError(undefined), [source?.blob, result?.blob]);
  const name = session.filename(task.id);
  const output = !blocked ? result : undefined;
  const downloadable =
    !!output && !!resultUrl && !name.error && previewError !== output.blob;
  const state = blocked && task.status === 'ready' ? 'stale' : task.status;
  const disabledReason = name.error
    ? t.filenameError
    : (blocked ??
      (previewError === result?.blob && previewError
        ? t.previewError
        : t.taskStatus[state]));
  const finalFocus = () =>
    document.getElementById(previewButtonId(task.id)) ??
    document.getElementById('converter-source-button');
  const item: FileTaskItem = {
    id: task.id,
    name: task.file.name,
    media: (
      <ImageThumbnail src={sourceUrl} checking={task.status === 'validating'} />
    ),
    metadata: source
      ? `${source.info.format.toUpperCase()} · ${source.width}×${source.height} · ${formatBytes(task.file.size)}`
      : formatBytes(task.file.size),
    output: output
      ? `${output.mime.replace('image/', '').toUpperCase()} · ${formatBytes(output.bytes)} (${output.bytes - task.file.size >= 0 ? '+' : ''}${formatBytes(output.bytes - task.file.size)})`
      : undefined,
    status: state,
    statusLabel: t.taskStatus[state],
    error: task.error
      ? `${t.errors[task.error]}${task.errorDetail ? ` ${task.errorDetail}` : ''}`
      : previewError && !previewOpen
        ? t.previewError
        : undefined,
    actions: [
      {
        kind: 'preview',
        id: previewButtonId(task.id),
        label: t.preview,
        disabled: !source,
        disabledReason: !source ? t.taskStatus[task.status] : undefined,
        onClick: () => onPreviewChange(true),
      },
      {
        kind: 'download',
        label: result?.kind === 'passthrough' ? t.originalDownload : result?.kind === 'cleaned' ? t.cleanedDownload : t.download,
        href: downloadable ? resultUrl : undefined,
        download: name.name,
        disabled: !downloadable,
        disabledReason: !downloadable ? disabledReason : undefined,
      },
      ...(task.status === 'error'
        ? [
            {
              kind: 'retry' as const,
              label: t.retry,
              disabled: source ? !canProcess : false,
              onClick: () => session.retry(task.id),
            },
          ]
        : []),
      {
        kind: 'remove',
        label: t.remove,
        onClick: () => {
          onPreviewChange(false);
          session.remove(task.id);
          document.getElementById('converter-source-button')?.focus();
        },
      },
    ],
  };
  return (
    <>
      <FileTaskRow item={item} />
      {source && (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={onPreviewChange}
          source={source}
          sourceUrl={sourceUrl}
          output={output}
          outputUrl={output ? resultUrl : undefined}
          t={t}
          finalFocus={finalFocus}
          onError={setPreviewError}
          onLoad={(blob) =>
            setPreviewError((error) => (error === blob ? undefined : error))
          }
        />
      )}
    </>
  );
}
