import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Capabilities } from '../image/browser-codec';
import type { NativeImageFormat } from '../image/types';
import { converterStyles as c } from '../image-converter/converter.styles';
import { resizeStyles as s } from './resize.styles';
import type { resizeMessages } from './messages';

export type ResizeMessages = (typeof resizeMessages)['zh'];
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
    <div role="group" aria-label={t.parameterModes} {...stylex.props(c.modes)}>
      {([false, true] as const).map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={advanced === value}
          {...stylex.props(
            c.mode,
            c.parameterControl,
            advanced === value && c.currentMode,
          )}
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
    <fieldset {...stylex.props(c.group)}>
      <legend {...stylex.props(c.legend)}>{t.format}</legend>
      <div {...stylex.props(c.choices, s.formats)}>
        {(['png', 'jpeg', 'webp'] as const).map((format) => {
          const unavailable = disabled || !capabilities?.[format]?.supported;
          return (
            <label
              key={format}
              {...stylex.props(
                c.choice,
                value === format && !unavailable && c.chosen,
                unavailable && c.disabled,
              )}
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
                {...stylex.props(c.radio)}
              />
              <span {...stylex.props(c.choiceLabel)}>
                {format === 'jpeg' ? 'JPEG' : format.toUpperCase()}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
