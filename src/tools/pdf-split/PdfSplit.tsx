import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useState } from 'react';
import type { PDFDocument } from 'pdf-lib';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Frame, Picker, ErrorText, tr, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { readPdf, extractPdf, pageRange, abort } from '../general/pdf';
import { packZip } from '../image-converter/zip';
import { fail, MiB } from '../general/bounds';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
export default function PdfSplit({ locale }: ToolProps) {
  const [source, setSource] = useState<{
      file: File;
      doc: PDFDocument;
    }>(),
    [range, setRange] = useState(''),
    [kind, setKind] = useState('pdf');
  const job = useJob<Blob>(locale);
  const reset = () => {
    job.invalidate();
    setSource(undefined);
    setRange('');
  };
  return (
    <Frame locale={locale}>
      <span hidden data-zip-license={zipNotice} />
      <span hidden data-pdf-license={notice} />
      <Picker
        locale={locale}
        multiple={false}
        accept=".pdf,application/pdf"
        disabled={job.busy}
        onFiles={(files) => {
          job.invalidate();
          setSource(undefined);
          void job.run(async (signal) => {
            const doc = await readPdf(files[0]);
            abort(signal);
            setSource({ file: files[0], doc });
            setRange(`1-${doc.getPageCount()}`);
            return new Blob();
          });
        }}
      />
      {source && (
        <>
          <p>
            {source.file.name} · {source.doc.getPageCount()}{' '}
            {tr(locale, '页', 'pages')}
          </p>
          <TextField
            label={tr(locale, '页码范围', 'Page range')}
            hint="1-3,5,8-10"
            value={range}
            onChange={(v) => {
              job.invalidate();
              setRange(v);
            }}
          />
          <Button
            variant="primary"
            loading={job.busy}
            onClick={() => {
              setKind('pdf');
              void job.run((signal) =>
                extractPdf(
                  source.doc,
                  pageRange(range, source.doc.getPageCount()),
                  signal,
                ),
              );
            }}
          >
            {tr(locale, '提取选中页面', 'Extract selected pages')}
          </Button>
          <Button
            disabled={job.busy}
            onClick={() => {
              setKind('zip');
              void job.run(async (signal) => {
                if (source.doc.getPageCount() > 200)
                  fail(
                    '逐页 ZIP 最多 200 页。',
                    'Per-page ZIP is limited to 200 pages.',
                  );
                const entries = [];
                let size = 0;
                for (let i = 0; i < source.doc.getPageCount(); i++) {
                  abort(signal);
                  const blob = await extractPdf(source.doc, [i], signal);
                  size += blob.size;
                  if (size > 96 * MiB)
                    fail(
                      '逐页输出超限。',
                      'Per-page output exceeds the size limit.',
                    );
                  entries.push({
                    name: `page-${String(i + 1).padStart(3, '0')}.pdf`,
                    blob,
                  });
                }
                return packZip(entries, signal);
              });
            }}
          >
            {tr(locale, '全部逐页导出 ZIP', 'Export every page as ZIP')}
          </Button>
        </>
      )}
      <ErrorText error={job.error} />
      {!!job.result?.size && (
        <Button onClick={() => saveBlob(job.result!, `split.${kind}`)}>
          {tr(locale, '下载结果', 'Download result')}
        </Button>
      )}
      <Button onClick={reset}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
