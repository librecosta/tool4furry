import { useState } from 'react';
import { FileImageIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';

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
    <span data-image-thumbnail {...stylex.props(s.frame)}>
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
          {...stylex.props(s.image, loaded !== src && s.loading)}
        />
      )}
    </span>
  );
}
const s = stylex.create({
  frame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  loading: { opacity: 0 },
});
