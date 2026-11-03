import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import {
  Frame,
  Picker,
  ErrorText,
  errorText,
  tr,
  saveBlob,
  s,
} from '../general/ui';
import { useJob } from '../general/use-job';
import { boundedFiles } from '../general/bounds';
import { packZip } from '../image-converter/zip';
import { renamePlan, defaultRules, type Rules } from './core';
export default function BatchFileRenamer({ locale }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]),
    [rules, setRules] = useState(defaultRules);
  const job = useJob<Blob>(locale);
  let plan: ReturnType<typeof renamePlan> = [],
    error;
  try {
    plan = renamePlan(
      files.map((f) => f.name),
      rules,
    );
  } catch (e) {
    error = errorText(e, locale);
  }
  const update = (next: Rules) => {
    job.invalidate();
    setRules(next);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-zip-license={zipNotice} />
      <Picker
        locale={locale}
        onFiles={(v) => {
          job.invalidate();
          try {
            boundedFiles([...files, ...v]);
            setFiles([...files, ...v]);
          } catch (e) {
            job.setError(errorText(e, locale));
          }
        }}
      />
      <div {...stylex.props(s.columns)}>
        {(
          ['prefix', 'suffix', 'find', 'replace', 'start', 'digits'] as const
        ).map((k) => (
          <TextField
            key={k}
            label={tr(
              locale,
              ...(
                {
                  prefix: ['前缀', 'Prefix'],
                  suffix: ['后缀', 'Suffix'],
                  find: ['查找', 'Find'],
                  replace: ['替换为', 'Replace with'],
                  start: ['起始序号', 'Start number'],
                  digits: ['序号位数', 'Number padding'],
                } as Record<string, [string, string]>
              )[k],
            )}
            value={rules[k]}
            onChange={(v) => update({ ...rules, [k]: v })}
          />
        ))}
      </div>
      <div {...stylex.props(s.row)}>
        <CheckboxField
          label={tr(locale, '添加序号', 'Add sequence')}
          checked={rules.sequence}
          onCheckedChange={(v) => update({ ...rules, sequence: v })}
        />
        <CheckboxField
          label={tr(locale, '保留扩展名', 'Keep extensions')}
          checked={rules.keepExtension}
          onCheckedChange={(v) => update({ ...rules, keepExtension: v })}
        />
      </div>
      <ErrorText error={error || job.error} />
      <div {...stylex.props(s.scroll)}>
        <table {...stylex.props(s.table)}>
          <thead>
            <tr>
              <th {...stylex.props(s.cell)}>
                {tr(locale, '原文件名', 'Original name')}
              </th>
              <th {...stylex.props(s.cell)}>
                {tr(locale, '输出文件名', 'Output name')}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {files.map((f, i) => (
              <tr key={i}>
                <td {...stylex.props(s.cell)}>{f.name}</td>
                <td {...stylex.props(s.cell)}>{plan[i]?.name ?? '—'}</td>
                <td>
                  <Button
                    size="sm"
                    onClick={() => {
                      job.invalidate();
                      setFiles(files.filter((_, n) => n !== i));
                    }}
                  >
                    {tr(locale, '移除', 'Remove')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="primary"
        loading={job.busy}
        disabled={!files.length || !!error}
        onClick={() =>
          void job.run((signal) =>
            packZip(
              files.map((file, i) => ({ name: plan[i].name, blob: file })),
              signal,
            ),
          )
        }
      >
        {tr(locale, '重命名并打包', 'Rename and create ZIP')}
      </Button>
      {job.result && (
        <Button onClick={() => saveBlob(job.result!, 'renamed-files.zip')}>
          {tr(locale, '下载 ZIP', 'Download ZIP')}
        </Button>
      )}
      <Button
        onClick={() => {
          job.invalidate();
          setFiles([]);
          setRules(defaultRules);
        }}
      >
        {tr(locale, '重置 / 取消', 'Reset / cancel')}
      </Button>
    </Frame>
  );
}
