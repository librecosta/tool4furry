import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import {
  Frame,
  Picker,
  ErrorText,
  tr,
  saveBlob,
  type FileRow,
} from '../general/ui';
import { useJob } from '../general/use-job';
import { boundedFiles } from '../general/bounds';
import { readPdf, mergePdfs } from '../general/pdf';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
import sortingNotice from './dnd-kit.NOTICE.txt?url';
import { PdfFileList } from './PdfFileList';
import { mergeStyles as s } from './merge.styles';
export default function PdfMerge({ locale }: ToolProps) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [sorting, setSorting] = useState(false);
  const job = useJob<Blob>(locale);
  const change = (v: FileRow[]) => {
    job.invalidate();
    setRows(v);
    if (!v.length) setSorting(false);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-pdf-license={notice} />
      <span hidden data-pdf-sorting-license={sortingNotice} />
      <Picker
        locale={locale}
        accept=".pdf,application/pdf"
        disabled={job.busy || sorting}
        onFiles={(files) => {
          void job.run(async (signal) => {
            boundedFiles([...rows.map((r) => r.file), ...files]);
            const added: FileRow[] = [];
            for (const file of files) {
              const doc = await readPdf(file);
              if (signal.aborted) throw new Error();
              added.push({
                id: crypto.randomUUID(),
                file,
                detail: tr(
                  locale,
                  `${doc.getPageCount()} 页`,
                  `${doc.getPageCount()} pages`,
                ),
              });
            }
            setRows([...rows, ...added]);
            return new Blob();
          });
        }}
      />
      {rows.length > 0 && <PdfFileList rows={rows} locale={locale} disabled={job.busy} sorting={sorting}
        onSortingChange={setSorting} onChange={change} />}
      <ErrorText error={job.error} />
      <div data-pdf-actions {...stylex.props(s.actions)}>
        <Button
          variant="primary"
          xstyle={[s.button, s.primary]}
          loading={job.busy}
          disabled={!rows.length || sorting}
          onClick={() =>
            void job.run((signal) =>
              mergePdfs(
                rows.map((r) => r.file),
                signal,
              ),
            )
          }
        >
          {tr(locale, '合并 PDF', 'Merge')}
        </Button>
        <Button xstyle={[s.button, s.secondary]} disabled={job.busy || sorting || !job.result?.size}
          onClick={() => { if (!job.busy && !sorting && job.result?.size) saveBlob(job.result, 'merged.pdf'); }}>
          {tr(locale, '下载 PDF', 'Download')}
        </Button>
        <Button xstyle={[s.button, s.clear]} onClick={() => change([])}>
          {tr(locale, '清空', 'Clear')}
        </Button>
      </div>
    </Frame>
  );
}
