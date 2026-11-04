import s from './ui.module.scss';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import type { Locale } from '../../i18n/locale';
import { LocalError } from './bounds';
export const tr = (locale: Locale, zh: string, en: string) =>
  locale === 'zh' ? zh : en;

export function Frame({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const label = tr(locale, '工具工作区', 'Tool workspace');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return (
    <WorkbenchShell
      mode="form"
      formWidth="wide"
      labels={{
        parameters: label,
        close: tr(locale, '关闭', 'Close'),
        showParameters: label,
        hideParameters: label,
        showTools: label,
        hideTools: label,
        main: label,
        toolbar: label,
      }}
    >
      <div
        data-general-ready={ready || undefined}
        aria-busy={!ready}
        className={s.stack}
      >
        {children}
      </div>
    </WorkbenchShell>
  );
}
export function ErrorText({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className={s.error}>
      {error}
    </p>
  ) : null;
}
export const errorText = (e: unknown, locale: Locale) =>
  e instanceof LocalError
    ? tr(locale, e.zh, e.en)
    : tr(
        locale,
        '处理失败：输入可能损坏、不受支持或超出设备能力。',
        'Processing failed: input may be damaged, unsupported or beyond device capacity.',
      );
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Copy({
  value,
  locale,
  enabled = !!value,
}: {
  value: string;
  locale: Locale;
  enabled?: boolean;
}) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    setMessage('');
  }, [value]);
  return (
    <>
      <Button
        disabled={!enabled}
        onClick={() => {
          void Promise.resolve()
            .then(() => navigator.clipboard.writeText(value))
            .then(
              () => setMessage(tr(locale, '已复制', 'Copied')),
              () =>
                setMessage(
                  tr(
                    locale,
                    '复制失败，请手动选择复制。',
                    'Copy failed. Select and copy the text manually.',
                  ),
                ),
            );
        }}
      >
        {tr(locale, '复制', 'Copy')}
      </Button>
      {message && (
        <span role="status" className={s.note}>
          {message}
        </span>
      )}
    </>
  );
}
export function TextDelivery({
  value,
  locale,
  filename = 'result.txt',
  mime = 'text/plain;charset=utf-8',
  enabled = !!value,
}: {
  value: string;
  locale: Locale;
  filename?: string;
  mime?: string;
  enabled?: boolean;
}) {
  return (
    <div className={s.row}>
      <Copy value={value} locale={locale} enabled={enabled} />
      <Button
        disabled={!enabled}
        onClick={() => saveBlob(new Blob([value], { type: mime }), filename)}
      >
        {tr(locale, '下载', 'Download')}
      </Button>
    </div>
  );
}
export function Picker({
  locale,
  onFiles,
  multiple = true,
  accept = '',
  folder = false,
  disabled = false,
}: {
  locale: Locale;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  folder?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const receive = (files: File[]) => {
    setError(undefined);
    if (!multiple && files.length !== 1) {
      setError(
        tr(locale, '请一次选择一个文件。', 'Select one file at a time.'),
      );
      return;
    }
    onFiles(files);
  };
  return (
    <div className={s.stack}>
      <FileDropzone
        label={tr(
          locale,
          '选择文件或拖放到这里',
          'Choose files or drop them here',
        )}
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        issueMessages={{
          type: tr(locale, '不支持的文件类型', 'Unsupported file type'),
          size: tr(locale, '文件过大', 'File is too large'),
          count: tr(locale, '文件数量超限', 'Too many files'),
        }}
        onFilesReceived={receive}
      />
      <ErrorText error={error} />
      {folder && (
        <>
          <input
            hidden
            multiple
            type="file"
            ref={(el) => {
              ref.current = el;
              el?.setAttribute('webkitdirectory', '');
            }}
            onChange={(e) => {
              receive(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <Button disabled={disabled} onClick={() => ref.current?.click()}>
            {tr(locale, '添加文件夹', 'Add folder')}
          </Button>
        </>
      )}
    </div>
  );
}
export type FileRow = {
  id: string;
  file: File;
  detail?: string;
};
export function FileRows({
  rows,
  locale,
  onChange,
}: {
  rows: FileRow[];
  locale: Locale;
  onChange: (rows: FileRow[]) => void;
}) {
  const move = (at: number, to: number) => {
    const next = [...rows];
    next.splice(to, 0, next.splice(at, 1)[0]);
    onChange(next);
  };
  return (
    <ul className={s.list}>
      {rows.map((row, i) => (
        <li key={row.id} className={s.item}>
          <div className={s.grow}>
            {row.file.name}
            <p className={s.note}>
              {(row.file.size / 1024).toFixed(1)} KB {row.detail}
            </p>
          </div>
          <Button
            size="sm"
            disabled={i === 0}
            aria-label={tr(
              locale,
              `上移 ${row.file.name}`,
              `Move up ${row.file.name}`,
            )}
            onClick={() => move(i, i - 1)}
          >
            ↑
          </Button>
          <Button
            size="sm"
            disabled={i === rows.length - 1}
            aria-label={tr(
              locale,
              `下移 ${row.file.name}`,
              `Move down ${row.file.name}`,
            )}
            onClick={() => move(i, i + 1)}
          >
            ↓
          </Button>
          <Button
            size="sm"
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
          >
            {tr(locale, '移除', 'Remove')}
          </Button>
        </li>
      ))}
    </ul>
  );
}
export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
