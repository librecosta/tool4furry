import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { Button } from '../../ui/Button';
import { Frame, s, tr, ErrorText, errorText, Copy } from '../general/ui';
import { fromTimestamp, fromIso, timestampValues } from './core';
export default function TimestampConverter({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [mode, setMode] = useState('seconds');
  let result, error;
  try {
    if (input)
      result = timestampValues(
        mode === 'iso'
          ? fromIso(input)
          : fromTimestamp(input, mode as 'seconds' | 'milliseconds'),
        locale,
      );
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <Frame locale={locale}>
      <SelectField
        label={tr(locale, '输入类型', 'Input type')}
        value={mode}
        onValueChange={(v) => {
          setMode(v);
          setInput('');
        }}
        options={[
          { value: 'seconds', label: tr(locale, 'Unix 秒', 'Unix seconds') },
          {
            value: 'milliseconds',
            label: tr(locale, 'Unix 毫秒', 'Unix milliseconds'),
          },
          {
            value: 'iso',
            label: tr(
              locale,
              'ISO 8601（必须包含时区）',
              'ISO 8601 (timezone required)',
            ),
          },
        ]}
      />
      <TextField
        label={tr(locale, '时间值', 'Time value')}
        value={input}
        onChange={setInput}
        placeholder={mode === 'iso' ? '2026-11-03T12:00:00+08:00' : '0'}
      />
      <ErrorText error={error} />
      {result && (
        <div {...stylex.props(s.stack)}>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} {...stylex.props(s.row)}>
              <span {...stylex.props(s.grow)}>
                {
                  (
                    {
                      seconds: tr(locale, 'Unix 秒', 'Unix seconds'),
                      milliseconds: tr(
                        locale,
                        'Unix 毫秒',
                        'Unix milliseconds',
                      ),
                      iso: 'ISO 8601',
                      utc: 'UTC',
                      local: tr(locale, '本地时间', 'Local time'),
                    } as Record<string, string>
                  )[k]
                }
                : {String(v)}
              </span>
              <Copy locale={locale} value={String(v)} />
            </div>
          ))}
        </div>
      )}
      <Button onClick={() => setInput('')}>
        {tr(locale, '清空', 'Clear')}
      </Button>
    </Frame>
  );
}
