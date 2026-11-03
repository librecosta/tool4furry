import { useState } from 'react';
import type { ToolProps } from '../types';
import TextWorkspace from '../general/TextWorkspace';
import { SelectField } from '../../ui/SelectField';
import { errorText, tr } from '../general/ui';
import { formatJson } from './core';
export default function JsonFormatter({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [indent, setIndent] = useState<0 | 2 | 4>(2);
  let output = '',
    error;
  try {
    if (input.trim()) output = formatJson(input, indent);
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <TextWorkspace
      locale={locale}
      input={input}
      onInput={setInput}
      output={output}
      error={error}
      filename="formatted.json"
    >
      <SelectField
        label={tr(locale, '缩进', 'Indentation')}
        value={String(indent)}
        onValueChange={(v) => setIndent(Number(v) as 0 | 2 | 4)}
        options={[
          { value: '2', label: tr(locale, '2 空格', '2 spaces') },
          { value: '4', label: tr(locale, '4 空格', '4 spaces') },
          { value: '0', label: tr(locale, '压缩', 'Minify') },
        ]}
      />
    </TextWorkspace>
  );
}
