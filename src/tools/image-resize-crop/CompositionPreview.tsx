import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ResizeView } from './session';
import type { ResizeMessages } from './ParameterControls';
import { resizeStyles as s } from './resize.styles';

export function compositionBitmapSize(output: ResizeView['output']) {
  const scale = Math.min(1200 / output.width, 800 / output.height, 1);
  return {
    width: Math.max(1, Math.round(output.width * scale)),
    height: Math.max(1, Math.round(output.height * scale)),
  };
}

/** Bounded display drawing from the existing oriented preview. Never encodes. */
export function CompositionPreview({ view, url, t }: {
  view: ResizeView;
  url: string;
  t: ResizeMessages;
}) {
  const image = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const { source, crop, output } = view;
  useEffect(() => setFailed(false), [url]);
  useEffect(() => {
    const img = image.current,
      canvas = preview.current;
    if (
      !img || !canvas || !img.complete || !img.naturalWidth ||
      !crop || !source || failed
    ) return;
    const size = compositionBitmapSize(output);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      canvas.width = 0;
      canvas.height = 0;
      setFailed(true);
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (output.format === 'jpeg') {
      context.fillStyle = output.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(
      img,
      (crop.x * img.naturalWidth) / source.width,
      (crop.y * img.naturalHeight) / source.height,
      (crop.width * img.naturalWidth) / source.width,
      (crop.height * img.naturalHeight) / source.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return () => {
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [crop, source, output, loaded, url, failed]);
  return (
    <div data-composition-preview {...stylex.props(s.compositionStage)}>
      <img
        key={url}
        hidden
        ref={image}
        src={url}
        alt=""
        onLoad={() => setLoaded(n => n + 1)}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <p role="alert" {...stylex.props(s.error)}>{t.preview.viewer.error}</p>
      ) : (
        <canvas ref={preview} role="img" aria-label={t.composition} {...stylex.props(s.composition)} />
      )}
    </div>
  );
}
