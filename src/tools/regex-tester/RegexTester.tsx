import { useEffect, useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextAreaField, TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { Frame, tr, TextDelivery, ErrorText, errorText,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { LocalError } from '../general/bounds';
import { runRegex } from './client';
import type { RegexResult } from './core';
export default function RegexTester({ locale }: ToolProps) {
  const [pattern, setPattern] = useState('\\b(\\w+)\\b'),
    [flags, setFlags] = useState('g'),
    [text, setText] = useState('Hello Tool4Furry'),
    [replacement, setReplacement] = useState('$1'),
    [result, setResult] = useState<RegexResult>(),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(undefined);
    setError(undefined);
    setBusy(false);
    if (!pattern) return;
    const timer = setTimeout(() => {
      setBusy(true);
      void runRegex({ pattern, flags, text, replacement }, controller.signal)
        .then(
          (v) => {
            if (!controller.signal.aborted) setResult(v);
          },
          (e) => {
            if (!controller.signal.aborted)
              setError(
                e instanceof LocalError
                  ? errorText(e, locale)
                  : tr(
                      locale,
                      `正则或输入错误：${e.message}`,
                      `Regex or input error: ${e.message}`,
                    ),
              );
          },
        )
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pattern, flags, text, replacement, locale]);
  let cursor = 0;
  const highlighted = result?.matches.flatMap((m, i) => {
    const before = text.slice(cursor, m.index);
    cursor = m.end;
    return [
      before,
      <mark key={i} className={s.added}>
        {m.value || '▏'}
      </mark>,
    ];
  });
  return (
    <Frame locale={locale}>
      <TextField
        label={tr(
          locale,
          '正则表达式（不含两侧 /）',
          'Pattern (without / delimiters)',
        )}
        value={pattern}
        maxLength={500}
        onChange={setPattern}
      />
      <div className={s.row}>
        {['g', 'i', 'm', 's', 'u', 'y', 'd'].map((flag) => (
          <CheckboxField
            key={flag}
            label={flag}
            checked={flags.includes(flag)}
            onCheckedChange={(v) =>
              setFlags(v ? flags + flag : flags.replace(flag, ''))
            }
          />
        ))}
      </div>
      <TextAreaField
        label={tr(locale, '测试文本', 'Test text')}
        rows={9}
        maxLength={200000}
        value={text}
        onChange={setText}
      />
      <TextField
        label={tr(locale, '替换表达式', 'Replacement')}
        maxLength={10000}
        value={replacement}
        onChange={setReplacement}
      />
      <p className={s.note}>
        JavaScript RegExp ·{' '}
        {tr(
          locale,
          '与其他正则引擎的语义可能不同。',
          'Semantics may differ from other regex engines.',
        )}
      </p>
      <ErrorText error={error} />
      <p role="status">
        {busy
          ? tr(locale, '匹配中…', 'Matching…')
          : result
            ? `${result.matches.length} ${tr(locale, '处匹配', 'matches')}`
            : ''}
      </p>
      {result && (
        <>
          <pre
            aria-label={tr(locale, '匹配高亮', 'Highlighted matches')}
            className={s.pre}
          >
            {highlighted}
            {text.slice(cursor)}
          </pre>
          <div className={s.scroll}>
            <ol>
              {result.matches.map((m, i) => (
                <li key={i}>
                  <code>
                    {m.index}–{m.end}: {JSON.stringify(m.value)}
                  </code>
                  {m.groups.length > 0 && (
                    <pre className={s.pre}>
                      {JSON.stringify(
                        { groups: m.groups, named: m.named },
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <TextAreaField
            label={tr(locale, '替换结果', 'Replacement result')}
            rows={8}
            value={result.replaced}
            readOnly
            onChange={() => {}}
          />
          <TextDelivery
            locale={locale}
            value={result.replaced}
            enabled
            filename="replaced.txt"
          />
        </>
      )}
      <Button
        onClick={() => {
          setPattern('');
          setText('');
          setReplacement('');
          setFlags('g');
        }}
      >
        {tr(locale, '清空', 'Clear')}
      </Button>
    </Frame>
  );
}
