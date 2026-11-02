import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { converterStyles as c } from '../image-converter/converter.styles';
import { isLossy, recommendedQuality, validPagePrefix, type ComicImageFormat, type ExportSettings as Settings } from './export-settings';
import type { comicMessages } from './messages';
import { comicStyles as s } from './styles';

export function ComicExportSettings({settings, configure, pdf, avifIssue, cbz, t}: {
  settings: Settings; configure: (patch: Partial<Settings>) => void; pdf: boolean; cbz: boolean;
  avifIssue?: 'avifDevice' | 'avifBudget'; t: typeof comicMessages.en;
}) {
  const [advanced, setAdvanced] = useState(false);
  if (pdf) return null;
  const lossy = isLossy(settings.format) ? settings.format : undefined;
  const quality = lossy ? settings.qualities[lossy] : undefined;
  const setQuality = (value: number) => {if (lossy) configure({qualities: {...settings.qualities, [lossy]: value}});};
  return <section aria-label={t.exportSettings} data-comic-parameters={advanced ? 'advanced' : 'quick'} {...stylex.props(s.stack)}>
    <div role="group" aria-label={t.parameterModes} {...stylex.props(c.modes, s.parameterModes)}>
      {([false,true] as const).map(value => <button type="button" key={String(value)} aria-pressed={advanced === value}
        {...stylex.props(c.mode, c.parameterControl, advanced === value && c.currentParameterMode)} onClick={() => setAdvanced(value)}>{value ? t.advanced : t.quick}</button>)}
    </div>
    <div {...stylex.props(s.exportFields)}>
      <TextField label={t.prefix} value={settings.prefix} onChange={prefix => configure({prefix})} error={validPagePrefix(settings.prefix) ? undefined : t.prefixError} spellCheck={false}/>
      <SelectField appearance="quiet" label={t.imageFormat} value={settings.format} onValueChange={format => configure({format: format as ComicImageFormat})}
        options={(['original','jpeg','png','webp','avif'] as const).map(value => ({value, label: value === 'original' ? t.keepOriginal : value.toUpperCase(), disabled: value === 'avif' && !!avifIssue}))}/>
    </div>
    {lossy && (!advanced ? <fieldset {...stylex.props(c.group)}><legend {...stylex.props(c.legend)}>{t.strength} · {quality}%</legend>
      <div {...stylex.props(s.row)}>{(['light','balanced','strong'] as const).map(value => <button type="button" key={value} aria-pressed={quality === recommendedQuality(lossy, value)}
        {...stylex.props(c.mode, c.parameterControl, quality === recommendedQuality(lossy, value) && c.currentParameterMode)} onClick={() => setQuality(recommendedQuality(lossy, value))}>{t[value]}</button>)}</div>
    </fieldset> : <>
      <SliderField label={t.quality} value={quality!} onValueChange={setQuality} min={1} max={100} unit="%" accent="lavender"/>
      <div {...stylex.props(s.row)}><Button xstyle={s.action} onClick={() => setQuality(recommendedQuality(lossy))}>{t.recommend}</Button></div>
    </>)}
    {advanced && settings.format === 'jpeg' && <TextField label={t.background} value={settings.jpegBackground} onChange={jpegBackground => configure({jpegBackground})}
      error={/^#[0-9a-f]{6}$/i.test(settings.jpegBackground) ? undefined : t.backgroundError} maxLength={7} spellCheck={false}/>}
    {!advanced && settings.format === 'jpeg' && !/^#[0-9a-f]{6}$/i.test(settings.jpegBackground) && <p role="alert" {...stylex.props(s.note, s.error)}>{t.backgroundError}</p>}
    {settings.format === 'avif' && avifIssue && <p role="alert" {...stylex.props(s.note, s.error)}>{t[avifIssue]}</p>}
    {cbz && ['webp','avif'].includes(settings.format) && <p {...stylex.props(s.note)}>{t.readerFormats}</p>}
  </section>;
}
