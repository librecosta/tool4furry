import { useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { Frame, ErrorText, errorText, tr, Copy, TextDelivery,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { integer } from '../general/bounds';
import { generateUuids } from './core';
export default function UuidGenerator({ locale }: ToolProps) {
  const [count, setCount] = useState('1'),
    [upper, setUpper] = useState(false),
    [values, setValues] = useState<string[]>([]),
    [error, setError] = useState<string>();
  const create = (n: number) => {
    try {
      setValues(generateUuids(n));
      setError(undefined);
    } catch (e) {
      setValues([]);
      setError(errorText(e, locale));
    }
  };
  const shown = upper ? values.map((v) => v.toUpperCase()) : values;
  return (
    <Frame locale={locale}>
      <div className={s.columns}>
        <TextField
          label={tr(locale, '生成数量（1–1000）', 'Count (1–1,000)')}
          value={count}
          onChange={(v) => {
            setCount(v);
            setValues([]);
            setError(undefined);
          }}
        />
        <CheckboxField
          label={tr(locale, '大写', 'Uppercase')}
          checked={upper}
          onCheckedChange={setUpper}
        />
      </div>
      <div className={s.row}>
        <Button
          variant="primary"
          onClick={() => {
            try {
              create(integer(count, 1, 1000));
            } catch (e) {
              setValues([]);
              setError(errorText(e, locale));
            }
          }}
        >
          {tr(locale, '生成 UUID', 'Generate UUIDs')}
        </Button>
        <Button
          onClick={() => {
            setCount('1');
            create(1);
          }}
        >
          {tr(locale, '生成单个', 'Generate one')}
        </Button>
        <Button
          onClick={() => {
            setValues([]);
            setCount('1');
            setUpper(false);
            setError(undefined);
          }}
        >
          {tr(locale, '重置', 'Reset')}
        </Button>
      </div>
      <ErrorText error={error} />
      <p role="status">{shown.length} UUIDv4</p>
      <div className={s.scroll}>
        <ul className={s.list}>
          {shown.map((v, i) => (
            <li key={i} className={s.item}>
              <code className={s.grow}>{v}</code>
              <Copy value={v} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
      <TextDelivery
        value={shown.join('\n')}
        filename="uuids.txt"
        locale={locale}
      />
    </Frame>
  );
}
