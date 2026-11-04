import { useId } from 'react';
import type { Capabilities } from '../image/browser-codec';
import type { NativeImageFormat } from '../image/types';
import c from '../image-converter/converter.styles.module.scss';
import s from './resize.styles.module.scss';
import type { resizeMessages } from './messages';

export type ResizeMessages = (typeof resizeMessages)['zh'];

export function ParameterChoices<Value extends string>({
  label, value, options, disabled, onValueChange,
}: {
  label: string;
  value: Value;
  options: readonly {value: Value; label: string}[];
  disabled?: boolean;
  onValueChange: (value: Value) => void;
}) {
  const name = useId();
  return (
    <fieldset className={c.group}>
      <legend className={c.legend}>{label}</legend>
      <div className={s.parameterChoices}>
        {options.map(option => (
          <label key={option.value} className={[
            s.parameterChoice, c.parameterControl,
            value === option.value && s.parameterChosen,
            disabled && c.disabled,
          ].filter(Boolean).join(' ')}>
            <input
              type="radio" name={name} value={option.value}
              checked={value === option.value} disabled={disabled}
              onChange={() => onValueChange(option.value)}
              className={c.radio}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ParameterModes({
  advanced,
  onChange,
  t,
}: {
  advanced: boolean;
  onChange: (advanced: boolean) => void;
  t: ResizeMessages;
}) {
  return (
    <div role="group" aria-label={t.parameterModes} className={c.modes}>
      {([false, true] as const).map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={advanced === value}
          className={[
            c.mode,
            c.parameterControl,
            advanced === value && c.currentParameterMode,
          ].filter(Boolean).join(' ')}
          onClick={() => onChange(value)}
        >
          {value ? t.advanced : t.quick}
        </button>
      ))}
    </div>
  );
}

export function FormatChoices({
  value,
  onChange,
  capabilities,
  disabled,
  t,
}: {
  value: NativeImageFormat;
  onChange: (format: NativeImageFormat) => void;
  capabilities?: Capabilities;
  disabled?: boolean;
  t: ResizeMessages;
}) {
  const name = useId();
  return (
    <fieldset className={c.group}>
      <legend className={c.legend}>{t.format}</legend>
      <div className={[c.choices, s.formats].filter(Boolean).join(' ')}>
        {(['png', 'jpeg', 'webp'] as const).map((format) => {
          const unavailable = disabled || !capabilities?.[format]?.supported;
          return (
            <label
              key={format}
              className={[
                c.choice,
                value === format && !unavailable && c.chosen,
                unavailable && c.disabled,
              ].filter(Boolean).join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={format}
                checked={value === format}
                disabled={unavailable}
                aria-description={
                  capabilities && !capabilities[format]?.supported
                    ? t.unsupported
                    : undefined
                }
                onChange={() => onChange(format)}
                className={c.radio}
              />
              <span className={c.choiceLabel}>
                {format === 'jpeg' ? 'JPEG' : format.toUpperCase()}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
