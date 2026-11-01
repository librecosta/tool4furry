import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import { useOwnedUrl } from '../image-converter/use-owned-url';
import type { MetadataSession, MetadataTask } from './session';
import type { messages } from './messages';

/** Original only. Its temporary URL is independent of the row's thumbnail URL. */
export function SourcePreview({ task, owner, t, onClose, finalFocus }: {
  task?: MetadataTask; owner?: MetadataSession; t: (typeof messages)['zh'];
  onClose: () => void; finalFocus: () => HTMLElement | null;
}) {
  const source = task?.source;
  const url = useOwnedUrl(source?.blob, owner?.resources);
  return <FilePreviewDialog open={!!source} onOpenChange={open => { if (!open) onClose(); }}
    title={t.preview} description={task?.file.name} finalFocus={finalFocus}
    labels={{close: t.closePreview, maximize: t.maximizePreview, restore: t.restorePreview}}>
    {source && url && <ImagePreviewViewport key={url} src={url} width={source.width} height={source.height}
      alt={source.file.name} labels={t.viewer} onError={() => {}}/>}
  </FilePreviewDialog>;
}
