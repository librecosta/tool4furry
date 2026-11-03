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
import { PdfFileList } from './PdfFileList';
import { mergeStyles as s } from './merge.styles';
export default function PdfMerge({ locale }: ToolProps) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const job = useJob<Blob>(locale);
  const change = (v: FileRow[]) => {
    job.invalidate();
    setRows(v);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-pdf-license={notice} />
      <Picker
        locale={locale}
        accept=".pdf,application/pdf"
        disabled={job.busy}
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
      <PdfFileList rows={rows} locale={locale} disabled={job.busy} onChange={change} />
      <ErrorText error={job.error} />
      <div data-pdf-actions {...stylex.props(s.actions)}>
        <Button
          variant="primary"
          xstyle={[s.button, s.primary]}
          loading={job.busy}
          disabled={!rows.length}
          onClick={() =>
            void job.run((signal) =>
              mergePdfs(
                rows.map((r) => r.file),
                signal,
              ),
            )
          }
        >
          {tr(locale, '合并 PDF', 'Merge PDFs')}
        </Button>
        <Button xstyle={[s.button, s.secondary]} disabled={job.busy || !job.result?.size}
          onClick={() => { if (!job.busy && job.result?.size) saveBlob(job.result, 'merged.pdf'); }}>
          {tr(locale, '下载 PDF', 'Download PDF')}
        </Button>
        <Button xstyle={[s.button, s.clear]} onClick={() => change([])}>
          {tr(locale, '清空 / 取消', 'Clear / cancel')}
        </Button>
      </div>
    </Frame>
  );
}
