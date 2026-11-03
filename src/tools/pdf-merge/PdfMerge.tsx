import { useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import {
  Frame,
  Picker,
  FileRows,
  ErrorText,
  tr,
  saveBlob,
  type FileRow,
} from '../general/ui';
import { useJob } from '../general/use-job';
import { boundedFiles } from '../general/bounds';
import { readPdf, mergePdfs } from '../general/pdf';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
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
      <FileRows rows={rows} locale={locale} onChange={change} />
      <ErrorText error={job.error} />
      <Button
        variant="primary"
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
      {job.result?.size ? (
        <Button onClick={() => saveBlob(job.result!, 'merged.pdf')}>
          {tr(locale, '下载 PDF', 'Download PDF')}
        </Button>
      ) : null}
      <Button onClick={() => change([])}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
