import { useState } from 'react';
import type { ToolProps } from '../types';
import { TextAreaField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { Button } from '../../ui/Button';
import { Frame, tr, ErrorText, errorText, TextDelivery,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { compareLines } from './core';
import notice from './diff.NOTICE.txt?url';
export default function TextDiff({ locale }: ToolProps) {
  const [left, setLeft] = useState(''),
    [right, setRight] = useState(''),
    [ignore, setIgnore] = useState(false);
  let result, error;
  try {
    result = compareLines(left, right, ignore);
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <Frame locale={locale}>
      <span hidden data-diff-license={notice} />
      <div className={s.columns}>
        <TextAreaField
          label={tr(locale, '原文', 'Original')}
          maxLength={100000}
          value={left}
          onChange={setLeft}
          rows={10}
        />
        <TextAreaField
          label={tr(locale, '新文本', 'Revised')}
          maxLength={100000}
          value={right}
          onChange={setRight}
          rows={10}
        />
      </div>
      <CheckboxField
        label={tr(locale, '忽略行末空白', 'Ignore trailing whitespace')}
        checked={ignore}
        onCheckedChange={setIgnore}
      />
      <ErrorText error={error} />
      {result && (
        <>
          <p role="status">
            +{result.added} / −{result.removed}
          </p>
          <div className={s.pre}>
            {result.parts.map((p, i) => (
              <div
                key={i}
                className={[
                  p.added ? s.added : p.removed ? s.removed : undefined,
                ].filter(Boolean).join(' ')}
              >
                {p.value.split('\n').map((line, j) => (
                  <div key={j}>
                    {p.added ? '+' : p.removed ? '−' : ' '}
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <TextDelivery
            locale={locale}
            value={result.text}
            filename="difference.diff"
          />
        </>
      )}
      <Button
        onClick={() => {
          setLeft('');
          setRight('');
        }}
      >
        {tr(locale, '清空', 'Clear')}
      </Button>
    </Frame>
  );
}
