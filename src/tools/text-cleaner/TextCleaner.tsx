import { useState } from 'react';
import type { ToolProps } from '../types';
import TextWorkspace from '../general/TextWorkspace';
import { CheckboxField } from '../../ui/CheckboxField';
import { errorText, tr } from '../general/ui';
import s from '../general/ui.module.scss';
import { cleanText, textStats, defaults, type CleanOptions } from './core';
export default function TextCleaner({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [options, setOptions] = useState(defaults);
  let output = '',
    error;
  try {
    output = cleanText(input, options);
  } catch (e) {
    error = errorText(e, locale);
  }
  const stats = (v: string) => {
    const n = textStats(v, locale);
    return tr(
      locale,
      `${n.characters} 字符 · ${n.words} 词段 · ${n.han} 汉字 · ${n.lines} 行`,
      `${n.characters} characters · ${n.words} words · ${n.han} Han characters · ${n.lines} lines`,
    );
  };
  const labels: Record<keyof CleanOptions, [string, string]> = {
    trim: ['清理行首尾空白', 'Trim line whitespace'],
    removeBlank: ['删除空行', 'Remove blank lines'],
    mergeBlank: ['合并连续空行', 'Collapse blank lines'],
    normalize: ['统一换行符（LF）', 'Normalize line endings (LF)'],
  };
  return (
    <TextWorkspace
      locale={locale}
      input={input}
      onInput={setInput}
      output={output}
      error={error}
    >
      <div className={s.row}>
        {(Object.keys(labels) as (keyof CleanOptions)[]).map((k) => (
          <CheckboxField
            key={k}
            label={tr(locale, ...labels[k])}
            checked={options[k]}
            onCheckedChange={(v) => setOptions({ ...options, [k]: v })}
          />
        ))}
      </div>
      <p className={s.note}>
        {tr(locale, '处理前', 'Before')}: {stats(input)}
        <br />
        {tr(locale, '处理后', 'After')}: {stats(output)}
      </p>
    </TextWorkspace>
  );
}
