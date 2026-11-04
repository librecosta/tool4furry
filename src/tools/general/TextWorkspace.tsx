import type { ReactNode } from 'react';
import type { Locale } from '../../i18n/locale';
import { TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, tr, ErrorText, TextDelivery } from './ui';
import s from './ui.module.scss';
export default function TextWorkspace({
  locale,
  input,
  onInput,
  output,
  error,
  children,
  filename,
  maxLength = 500000,
}: {
  locale: Locale;
  input: string;
  onInput: (s: string) => void;
  output: string;
  error?: string;
  children?: ReactNode;
  filename?: string;
  maxLength?: number;
}) {
  return (
    <Frame locale={locale}>
      {children}
      <div className={s.columns}>
        <TextAreaField
          label={tr(locale, '输入', 'Input')}
          rows={14}
          maxLength={maxLength}
          value={input}
          onChange={onInput}
        />
        <TextAreaField
          label={tr(locale, '结果', 'Result')}
          rows={14}
          value={output}
          readOnly
          onChange={() => {}}
        />
      </div>
      <ErrorText error={error} />
      <div className={s.row}>
        <TextDelivery
          value={output}
          locale={locale}
          filename={filename}
          enabled={!!input && !error}
        />
        <Button onClick={() => onInput('')}>
          {tr(locale, '清空', 'Clear')}
        </Button>
      </div>
    </Frame>
  );
}
