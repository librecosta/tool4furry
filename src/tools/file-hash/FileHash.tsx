import { useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Frame, Picker, Copy, ErrorText, errorText, tr } from '../general/ui';
import { useJob } from '../general/use-job';
import { hashFile, compareHash } from './core';
export default function FileHash({ locale }: ToolProps) {
  const [file, setFile] = useState<File>(),
    [expected, setExpected] = useState('');
  const job = useJob<string>(locale);
  let comparison = '',
    error;
  try {
    if (job.result && expected)
      comparison = compareHash(job.result, expected)
        ? tr(locale, '一致', 'Match')
        : tr(locale, '不一致', 'Mismatch');
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <Frame locale={locale}>
      <Picker
        locale={locale}
        multiple={false}
        onFiles={(v) => {
          job.invalidate();
          setFile(v[0]);
        }}
      />
      {file && (
        <p>
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </p>
      )}
      <p>{tr(locale, '单文件上限 32 MiB。', 'Maximum file size: 32 MiB.')}</p>
      <Button
        variant="primary"
        disabled={!file}
        loading={job.busy}
        onClick={() => void job.run((signal) => hashFile(file!, signal))}
      >
        {tr(locale, '计算 SHA-256', 'Calculate SHA-256')}
      </Button>
      {job.result && (
        <>
          <TextField
            label="SHA-256"
            value={job.result}
            readOnly
            onChange={() => {}}
          />
          <Copy locale={locale} value={job.result} />
        </>
      )}
      <TextField
        label={tr(locale, '预期哈希（可选）', 'Expected hash (optional)')}
        value={expected}
        onChange={setExpected}
      />
      <p role="status">
        {job.busy
          ? tr(locale, '处理中', 'Processing')
          : comparison ||
            (job.result ? tr(locale, '计算完成', 'Completed') : '')}
      </p>
      <ErrorText error={error || job.error} />
      <Button
        onClick={() => {
          job.invalidate();
          setFile(undefined);
          setExpected('');
        }}
      >
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
