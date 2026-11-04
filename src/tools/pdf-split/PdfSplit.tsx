import { useState } from 'react';
import type { PDFDocument } from 'pdf-lib';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { FileDropzone } from '../../ui/FileDropzone';
import { Frame, ErrorText, errorText, tr, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { readPdf, pageRange, abort } from '../general/pdf';
import { formatPages, togglePage } from './selection';
import { createOutput, outputIssue, type OutputKind } from './output';
import { PdfPages } from './PdfPages';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
import zipNotice from '../general/fflate.NOTICE.txt?url';
import previewNotice from './pdfjs.NOTICE.txt?url';
import s from './split.module.scss';

export default function PdfSplit({ locale }: ToolProps) {
  const intake = useJob<{ file: File; doc: PDFDocument }>(locale);
  const job = useJob<{ blob: Blob; kind: OutputKind }>(locale);
  const source = intake.result;
  const count = source?.doc.getPageCount() ?? 0;
  const [range, setRange] = useState('');
  const [kind, setKind] = useState<OutputKind>('pdf');
  let pages: number[] = [], rangeError: string | undefined, limitError: string | undefined;
  if (source) {
    try { pages = pageRange(range, count); } catch (e) { rangeError = errorText(e, locale); }
    if (!rangeError) try { outputIssue(pages.length, kind); } catch (e) { limitError = errorText(e, locale); }
  }
  const changeRange = (value: string) => { job.invalidate(); setRange(value); };
  const reset = () => { job.invalidate(); intake.invalidate(); setRange(''); setKind('pdf'); };
  return <Frame locale={locale}>
    <span hidden data-zip-license={zipNotice} data-pdf-license={notice} data-pdf-preview-license={previewNotice} />
    <FileDropzone label={source ? tr(locale, '更换 PDF', 'Replace PDF') : tr(locale, '选择 PDF 或拖放到这里', 'Choose a PDF or drop it here')}
      appearance={source ? 'compact' : 'expanded'} accept=".pdf,application/pdf" multiple={false} maxFiles={1} maxSizeBytes={32 * 1024 ** 2} disabled={intake.busy || job.busy}
      issueMessages={{ type: tr(locale, '请选择 PDF 文件。', 'Choose a PDF file.'), count: tr(locale, '请一次选择一个 PDF。', 'Select one PDF at a time.'), size: tr(locale, 'PDF 不能超过 32 MiB。', 'PDF must not exceed 32 MiB.') }}
      onFilesSelected={files => {
        job.invalidate(); setRange('');
        void intake.run(async signal => {
          const file = files[0], doc = await readPdf(file);
          abort(signal);
          setRange(formatPages(doc.getPageIndices()));
          return { file, doc };
        });
      }} />
    {source && <>
      <div className={s.summary}><strong className={s.filename}>{source.file.name}</strong><span className={s.note}>{tr(locale, `${count} 页`, `${count} pages`)} · {(source.file.size / 1024).toFixed(1)} KB</span></div>
      <div className={s.selectionBar}>
        <div className={s.range}><TextField label={tr(locale, '页码范围', 'Page range')} hint={tr(locale, '例如：1-3 表示第 1 至第 3 页；1,3,5 表示第 1、3、5 页。', 'For example, 1-3 selects pages 1 through 3; 1,3,5 selects individual pages.')} value={range} onChange={changeRange} error={rangeError} /></div>
        <div className={s.choices}><Button size="sm" className={s.choice} onClick={() => changeRange(formatPages(source.doc.getPageIndices()))}>{tr(locale, '全选', 'Select all')}</Button><Button size="sm" className={s.choice} onClick={() => changeRange('')}>{tr(locale, '清空选择', 'Clear selection')}</Button></div>
      </div>
      <PdfPages file={source.file} count={count} pages={pages} valid={!rangeError} onToggle={index => changeRange(togglePage(range, count, index))} locale={locale} />
      <div className={s.output}>
        <div className={s.choices} role="group" aria-label={tr(locale, '输出模式', 'Output mode')}>
          {(['pdf', 'zip'] as const).map(value => <Button key={value} size="sm" className={[s.choice, kind === value && s.selectedChoice].filter(Boolean).join(' ')} aria-pressed={kind === value} onClick={() => { job.invalidate(); setKind(value); }}>{value === 'pdf' ? tr(locale, '单个 PDF', 'Single PDF') : tr(locale, '逐页 ZIP', 'Per-page ZIP')}</Button>)}
        </div>
        <p className={s.note} role="status">{kind === 'pdf' ? tr(locale, `提取 ${pages.length} 页为单个 PDF`, `Extract ${pages.length} pages into one PDF`) : tr(locale, `ZIP 包含 ${pages.length} 个独立 PDF`, `ZIP with ${pages.length} individual PDFs`)}</p>
      </div>
    </>}
    <ErrorText error={intake.error || job.error || limitError} />
    <div className={s.actions} data-pdf-split-actions>
      <Button variant="primary" className={s.action} loading={job.busy || intake.busy} disabled={!source || !!rangeError || !!limitError} onClick={() => {
        if (!source || rangeError || limitError) return;
        const indices = [...pages];
        void job.run(async signal => ({ blob: await createOutput(source.doc, indices, kind, signal), kind }));
      }}>{kind === 'pdf' ? tr(locale, '提取 PDF', 'Extract') : tr(locale, '生成 ZIP', 'Create ZIP')}</Button>
      <Button className={[s.action, s.secondary].join(' ')} disabled={job.busy || intake.busy || !job.result} onClick={() => { if (job.result && !job.busy) saveBlob(job.result.blob, job.result.kind === 'pdf' ? 'split.pdf' : 'split-pages.zip'); }}>{tr(locale, '下载', 'Download')}</Button>
      <Button className={[s.action, s.secondary].join(' ')} onClick={reset}>{tr(locale, '清空', 'Clear')}</Button>
    </div>
  </Frame>;
}
