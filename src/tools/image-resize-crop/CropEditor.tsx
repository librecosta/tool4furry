import ReactCrop from 'react-image-crop';
import * as stylex from '@stylexjs/stylex';
import { aspects, fromPercent, toPercent } from './geometry';
import type { ResizeView } from './session';
import type { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';
import './crop.css';
import { ArrowCounterClockwiseIcon, QuestionIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { HelpPopover, Tooltip } from '../../ui/Tooltip';
import { CompositionPreview } from './CompositionPreview';

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
  const { source, crop } = view;
  if (!source || !crop) return null;
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.cropToolbar)}>
        <span {...stylex.props(s.note)}>{t.cropHint}</span>
        <div {...stylex.props(s.actions)}>
          <HelpPopover content={t.instructions} label={t.keyboardHelp}>
            <IconButton variant="ghost" label={t.keyboardHelp}>
              <QuestionIcon size={20} />
            </IconButton>
          </HelpPopover>
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
            src={url}
            alt={source.file.name}
            draggable={false}
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
      <div {...stylex.props(s.previewHeading)}>
        <h3 {...stylex.props(s.heading)}>{t.composition}</h3>
        <span {...stylex.props(s.note)}>{t.compositionNote}</span>
      </div>
      <div {...stylex.props(s.compositionFrame)}>
        <CompositionPreview view={view} url={url} t={t} />
      </div>
    </div>
  );
}
