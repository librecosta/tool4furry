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
import { boundedFiles, fail } from '../general/bounds';
import { abort } from '../general/pdf';
import { acceptImage } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { mobileImageLimits } from '../image/limits';
import { mobileComicBudget } from '../comic-page-organizer/limits';
import { comicPdf } from '../comic-page-organizer/pdf';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
export default function ImagesToPdf({ locale }: ToolProps) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const job = useJob<Blob>(locale);
  const change = (r: FileRow[]) => {
    job.invalidate();
    setRows(r);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-pdf-license={notice} />
      <Picker
        locale={locale}
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        onFiles={(files) => {
          void job.run(async (signal) => {
            boundedFiles(
              [...rows.map((r) => r.file), ...files],
              40,
              32 * 1024 ** 2,
              20 * 1024 ** 2,
            );
            const resources = new ImageResources();
            for (const file of files) {
              const source = await acceptImage(
                file,
                resources,
                mobileImageLimits,
              );
              abort(signal);
              if (!['png', 'jpeg'].includes(source.info.format))
                fail(
                  '首版只支持 PNG / JPEG。',
                  'This version supports PNG / JPEG only.',
                );
            }
            setRows([
              ...rows,
              ...files.map((file) => ({ id: crypto.randomUUID(), file })),
            ]);
            return new Blob();
          });
        }}
        disabled={job.busy}
      />
      <FileRows locale={locale} rows={rows} onChange={change} />
      <ErrorText error={job.error} />
      <Button
        variant="primary"
        loading={job.busy}
        disabled={!rows.length}
        onClick={() =>
          void job.run(async (signal) => {
            const resources = new ImageResources(),
              sources = [];
            for (const row of rows) {
              abort(signal);
              sources.push(
                await acceptImage(row.file, resources, mobileImageLimits),
              );
            }
            return comicPdf(
              sources,
              resources,
              mobileImageLimits,
              mobileComicBudget.pdf,
              signal,
              () => {},
            );
          })
        }
      >
        {tr(locale, '生成 PDF', 'Create PDF')}
      </Button>
      {!!job.result?.size && (
        <Button onClick={() => saveBlob(job.result!, 'images.pdf')}>
          {tr(locale, '下载 PDF', 'Download PDF')}
        </Button>
      )}
      <Button onClick={() => change([])}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
