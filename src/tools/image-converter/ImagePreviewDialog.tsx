import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import type { ImageSource, ImageResult } from '../image/types';
import type { converterMessages } from './messages';
import { converterStyles as s } from './converter.styles';

interface PreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ImageSource;
  sourceUrl?: string;
  output?: ImageResult;
  outputUrl?: string;
  t: (typeof converterMessages)['zh'];
  onError: (blob: Blob) => void;
  onLoad: (blob: Blob) => void;
  finalFocus: () => HTMLElement | null;
}
export function ImagePreviewDialog({
  open,
  onOpenChange,
  source,
  sourceUrl,
  output,
  outputUrl,
  t,
  onError,
  onLoad,
  finalFocus,
}: PreviewProps) {
  const [selection, setSelection] = useState<'source' | 'output'>('source');
  useEffect(() => {
    setSelection('source');
  }, [open, source.blob, output?.blob]);
  const showingOutput = selection === 'output' && !!output && !!outputUrl;
  const current = showingOutput ? output! : source;
  const url = showingOutput ? outputUrl : sourceUrl;
  return (
    <FilePreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.preview}
      description={source.file.name}
      finalFocus={finalFocus}
      labels={{
        close: t.closePreview,
        maximize: t.maximizePreview,
        restore: t.restorePreview,
      }}
      toolbar={
        <div
          role="group"
          aria-label={t.previewToggle}
          {...stylex.props(s.modes, s.previewModes)}
        >
          <button
            type="button"
            aria-pressed={!showingOutput}
            {...stylex.props(s.mode, !showingOutput && s.currentMode)}
            onClick={() => setSelection('source')}
          >
            {t.original}
          </button>
          <button
            type="button"
            aria-pressed={showingOutput}
            disabled={!output || !outputUrl}
            aria-description={!output ? t.outputUnavailable : undefined}
            title={!output ? t.outputUnavailable : undefined}
            {...stylex.props(
              s.mode,
              showingOutput && s.currentMode,
              !output && s.disabled,
            )}
            onClick={() => setSelection('output')}
          >
            {t.output}
          </button>
        </div>
      }
    >
      {url ? (
        <ImagePreviewViewport
          key={`${showingOutput ? 'output' : 'source'}-${url}`}
          src={url}
          width={current.width}
          height={current.height}
          alt={showingOutput ? t.output : t.original}
          labels={t.viewer}
          onError={() => onError(current.blob)}
          onLoad={() => onLoad(current.blob)}
        />
      ) : (
        <p role="status" {...stylex.props(s.note)}>
          {t.viewer.loading}
        </p>
      )}
    </FilePreviewDialog>
  );
}
