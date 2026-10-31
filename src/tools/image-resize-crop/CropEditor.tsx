import { useEffect, useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import * as stylex from '@stylexjs/stylex';
import { aspects, fromPercent, toPercent } from './geometry';
import type { ResizeView } from './session';
import type { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';
import './crop.css';
import { ArrowCounterClockwiseIcon, QuestionIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';

export function CropEditor({
  view,
  url,
  t,
  onCrop,
  onReset,
}: {
  view: ResizeView;
  url: string;
  t: (typeof resizeMessages)['en' | 'zh'];
  onCrop: (crop: NonNullable<ResizeView['crop']>) => void;
  onReset: () => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { source, crop, output } = view;
  useEffect(() => {
    const img = image.current,
      canvas = preview.current;
    if (
      !img ||
      !canvas ||
      !img.complete ||
      !img.naturalWidth ||
      !crop ||
      !source
    )
      return;
    const scale = Math.min(600 / output.width, 240 / output.height, 1);
    canvas.width = Math.max(1, Math.round(output.width * scale));
    canvas.height = Math.max(1, Math.round(output.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
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
  }, [crop, source, output, loaded, url, expanded]);
  if (!source || !crop) return null;
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.cropToolbar)}>
        <span {...stylex.props(s.note)}>{t.cropHint}</span>
        <div {...stylex.props(s.actions)}>
          <Tooltip content={t.instructions}>
            <IconButton variant="ghost" label={t.keyboardHelp}>
              <QuestionIcon size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t.full}>
            <IconButton
              variant="ghost"
              label={t.full}
              onClick={onReset}
              disabled={view.status === 'loading'}
            >
              <ArrowCounterClockwiseIcon size={20} />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div {...stylex.props(s.stage)}>
        <ReactCrop
          style={{
            width: `min(100%, ${Math.max(320, source.width)}px, calc(min(60dvh, 640px) * ${source.width / source.height}))`,
          }}
          crop={toPercent(crop, source)}
          aspect={aspects[view.aspect]}
          keepSelection
          ruleOfThirds
          ariaLabels={t.handles}
          disabled={view.status === 'loading'}
          onChange={(_, percent) => {
            if (percent.width > 0 && percent.height > 0)
              onCrop(fromPercent(percent, source));
          }}
        >
          <img
            ref={image}
            src={url}
            alt={source.file.name}
            draggable={false}
            onLoad={() => setLoaded((n) => n + 1)}
            {...stylex.props(s.image)}
          />
        </ReactCrop>
      </div>
      <div {...stylex.props(s.summary)}>
        <span>
          {t.source}: {source.width} × {source.height}
        </span>
        <span>
          {t.crop}: {crop.width} × {crop.height}
        </span>
      </div>
      <details
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary {...stylex.props(s.previewToggle)}>{t.composition}</summary>
        {expanded && (
          <canvas
            ref={preview}
            role="img"
            aria-label={t.composition}
            {...stylex.props(s.composition)}
          />
        )}
      </details>
    </div>
  );
}
