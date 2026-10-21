import { useRef } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '../../ui/Button';
import type { ImageResources } from '../image/resources';
import type { ImageSource, ImageResult } from '../image/types';
import type { converterMessages } from './messages';
import { useOwnedUrl } from './use-owned-url';
import { converterStyles as s } from './converter.styles';

interface PreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ImageSource;
  output?: ImageResult;
  outputUrl?: string;
  resources: ImageResources;
  t: (typeof converterMessages)['cn'];
  error: boolean;
  onError: (blob: Blob) => void;
}
export function ImagePreviewDialog(props: PreviewProps) {
  const close = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender {...stylex.props(s.backdrop)} />
        <Dialog.Popup
          initialFocus={close}
          finalFocus={() => document.getElementById('converter-preview-button')}
          {...stylex.props(s.dialog)}
        >
          <div {...stylex.props(s.settingsHeader)}>
            <Dialog.Title {...stylex.props(s.settingsTitle)}>
              {props.t.preview}
            </Dialog.Title>
            <Dialog.Close
              render={
                <IconButton
                  ref={close}
                  label={props.t.closePreview}
                  variant="ghost"
                  size="sm"
                >
                  <XIcon size={20} aria-hidden="true" />
                </IconButton>
              }
            />
          </div>
          <Dialog.Description {...stylex.props(s.note)}>
            {props.source.file.name}
          </Dialog.Description>
          {props.open && <PreviewImages {...props} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PreviewImages({
  source,
  output,
  outputUrl,
  resources,
  t,
  error,
  onError,
}: PreviewProps) {
  // The download already owns the output URL. Only the source needs a temporary URL.
  const ownedSourceUrl = useOwnedUrl(
    output?.blob === source.blob ? undefined : source.blob,
    resources,
  );
  const sourceUrl = output?.blob === source.blob ? outputUrl : ownedSourceUrl;
  return (
    <>
      <div {...stylex.props(s.previews, !output && s.singlePreview)}>
        {[
          { label: t.original, url: sourceUrl, blob: source.blob },
          ...(output
            ? [{ label: t.output, url: outputUrl, blob: output.blob }]
            : []),
        ].map((image) => (
          <figure key={image.label} {...stylex.props(s.figure)}>
            <div {...stylex.props(s.imageBox)}>
              {image.url && (
                <img
                  src={image.url}
                  alt={image.label}
                  onError={() => onError(image.blob)}
                  {...stylex.props(s.image)}
                />
              )}
            </div>
            <figcaption {...stylex.props(s.caption)}>{image.label}</figcaption>
          </figure>
        ))}
      </div>
      {error && (
        <p role="alert" {...stylex.props(s.error)}>
          {t.previewError}
        </p>
      )}
    </>
  );
}
