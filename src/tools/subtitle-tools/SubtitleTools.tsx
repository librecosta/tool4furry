import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import TextWorkspace from '../general/TextWorkspace';
import { tr, s, errorText } from '../general/ui';
import { convertSubtitles, formatTime } from './core';
export default function SubtitleTools({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [format, setFormat] = useState<'srt' | 'vtt'>('vtt'),
    [offset, setOffset] = useState('0');
  let result, error;
  try {
    if (input.trim()) result = convertSubtitles(input, format, offset);
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <TextWorkspace
      maxLength={1000000}
      locale={locale}
      input={input}
      onInput={setInput}
      output={result?.text ?? ''}
      error={error}
      filename={`subtitles.${format}`}
    >
      <div {...stylex.props(s.columns)}>
        <SelectField
          label={tr(locale, '输出格式', 'Output format')}
          value={format}
          onValueChange={(v) => setFormat(v as 'srt' | 'vtt')}
          options={[
            { value: 'srt', label: 'SRT' },
            { value: 'vtt', label: 'WebVTT' },
          ]}
        />
        <TextField
          label={tr(locale, '整体偏移（毫秒）', 'Time offset (milliseconds)')}
          value={offset}
          onChange={setOffset}
        />
      </div>
      {result?.layoutDropped && (
        <p role="status">
          {tr(
            locale,
            'SRT 不支持 VTT 定位设置，字幕文字将保留。',
            'SRT does not support VTT positioning settings. Cue text is preserved.',
          )}
        </p>
      )}
      {result && (
        <details>
          <summary>
            {tr(
              locale,
              `${result.cues.length} 条字幕`,
              `${result.cues.length} cues`,
            )}
          </summary>
          <div {...stylex.props(s.scroll)}>
            <table {...stylex.props(s.table)}>
              <tbody>
                {result.cues.map((c, i) => (
                  <tr key={i}>
                    <td {...stylex.props(s.cell)}>{i + 1}</td>
                    <td {...stylex.props(s.cell)}>
                      {formatTime(c.start, true)} → {formatTime(c.end, true)}
                    </td>
                    <td {...stylex.props(s.cell)}>
                      <pre {...stylex.props(s.pre)}>{c.text}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </TextWorkspace>
  );
}
