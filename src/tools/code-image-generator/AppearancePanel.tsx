import { useId, useRef, type ReactNode } from 'react';
import { Switch } from '@base-ui/react/switch';
import { CaretDownIcon, ImageSquareIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { TextField } from '../../ui/TextField';
import { families } from './fonts';
import { palettes, presets, themes, type Background, type CodeImageSettings, type Preset } from './settings';
import s from './studio.module.scss';

export type Translate = (zh: string, en: string) => string;
type Props = {
  t: Translate;
  settings: CodeImageSettings;
  selected?: Preset;
  thumbnails: Record<Preset, string>;
  imageName?: string;
  change: (settings: Partial<CodeImageSettings>) => void;
  selectPreset: (preset: Preset) => void;
  importImage: (file: File) => void;
};

export function StudioToggle({ label, checked, change }: { label: string; checked: boolean; change: (enabled: boolean) => void }) {
  const id = useId();
  return <div className={s.toggleRow}>
    <label htmlFor={id}>{label}</label>
    <Switch.Root id={id} className={s.switch} checked={checked} onCheckedChange={change}>
      <Switch.Thumb className={s.thumb} />
    </Switch.Root>
  </div>;
}

function StudioNumber({ label, value, min, max, step = 1, change }: {
  label: string; value: number; min: number; max: number; step?: number; change: (number: number) => void;
}) {
  return <label className={s.number}>
    <span>{label}</span>
    <input key={value} type="number" min={min} max={max} step={step} defaultValue={value}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      onBlur={event => {
        const input = event.currentTarget;
        const parsed = input.valueAsNumber;
        if (!Number.isFinite(parsed)) { input.value = String(value); return; }
        const adjusted = Math.max(min, Math.min(max, parsed));
        const next = step < 1 ? +adjusted.toFixed(2) : Math.round(adjusted);
        input.value = String(next);
        if (next !== value) change(next);
      }} />
  </label>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={s.section}><h3>{title}</h3>{children}</section>;
}

const options = (entries: [string, string][]) => entries.map(([value, label]) => ({ value, label }));
const swatch = (background: Background) =>
  background.kind === 'radial' ? `radial-gradient(circle, ${background.first}, ${background.second})` :
  `linear-gradient(${background.angle}deg, ${background.first}, ${background.second})`;

export function AppearancePanel({ t, settings, selected, thumbnails, imageName, change, selectPreset, importImage }: Props) {
  const imageInput = useRef<HTMLInputElement>(null);
  const back = settings.background;
  const background = (patch: Partial<Background>) => change({ background: { ...back, ...patch } });
  const colors = back.kind === 'linear' || back.kind === 'radial';
  const number = (key: 'fontSize' | 'radius' | 'padding' | 'lineHeight' | 'tabWidth' | 'firstLine' | 'width' | 'height',
    label: string, min: number, max: number, step?: number) =>
    <StudioNumber label={label} value={settings[key]} min={min} max={max} step={step} change={value => change({ [key]: value })} />;

  return <aside className={s.appearance} aria-label={t('外观设置', 'Appearance')}>
    <Section title={t('艺术预设', 'Art presets')}>
      <div className={s.presetGrid}>
        {(Object.keys(presets) as Preset[]).map(id =>
          <button type="button" key={id} className={s.preset} aria-pressed={selected === id} aria-label={id} title={id} onClick={() => selectPreset(id)}>
            <span className={s.presetArt} style={{ background: swatch(presets[id].background) }}>
              <img src={thumbnails[id]} alt="" />
            </span>
            <span className={s.presetName}>{id}</span>
          </button>)}
      </div>
    </Section>
    <Section title={t('背景', 'Background')}>
      <SelectField appearance="quiet" label={t('背景类型', 'Background type')} value={back.kind}
        options={options([['solid', t('纯色', 'Solid')], ['linear', t('线性渐变', 'Linear gradient')], ['radial', t('径向渐变', 'Radial gradient')], ['transparent', t('透明', 'Transparent')], ['image', t('本地图片', 'Local image')]])}
        onValueChange={kind => background({ kind: kind as Background['kind'] })} />
      {(colors || back.kind === 'solid') && <div className={s.colorRow}>
        <label title={t('起始颜色', 'Start color')}>
          <input aria-label={t('起始颜色', 'Start color')} type="color" value={back.first} onChange={e => background({ first: e.target.value })} />
        </label>
        {colors && <label title={t('结束颜色', 'End color')}>
          <input aria-label={t('结束颜色', 'End color')} type="color" value={back.second} onChange={e => background({ second: e.target.value })} />
        </label>}
        <span className={s.swatchDivider} />
        {palettes.map(palette => <button key={palette.name} type="button" className={s.swatch}
          aria-label={t(palette.zh, palette.name)} title={t(palette.zh, palette.name)} style={{ background: swatch(palette.colors) }}
          onClick={() => change({ background: back.kind === 'solid' ? { ...back, first: palette.colors.first } :
            { ...palette.colors, kind: back.kind } })} />)}
      </div>}
      {back.kind === 'linear' && <SliderField label={t('渐变方向', 'Gradient angle')} value={back.angle} min={0} max={360} unit="°"
        onValueChange={angle => background({ angle })} />}
      {back.kind === 'image' && <>
        <input type="file" ref={imageInput} accept="image/png,image/jpeg,image/webp,image/avif" hidden
          aria-label={t('背景图片文件', 'Background image file')} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) importImage(file);
          }} />
        <Button size="sm" variant="ghost" className={s.fieldButton} onClick={() => imageInput.current?.click()}>
          <ImageSquareIcon size={16} /> {t('选择背景图片', 'Choose background image')}
        </Button>
        {imageName && <span className={s.imageName} title={imageName}>{imageName}</span>}
      </>}
      <SliderField label={t('画布外边距', 'Outer padding')} value={settings.margin} min={0} max={160} unit=" px"
        onValueChange={margin => change({ margin })} />
    </Section>
    <Section title={t('代码窗口', 'Code window')}>
      <TextField className={s.textField} label={t('展示标题', 'Display title')} maxLength={120}
        value={settings.title} onChange={title => change({ title })} />
      <div className={s.pair}>
        <SelectField appearance="quiet" label={t('语法主题', 'Syntax theme')} value={settings.theme}
          options={options(Object.entries(themes))} onValueChange={theme => change({ theme: theme as CodeImageSettings['theme'] })} />
        <SelectField appearance="quiet" label={t('窗口样式', 'Window style')} value={settings.style}
          options={options([['macos', 'macOS'], ['windows', 'Windows'], ['minimal', 'Minimal']])}
          onValueChange={style => change({ style: style as CodeImageSettings['style'] })} />
      </div>
      <div className={s.fontRow}>
        <SelectField appearance="quiet" label={t('字体', 'Font')} value={settings.font}
          options={options(Object.entries(families))} onValueChange={font => change({ font: font as CodeImageSettings['font'] })} />
        {number('fontSize', t('字号', 'Size'), 8, 72)}
      </div>
      <div className={s.toggles}>
        <StudioToggle label={t('标题栏', 'Title bar')} checked={settings.titleBar} change={titleBar => change({ titleBar })} />
        <StudioToggle label={t('显示行号', 'Line numbers')} checked={settings.lines} change={lines => change({ lines })} />
        <StudioToggle label={t('窗口阴影', 'Window shadow')} checked={settings.shadow} change={shadow => change({ shadow })} />
      </div>
    </Section>
    <details className={s.more}>
      <summary>{t('更多排版设置', 'More layout settings')} <CaretDownIcon size={14} /></summary>
      <div className={s.moreContent}>
        <div className={s.pair}>
          {number('lineHeight', t('行高倍数', 'Line height'), 1, 2.6, 0.05)}
          {number('tabWidth', t('Tab 宽度', 'Tab width'), 2, 12)}
          {number('radius', t('窗口圆角 (px)', 'Window radius (px)'), 0, 80)}
          {number('padding', t('窗口内边距 (px)', 'Inner padding (px)'), 12, 160)}
          {number('firstLine', t('起始行号', 'First line number'), 1, 999999)}
        </div>
        <StudioToggle label={t('图片自动换行', 'Wrap in artwork')} checked={settings.wrap} change={wrap => change({ wrap })} />
        <SelectField appearance="quiet" label={t('画布尺寸', 'Canvas size')} value={settings.size}
          options={options([['auto', t('适应代码', 'Fit code')], ['custom', t('自定义', 'Custom')], ['1:1', '1:1'],
            ['4:3', '4:3'], ['16:9', '16:9'], ['4:5', '4:5']])} onValueChange={size => change({ size: size as CodeImageSettings['size'] })} />
        {settings.size === 'custom' && <div className={s.pair}>
          {number('width', t('宽 (px)', 'Width (px)'), 80, 8192)}
          {number('height', t('高 (px)', 'Height (px)'), 80, 8192)}
        </div>}
        <div className={s.marks}>
          <h4>{t('代码行标记', 'Line marks')}</h4>
          <p>{t('按源码行号标记，例如 2, 5–8。', 'Use source line numbers, for example 2, 5–8.')}</p>
          {([['emphasized', t('重点行', 'Emphasis')], ['added', t('新增行', 'Added lines')], ['removed', t('删除行', 'Removed lines')]] as const)
            .map(([key, label]) => <TextField key={key} className={s.textField} label={label} maxLength={256}
              value={settings[key]} onChange={value => change({ [key]: value })} />)}
          <StudioToggle label={t('淡化其他行', 'Dim other lines')} checked={settings.dim} change={dim => change({ dim })} />
        </div>
      </div>
    </details>
  </aside>;
}
