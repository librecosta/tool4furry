import { useMemo, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { TextAreaField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { Button } from '../../ui/Button';
import {
  Frame,
  Picker,
  ErrorText,
  errorText,
  tr,
  s,
  TextDelivery,
} from '../general/ui';
import { useJob } from '../general/use-job';
import { fail } from '../general/bounds';
import { convertTable } from './core';
import notice from './papaparse.NOTICE.txt?url';
export default function CsvJsonConverter({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [mode, setMode] = useState<'csv-json' | 'json-csv'>('csv-json'),
    [delimiter, setDelimiter] = useState(',');
  const job = useJob<void>(locale);
  const result = useMemo(() => {
    if (!input) return {};
    try {
      return { table: convertTable(input, mode, delimiter) };
    } catch (e) {
      return { error: errorText(e, locale) };
    }
  }, [input, mode, delimiter, locale]);
  return (
    <Frame locale={locale}>
      <span hidden data-csv-license={notice} />
      <div {...stylex.props(s.columns)}>
        <SelectField
          label={tr(locale, '转换方向', 'Conversion')}
          value={mode}
          onValueChange={(v) => setMode(v as typeof mode)}
          options={[
            { value: 'csv-json', label: 'CSV → JSON' },
            { value: 'json-csv', label: 'JSON → CSV' },
          ]}
        />
        <SelectField
          label={tr(locale, 'CSV 分隔符', 'CSV delimiter')}
          value={delimiter}
          onValueChange={setDelimiter}
          options={[
            { value: ',', label: tr(locale, '逗号', 'Comma') },
            { value: ';', label: tr(locale, '分号', 'Semicolon') },
            { value: '\t', label: 'Tab' },
          ]}
        />
      </div>
      <Picker
        locale={locale}
        multiple={false}
        accept=".csv,.tsv,.json,text/csv,application/json,text/tab-separated-values"
        disabled={job.busy}
        onFiles={(files) => {
          void job.run(async (signal) => {
            if (files[0].size > 2 * 1024 ** 2)
              fail('文件上限 2 MiB。', 'File limit: 2 MiB.');
            let text: string;
            try {
              text = new TextDecoder('utf-8', { fatal: true }).decode(
                await files[0].arrayBuffer(),
              );
            } catch {
              fail('文件不是有效 UTF-8。', 'File is not valid UTF-8.');
            }
            if (text.length > 1000000) fail('文本过长。', 'Text is too long.');
            if (!signal.aborted) setInput(text);
          });
        }}
      />
      <div {...stylex.props(s.columns)}>
        <TextAreaField
          label={tr(locale, '输入', 'Input')}
          rows={12}
          maxLength={1000000}
          value={input}
          onChange={(v) => {
            job.invalidate();
            setInput(v);
          }}
        />
        <TextAreaField
          label={tr(locale, '结果', 'Result')}
          rows={12}
          value={result.table?.output ?? ''}
          readOnly
          onChange={() => {}}
        />
      </div>
      <ErrorText error={job.error ?? result.error} />
      {result.table && (
        <>
          <p {...stylex.props(s.note)}>
            {result.table.rows.length} {tr(locale, '行', 'rows')} ·{' '}
            {result.table.headers.length}{' '}
            {tr(locale, '列（预览前 50 行）', 'columns (first 50 rows shown)')}
          </p>
          <div {...stylex.props(s.scroll)}>
            <table {...stylex.props(s.table)}>
              <thead>
                <tr>
                  {result.table.headers.map((h) => (
                    <th key={h} {...stylex.props(s.cell)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.table.rows.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} {...stylex.props(s.cell)}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div {...stylex.props(s.row)}>
        <TextDelivery
          locale={locale}
          value={result.table?.output ?? ''}
          filename={mode === 'csv-json' ? 'converted.json' : 'converted.csv'}
          mime={
            mode === 'csv-json'
              ? 'application/json;charset=utf-8'
              : 'text/csv;charset=utf-8'
          }
        />
        <Button
          onClick={() => {
            job.invalidate();
            setInput('');
          }}
        >
          {tr(locale, '清空 / 取消', 'Clear / cancel')}
        </Button>
      </div>
    </Frame>
  );
}
