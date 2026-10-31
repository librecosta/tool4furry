import { useEffect, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { tokens as t } from '../../styles/tokens.stylex';
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
    <section key={label} aria-label={label} {...stylex.props(s.panel)}>
      <div {...stylex.props(s.caption)}>
        <span>{label}</span>
        <span {...stylex.props(s.metadata)}>
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
      ) : <p role="status" {...stylex.props(s.metadata)}>{labels.viewer.loading}</p>}
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
        <div role="group" aria-label={labels.previewToggle} {...stylex.props(s.modes)}>
          {modes.map(mode => (
            <button
              key={mode.id}
              type="button"
              disabled={mode.disabled}
              aria-pressed={current === mode.id}
              aria-description={mode.disabled ? labels.outputUnavailable : undefined}
              {...stylex.props(s.mode, current === mode.id && s.current)}
              onClick={() => setSelection(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      }
    >
      {current === 'composition' && composition ? (
        <div {...stylex.props(s.draft)}>
          <p {...stylex.props(s.metadata)}>{composition.note}</p>
          {composition.content}
        </div>
      ) : (
        <div data-image-comparison={current} {...stylex.props(s.view, current === 'compare' && s.compare)}>
          {current !== 'output' && panel(source, labels.original)}
          {(current === 'output' || current === 'compare') && output && panel(output, labels.output)}
        </div>
      )}
    </FilePreviewDialog>
  );
}
const s = stylex.create({
  modes: { display: 'flex', gap: t.space4, padding: t.space4, backgroundColor: t.inputSurface, borderRadius: t.radiusMd },
  mode: {
    minHeight: 44, minWidth: 44, paddingInline: t.space12, borderWidth: 0, borderRadius: t.radiusSm,
    color: { default: t.textSecondary, ':hover': t.textPrimary, ':disabled': t.textSecondary },
    backgroundColor: { default: 'transparent', ':hover': t.surfaceHover, ':disabled': 'transparent' },
    fontSize: 13, fontWeight: 500, opacity: {default: 1, ':disabled': 0.5},
    transitionProperty: 'background-color, color', transitionDuration: {default: t.durationFast, '@media (prefers-reduced-motion: reduce)': '0ms'},
  },
  current: { backgroundColor: t.actionTint, color: t.supportLavender },
  view: { height: '100%', minHeight: 0, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', gap: t.space12 },
  compare: {
    gridTemplateColumns: {default: 'repeat(2, minmax(0, 1fr))', '@media (max-width: 600px)': 'minmax(0, 1fr)'},
    gridTemplateRows: {default: 'minmax(0, 1fr)', '@media (max-width: 600px)': 'repeat(2, minmax(280px, 1fr))'},
    overflowY: 'auto',
  },
  panel: { display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: t.space8, minWidth: 0, minHeight: 0 },
  caption: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: t.space8, fontSize: 13, fontWeight: 600 },
  metadata: { fontSize: 12, lineHeight: 1.6, color: t.textSecondary, margin: 0, fontWeight: 400, overflowWrap: 'anywhere' },
  draft: { height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: t.space8 },
});
