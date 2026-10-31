import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { motion } from '../../styles/motion';
import { constrainFraming, templateLayout, templates, visibleColors, zoomFraming, type Anchor, type Framing, type ShareOptions, type Template } from './render';
import { styles as s } from './styles';
import type { Labels } from './messages';

export function ComposerControls({options, image, url, colors, change, onFrame, t}: {
  options: ShareOptions; image: HTMLCanvasElement; url: string; colors: readonly string[];
  change: (options: ShareOptions) => void; onFrame: (frame: Framing) => void; t: Labels;
}) {
  const [element, setElement] = useState<'title' | 'brand' | 'date'>('title');
  const layout = templateLayout(options.template, visibleColors(colors, options).length, options.swatches);
  const frame = constrainFraming(image, layout.image, options.frames[options.template]);
  const choice = <K extends keyof ShareOptions['swatches']>(key: K, label: string, values: readonly ShareOptions['swatches'][K][], labels: readonly string[]) => <SelectField appearance="quiet" label={label} value={options.swatches[key]} options={values.map((value, index) => ({value, label: labels[index]}))} onValueChange={value => change({...options, swatches: {...options.swatches, [key]: value}})}/>;
  const positionEnabled = element === 'title' ? !!options.title.trim() : element === 'brand' ? options.signature : options.showDate;
  const names = [t.topLeft, t.topCenter, t.topRight, t.middleLeft, t.middleCenter, t.middleRight, t.bottomLeft, t.bottomCenter, t.bottomRight];
  return <aside aria-label={t.composerSettings} {...stylex.props(s.composerControls)}>
    <fieldset {...stylex.props(s.composerGroup, s.counts)}>
      <legend {...stylex.props(s.legend)}>{t.template}</legend>
      <div {...stylex.props(s.templateChoices)}>{(Object.keys(templates) as Template[]).map(template => <label key={template} {...stylex.props(s.templateChoice, motion.selection, options.template === template && s.selected)}>
        <input type="radio" name="share-template" value={template} checked={options.template === template} onChange={() => change({...options, template})} {...stylex.props(s.radio)}/>
        <span aria-hidden="true" {...stylex.props(s.templateMini)} style={{aspectRatio: templates[template].join(' / ')}}>
          <img src={url} alt="" draggable={false} {...stylex.props(s.templateArt)} style={{height: `${template === 'gallery' ? 59 : template === 'story' ? 64 : 61}%`}}/>
          <span {...stylex.props(s.templateBars)}>{visibleColors(colors, options).map((hex, i) => <span key={i} {...stylex.props(s.templateBar)} style={{backgroundColor: hex}}/>)}</span>
        </span>
        <span>{t[template]}</span>
      </label>)}</div>
    </fieldset>
    <details open {...stylex.props(s.composerGroup)}>
      <summary {...stylex.props(s.composerSummary)}>{t.composition}</summary>
      <div {...stylex.props(s.composerFields)}>
        <SliderField label={t.imageZoom} value={Math.round(frame.zoom * 100)} min={100} max={400} step={5} unit="%" accent="lavender" onValueChange={value => onFrame(zoomFraming(image, layout.image, frame, value / 100))}/>
        <Button variant="ghost" xstyle={s.secondary} onClick={() => onFrame({zoom: 1, x: 0, y: 0})}><ArrowCounterClockwiseIcon size={18}/>{t.resetComposition}</Button>
      </div>
    </details>
    <details {...stylex.props(s.composerGroup)}>
      <summary {...stylex.props(s.composerSummary)}>{t.swatchStyle}</summary>
      <div {...stylex.props(s.composerFields, s.controlColumns)}>
        {choice('shape', t.shape, ['square', 'rounded', 'circle'], [t.square, t.rounded, t.circle])}
        {choice('labels', t.colorLabels, ['inside', 'outside', 'hidden'], [t.inside, t.outside, t.hidden])}
        {choice('arrangement', t.arrangement, ['equal', 'spaced', 'cards', 'band'], [t.equal, t.spaced, t.cards, t.band])}
        {choice('spacing', t.spacing, ['compact', 'standard', 'relaxed'], [t.compact, t.standard, t.relaxed])}
        {choice('limit', t.displayCount, ['all', '5', '6'], [t.showAll, t.first5, t.first6])}
      </div>
    </details>
    <details {...stylex.props(s.composerGroup)}>
      <summary {...stylex.props(s.composerSummary)}>{t.information}</summary>
      <div {...stylex.props(s.composerFields)}>
        <TextField label={t.title} value={options.title} maxLength={120} onChange={title => change({...options, title})}/>
        <CheckboxField label={t.signature} checked={options.signature} onCheckedChange={signature => change({...options, signature})}/>
        <CheckboxField label={`${t.showDate} · ${options.date}`} checked={options.showDate} onCheckedChange={showDate => change({...options, showDate})}/>
        <SelectField appearance="quiet" label={t.positionElement} value={element} options={[{value: 'title', label: t.title}, {value: 'brand', label: t.brand}, {value: 'date', label: t.date}]} onValueChange={value => setElement(value as typeof element)}/>
        <fieldset disabled={!positionEnabled} {...stylex.props(s.counts)}>
          <legend {...stylex.props(s.legend)}>{t.position}</legend>
          <div {...stylex.props(s.anchorGrid)}>{names.map((name, index) => <label key={name} {...stylex.props(s.anchor, motion.selection, options.positions[element] === index && s.selected, !positionEnabled && s.disabled)}>
            <input type="radio" name="share-position" aria-label={name} checked={options.positions[element] === index} onChange={() => change({...options, positions: {...options.positions, [element]: index as Anchor}})} {...stylex.props(s.radio)}/>
            <span aria-hidden="true" {...stylex.props(s.anchorDot)} style={{justifySelf: index % 3 === 0 ? 'start' : index % 3 === 1 ? 'center' : 'end', alignSelf: index < 3 ? 'start' : index < 6 ? 'center' : 'end'}}/>
          </label>)}</div>
        </fieldset>
        <p {...stylex.props(s.muted)}>{positionEnabled ? t.positionHint : t.enableElement}</p>
      </div>
    </details>
    <details {...stylex.props(s.composerGroup)}>
      <summary {...stylex.props(s.composerSummary)}>{t.decoration}</summary>
      <div {...stylex.props(s.composerFields)}><SelectField appearance="quiet" label={t.frameStyle} value={options.decoration} onValueChange={decoration => change({...options, decoration: decoration as ShareOptions['decoration']})} options={[
        {value: 'none', label: t.none}, {value: 'corners', label: t.corners}, {value: 'editorial', label: t.editorialFrame}, {value: 'soft', label: t.softPostcard},
      ]}/></div>
    </details>
  </aside>;
}
