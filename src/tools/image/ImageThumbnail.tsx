import s from './ImageThumbnail.module.scss';
import { useState } from 'react';
import { FileImageIcon } from '@phosphor-icons/react';

/** Receives an owned source URL; no decoding pipeline, URL creation or disposal. */
export function ImageThumbnail({
  src,
  checking = false,
}: {
  src?: string;
  checking?: boolean;
}) {
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const available = !!src && !checking && failed !== src;
  return (
    <span data-image-thumbnail className={s.frame}>
      {(!available || loaded !== src) && (
        <FileImageIcon size={22} aria-hidden />
      )}
      {available && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className={[s.image, loaded !== src && s.loading].filter(Boolean).join(' ')}
        />
      )}
    </span>
  );
}
