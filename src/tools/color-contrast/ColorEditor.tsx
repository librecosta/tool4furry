import { useId } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CopySimpleIcon, EyedropperIcon } from '@phosphor-icons/react';
import { HexColorPicker } from 'react-colorful';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { Tooltip } from '../../ui/Tooltip';
import { errorText, tr } from '../general/ui';
import { colorValues, parseColor, type RGB } from './core';
import '../palette-extractor/color-picker.css';
import s from './color-contrast.module.scss';

type ParsedColor = { color?: ReturnType<typeof colorValues> & { channels: RGB }; error?: string };
const formats = ['hex', 'rgb', 'hsl'] as const;

export function readColor(value: string, locale: Locale): ParsedColor {
  try {
    const channels = parseColor(value);
    return { color: { ...colorValues(channels), channels } };
  } catch (error) {
    return { error: errorText(error, locale) };
  }
}

export function ColorEditor({ side, locale, value, parsed: { color, error }, onChange, onPick, picking }: {
  side: 'foreground' | 'background';
  locale: Locale;
  value: string;
  parsed: ParsedColor;
  onChange: (value: string) => void;
  onPick?: () => void;
  picking: boolean;
}) {
  const id = useId();
  const { notify } = useToast();
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const label = side === 'foreground' ? t('前景色', 'Foreground') : t('背景色', 'Background');
  const pickerLabel = t(`选择${label}`, `Choose ${label.toLowerCase()} color`);
  const dropperLabel = t(`从屏幕拾取${label}`, `Pick ${label.toLowerCase()} from screen`);

  async function copy(format: typeof formats[number]) {
    if (!color) return;
    try {
      await navigator.clipboard.writeText(color[format]);
      notify({ type: 'success', title: t(`已复制 ${format.toUpperCase()}`, `${format.toUpperCase()} copied`) });
    } catch {
      notify({ type: 'error', title: t('无法写入剪贴板', 'Could not copy to clipboard') });
    }
  }

  return <div role="group" aria-labelledby={`${id}-label`} className={s.editor} data-side={side}>
    <label className={s.editorLabel} htmlFor={id} id={`${id}-label`}>{label}</label>
    <div className={s.field} data-invalid={error ? '' : undefined}>
      <Popover.Root>
        <Tooltip content={pickerLabel}>
          <Popover.Trigger render={<IconButton label={pickerLabel} variant="ghost" className={s.swatchButton}>
            <span className={s.swatch} style={{ backgroundColor: color?.hex }} aria-hidden />
          </IconButton>} />
        </Tooltip>
        <Popover.Portal>
          <Popover.Positioner align="start" sideOffset={8} collisionPadding={12} className={s.positioner}>
            <Popover.Popup aria-label={pickerLabel} className={s.picker}>
              <div data-palette-color-picker>
                <HexColorPicker lang="en" color={color?.hex ?? '#808080'} onChange={hex => onChange(hex.toUpperCase())} />
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <input id={id} type="text" value={value} onChange={event => onChange(event.currentTarget.value)}
        placeholder="#RGB / #RRGGBB" spellCheck={false} autoComplete="off" autoCapitalize="off"
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
      {onPick && <Tooltip content={dropperLabel}>
        <IconButton label={dropperLabel} variant="ghost" className={s.actionIcon} loading={picking} onClick={onPick}>
          <EyedropperIcon size={20} aria-hidden />
        </IconButton>
      </Tooltip>}
    </div>
    {error && <p className={s.inputError} id={`${id}-error`}>{error}</p>}
    <dl className={s.formats}>
      {formats.map(format => {
        const name = format.toUpperCase();
        const copyLabel = t(`复制${label} ${name}`, `Copy ${label.toLowerCase()} ${name}`);
        return <div key={format} className={s.format}>
          <dt>{name}</dt>
          <dd><code>{color?.[format] ?? '—'}</code></dd>
          <dd><Tooltip content={copyLabel}>
            <IconButton label={copyLabel} variant="ghost" className={s.actionIcon} disabled={!color} onClick={() => void copy(format)}>
              <CopySimpleIcon size={16} aria-hidden />
            </IconButton>
          </Tooltip></dd>
        </div>;
      })}
    </dl>
  </div>;
}
