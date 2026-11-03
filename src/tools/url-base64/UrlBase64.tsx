import { useState } from 'react';
import type { ToolProps } from '../types';
import TextWorkspace from '../general/TextWorkspace';
import { SelectField } from '../../ui/SelectField';
import { errorText, tr } from '../general/ui';
import { transformEncoding, type EncodingMode } from './core';
export default function UrlBase64({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [mode, setMode] = useState<EncodingMode>('url-encode');
  let output = '',
    error;
  try {
    output = transformEncoding(input, mode);
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
    >
      <SelectField
        label={tr(locale, '操作', 'Operation')}
        value={mode}
        onValueChange={(v) => setMode(v as EncodingMode)}
        options={[
          { value: 'url-encode', label: tr(locale, 'URL 编码', 'URL encode') },
          { value: 'url-decode', label: tr(locale, 'URL 解码', 'URL decode') },
          {
            value: 'base64-encode',
            label: tr(locale, 'Base64 编码（UTF-8）', 'Base64 encode (UTF-8)'),
          },
          {
            value: 'base64-decode',
            label: tr(locale, 'Base64 解码（UTF-8）', 'Base64 decode (UTF-8)'),
          },
        ]}
      />
    </TextWorkspace>
  );
}
