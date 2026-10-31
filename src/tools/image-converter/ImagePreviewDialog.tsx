import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import type { ImageSource, ImageResult } from '../image/types';
import type { converterMessages } from './messages';

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
  return (
    <ImageComparisonDialog
      open={open}
      onOpenChange={onOpenChange}
      name={source.file.name}
      finalFocus={finalFocus}
      labels={t}
      source={{
        url: sourceUrl, width: source.width, height: source.height, format: source.info.format,
        onError: () => onError(source.blob), onLoad: () => onLoad(source.blob),
      }}
      output={output ? {
        url: outputUrl, width: output.width, height: output.height, format: output.mime.replace('image/', ''),
        onError: () => onError(output.blob), onLoad: () => onLoad(output.blob),
      } : undefined}
    />
  );
}
