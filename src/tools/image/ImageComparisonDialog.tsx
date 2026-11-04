import s from './ImageComparisonDialog.module.scss';
import { useEffect, useState, type ReactNode } from 'react';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import {
  ImagePreviewViewport,
  type ImagePreviewLabels,
} from './ImagePreviewViewport';

export interface ComparisonLabels {
  preview: string;
  original: string;
  output: string;
  compare: string;
  previewToggle: string;
  outputUnavailable: string;
  closePreview: string;
  maximizePreview: string;
  restorePreview: string;
  viewer: ImagePreviewLabels;
}
export interface PreviewImage {
  url?: string;
  width: number;
  height: number;
  format: string;
  onError: () => void;
  onLoad?: () => void;
}
type Selection = 'source' | 'output' | 'compare' | 'composition';

/** Display only: callers supply owned URLs and only currently valid outputs. */
export function ImageComparisonDialog({
  open,
  onOpenChange,
  name,
  source,
  output,
  composition,
  labels,
  finalFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  source: PreviewImage;
  output?: PreviewImage;
  composition?: { label: string; note: string; content: ReactNode };
  labels: ComparisonLabels;
  finalFocus: () => HTMLElement | null;
}) {
  const [selection, setSelection] = useState<Selection>('source');
  useEffect(() => setSelection('source'), [open, source.url, output?.url]);
  // Derive availability during render, before an old URL could be displayed.
  const hasOutput = !!output;
  const hasComposition = !hasOutput && !!composition;
  const current =
    selection === 'compare' && hasOutput ? 'compare'
      : selection === 'output' && hasOutput ? 'output'
        : selection === 'composition' && hasComposition ? 'composition'
          : 'source';
  const modes = [
    { id: 'source', label: labels.original, disabled: false },
    {
      id: hasComposition ? 'composition' : 'output',
      label: hasComposition ? composition!.label : labels.output,
      disabled: !hasOutput && !hasComposition,
    },
    { id: 'compare', label: labels.compare, disabled: !hasOutput },
  ] as const;
  const panel = (image: PreviewImage, label: string) => (
    <section key={label} aria-label={label} className={s.panel}>
      <div className={s.caption}>
        <span>{label}</span>
        <span className={s.metadata}>
          {image.width} × {image.height} · {image.format.toUpperCase()}
        </span>
      </div>
      {image.url ? (
        <ImagePreviewViewport
          key={image.url}
          src={image.url}
          width={image.width}
          height={image.height}
          alt={label}
          labels={{ ...labels.viewer, viewport: `${labels.viewer.viewport}: ${label}` }}
          onError={image.onError}
          onLoad={image.onLoad}
        />
      ) : <p role="status" className={s.metadata}>{labels.viewer.loading}</p>}
    </section>
  );
  return (
    <FilePreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      title={labels.preview}
      description={name}
      labels={{ close: labels.closePreview, maximize: labels.maximizePreview, restore: labels.restorePreview }}
      finalFocus={finalFocus}
      toolbar={
        <div role="group" aria-label={labels.previewToggle} className={s.modes}>
          {modes.map(mode => (
            <button
              key={mode.id}
              type="button"
              disabled={mode.disabled}
              aria-pressed={current === mode.id}
              aria-description={mode.disabled ? labels.outputUnavailable : undefined}
              className={[s.mode, current === mode.id && s.current].filter(Boolean).join(' ')}
              onClick={() => setSelection(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      }
    >
      {current === 'composition' && composition ? (
        <div className={s.draft}>
          <p className={s.metadata}>{composition.note}</p>
          {composition.content}
        </div>
      ) : (
        <div data-image-comparison={current} className={[s.view, current === 'compare' && s.compare].filter(Boolean).join(' ')}>
          {current !== 'output' && panel(source, labels.original)}
          {(current === 'output' || current === 'compare') && output && panel(output, labels.output)}
        </div>
      )}
    </FilePreviewDialog>
  );
}
