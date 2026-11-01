import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { motion } from '../../styles/motion';
import { constrainFraming, ratios, zoomFraming, type Framing, type ShareLayout, type ShareOptions } from './render';
import { styles as s } from './styles';
import type { Labels } from './messages';

export function ComposerControls({options, image, colorCount, layout, change, onFrame, t, children}: {
  options: ShareOptions; image: HTMLCanvasElement; colorCount: number; layout?: ShareLayout;
  change: (options: ShareOptions) => void; onFrame: (frame: Framing) => void; t: Labels; children?: ReactNode;
}) {
  const frame = layout ? constrainFraming(image, layout.image, options.frame) : options.frame;
  return <aside aria-label={t.composerSettings} {...stylex.props(s.composerControls, s.composerFields)}>
    <fieldset {...stylex.props(s.counts)}>
      <legend {...stylex.props(s.legend)}>{t.direction}</legend>
      <div {...stylex.props(s.shareDirections)}>{(['top', 'bottom', 'left', 'right'] as const).map(direction => <label key={direction} {...stylex.props(s.count, motion.selection, options.direction === direction && s.selected)}>
        <input type="radio" name="share-direction" checked={options.direction === direction} onChange={() => change({...options, direction, frame: {zoom: 1, x: 0, y: 0}})} {...stylex.props(s.radio)}/>
        <span>{t[direction]}</span>
      </label>)}</div>
    </fieldset>
    <SelectField appearance="quiet" label={t.outputRatio} value={options.ratio} options={[{value: 'original', label: t.original}, ...Object.entries(ratios).map(([value, size]) => ({value, label: `${value} · ${size.join(' × ')}`}))]} onValueChange={ratio => change({...options, ratio: ratio as ShareOptions['ratio'], frame: {zoom: 1, x: 0, y: 0}})}/>
    <SelectField appearance="quiet" label={t.displayCount} value={String(Math.min(options.count, colorCount))} options={Array.from({length: colorCount}, (_, i) => ({value: String(i + 1), label: String(i + 1)}))} onValueChange={count => change({...options, count: Number(count)})}/>
    {options.ratio !== 'original' && layout && <>
      <SliderField label={t.imageZoom} value={Math.round(frame.zoom * 100)} min={100} max={400} step={5} unit="%" accent="lavender" onValueChange={value => onFrame(zoomFraming(image, layout.image, frame, value / 100))}/>
      <Button variant="ghost" xstyle={s.secondary} onClick={() => onFrame({zoom: 1, x: 0, y: 0})}><ArrowCounterClockwiseIcon size={18}/>{t.resetComposition}</Button>
    </>}
    {children}
  </aside>;
}
