import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { Frame, Picker, ErrorText, tr, saveBlob } from '../general/ui';
import s from '../general/ui.module.scss';
import { useJob } from '../general/use-job';
import { boundedFiles, MiB } from '../general/bounds';
import { createZip, inspectZip, extractZip, type ZipItem } from './core';
export default function ZipManager({ locale }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]),
    [archive, setArchive] = useState<File>(),
    [items, setItems] = useState<ZipItem[]>([]),
    [selected, setSelected] = useState<string[]>([]);
  const job = useJob<Blob>(locale);
  const clear = () => {
    job.invalidate();
    setFiles([]);
    setArchive(undefined);
    setItems([]);
    setSelected([]);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-zip-license={zipNotice} />
      <h2>{tr(locale, '创建 ZIP', 'Create ZIP')}</h2>
      <Picker
        locale={locale}
        folder
        disabled={job.busy}
        onFiles={(added) => {
          job.invalidate();
          try {
            boundedFiles([...files, ...added], 500, 96 * MiB, 32 * MiB);
            setFiles([...files, ...added]);
          } catch {
            job.setError(
              tr(
                locale,
                '最多 500 项、单项 32 MiB、累计 96 MiB。',
                'Limits: 500 entries, 32 MiB per file, 96 MiB total.',
              ),
            );
          }
        }}
      />
      <p>
        {files.length} {tr(locale, '个文件', 'files')} ·{' '}
        {(files.reduce((n, f) => n + f.size, 0) / 1024).toFixed(1)} KB
      </p>
      <ul className={s.list}>
        {files.map((f, i) => (
          <li key={i} className={s.item}>
            <span className={s.grow}>
              {f.webkitRelativePath || f.name}
            </span>
            <Button
              size="sm"
              onClick={() => {
                job.invalidate();
                setFiles(files.filter((_, n) => i !== n));
              }}
            >
              {tr(locale, '移除', 'Remove')}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="primary"
        loading={job.busy}
        disabled={!files.length}
        onClick={() =>
          void job.run((signal) =>
            createZip(
              files.map((f) => ({
                name: f.webkitRelativePath || f.name,
                blob: f,
              })),
              signal,
            ),
          )
        }
      >
        {tr(locale, '创建 ZIP', 'Create ZIP')}
      </Button>
      <h2>{tr(locale, '打开并提取 ZIP', 'Open and extract ZIP')}</h2>
      <Picker
        locale={locale}
        multiple={false}
        accept=".zip,application/zip"
        disabled={job.busy}
        onFiles={(v) => {
          job.invalidate();
          setArchive(undefined);
          setItems([]);
          setSelected([]);
          void job.run(async (signal) => {
            const next = await inspectZip(v[0]);
            if (signal.aborted) throw new Error();
            setArchive(v[0]);
            setItems(next);
            setSelected(next.map((i) => i.name));
            return new Blob();
          });
        }}
      />
      {archive && (
        <>
          <p>
            {archive.name} · {items.length} {tr(locale, '个文件', 'files')} ·{' '}
            {(items.reduce((n, i) => n + i.size, 0) / 1024).toFixed(1)} KB
          </p>
          <div className={s.scroll}>
            {items.map((item) => (
              <div key={item.name} className={s.item}>
                <CheckboxField
                  label={`${item.name} · ${(item.size / 1024).toFixed(1)} KB`}
                  checked={selected.includes(item.name)}
                  onCheckedChange={(v) => {
                    job.invalidate();
                    setSelected(
                      v
                        ? [...selected, item.name]
                        : selected.filter((n) => n !== item.name),
                    );
                  }}
                />
                <Button
                  size="sm"
                  disabled={job.busy}
                  onClick={() =>
                    void job.run(async (signal) => {
                      const [entry] = await extractZip(
                        archive,
                        items,
                        [item.name],
                        signal,
                      );
                      if (!signal.aborted)
                        saveBlob(entry.blob, entry.name.split('/').at(-1)!);
                      return new Blob();
                    })
                  }
                >
                  {tr(locale, '提取', 'Extract')}
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            disabled={job.busy || !selected.length}
            onClick={() =>
              void job.run(async (signal) =>
                createZip(
                  await extractZip(archive, items, selected, signal),
                  signal,
                ),
              )
            }
          >
            {tr(locale, '提取选中项为 ZIP', 'Extract selected as ZIP')}
          </Button>
        </>
      )}
      <ErrorText error={job.error} />
      {!!job.result?.size && (
        <Button onClick={() => saveBlob(job.result!, 'files.zip')}>
          {tr(locale, '下载 ZIP', 'Download ZIP')}
        </Button>
      )}
      <Button onClick={clear}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
