import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import { Frame, ErrorText, saveBlob, tr } from '../general/ui';
import { useJob } from '../general/use-job';
import { pdfDownloadName } from '../general/pdf-download-name';
import { ImagesPdfCollection } from './collection';
import { ImageGallery } from './ImageGallery';
import { heavyImages } from './policy';
import notice from '../comic-page-organizer/pdf-lib.NOTICE.txt?url';
import s from './images.module.scss';

export default function ImagesToPdf({locale}: ToolProps) {
  const [collection] = useState(() => new ImagesPdfCollection());
  const view = useSyncExternalStore(collection.subscribe, collection.snapshot, collection.snapshot);
  const job = useJob<Blob>(locale), [progress, setProgress] = useState(0);
  const trigger = useRef<HTMLButtonElement | null>(null), alive = useRef(true);
  useEffect(() => {alive.current = true; return () => {alive.current = false; collection.dispose();};}, [collection]);
  const change = (work: () => void) => {job.invalidate(); setProgress(0); work();};
  const pending = view.pages.some(p => p.status === 'checking'), invalid = view.pages.some(p => p.status === 'error');
  const preview = view.preview, page = view.pages.find(p => p.id === preview?.id);
  const labels = {
    fit: tr(locale, '适应画面', 'Fit to view'), actual: tr(locale, '原始像素', 'Original pixels'),
    zoomIn: tr(locale, '放大', 'Zoom in'), zoomOut: tr(locale, '缩小', 'Zoom out'), reset: tr(locale, '重置视图', 'Reset view'),
    viewport: tr(locale, '图片预览', 'Image preview'), instructions: tr(locale, '滚轮或双指缩放，拖动平移。', 'Scroll or pinch to zoom, and drag to pan.'),
    loading: tr(locale, '正在加载图片…', 'Loading image…'), error: tr(locale, '图片无法解码或超出浏览器能力。', 'The image could not be decoded or exceeds browser capacity.'),
  };
  return <Frame locale={locale}>
    <span hidden data-pdf-license={notice} />
    <div className={s.toolbar}><p className={s.note} role="status">{tr(locale, `${view.pages.length} 张图片`, `${view.pages.length} images`)}</p></div>
    <FileDropzone label={view.pages.length ? tr(locale, '继续添加图片', 'Add more images') : tr(locale, '选择图片或拖放到这里', 'Choose images or drop them here')} appearance={view.pages.length ? 'compact' : 'expanded'} multiple accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={job.busy}
      issueMessages={{type: tr(locale, '仅支持 PNG / JPEG', 'PNG / JPEG only'), size: '', count: ''}} onFilesReceived={files => change(() => collection.add(files))} />
    {!!view.pages.length && <ImageGallery pages={view.pages} locale={locale} disabled={job.busy}
      onMove={(id, target) => change(() => collection.move(id, target))} onRemove={id => change(() => collection.remove(id))}
      onVisible={collection.setVisible} onPreview={(id, element) => {trigger.current = element; collection.openPreview(id);}} />}
    {invalid && <p role="alert" className={s.note}>{tr(locale, '有图片无法读取，请查看对应图片提示并移除后重试。', 'Some images could not be read. Check their messages and remove them before retrying.')}</p>}
    {heavyImages(view.pages) && <p className={s.note}>{tr(locale, '文件较多或分辨率较高，生成 PDF 可能需要更多时间和内存。建议保持页面打开，处理期间不要关闭浏览器。', 'Large images or batches may require more time and memory. Keep this page open while the PDF is being created.')}</p>}
    <ErrorText error={job.error} />
    {job.busy && <div className={s.progress}><p role="status" className={s.note}>{tr(locale, `正在生成 ${progress} / ${view.pages.length} 页…`, `Creating ${progress} / ${view.pages.length} pages…`)}</p><Button size="sm" variant="ghost" onClick={() => {job.invalidate();}}>{tr(locale, '取消生成', 'Cancel')}</Button></div>}
    <div className={s.actions} data-images-pdf-actions>
      <Button className={s.action} variant="primary" loading={job.busy} disabled={!view.pages.length || pending || invalid || job.busy} onClick={() => {
        collection.closePreview(); setProgress(0);
        const sources = view.pages.map(p => p.source!);
        void job.run(signal => collection.exclusive('pdf', signal, async () => {
          const {imagesPdf} = await import('./output');
          return imagesPdf(sources, collection.resources, signal, count => {if (alive.current && !signal.aborted) setProgress(count);});
        }));
      }}>{tr(locale, '生成 PDF', 'Create PDF')}</Button>
      <Button className={`${s.action} ${s.secondary}`} disabled={!job.result || job.busy} onClick={() => {if (job.result && !job.busy) saveBlob(job.result, pdfDownloadName('images'));}}>{tr(locale, '下载 PDF', 'Download')}</Button>
      <Button className={`${s.action} ${s.secondary}`} onClick={() => change(() => collection.clear())}>{tr(locale, '清空', 'Clear')}</Button>
    </div>
    <FilePreviewDialog open={!!preview} onOpenChange={open => {if (!open) collection.closePreview();}} title={page?.file.name ?? labels.viewport} finalFocus={() => trigger.current} labels={{close: tr(locale, '关闭', 'Close'), maximize: tr(locale, '全屏', 'Fullscreen'), restore: tr(locale, '还原', 'Restore')}}>
      <div className={s.preview}>{preview?.url ? <ImagePreviewViewport src={preview.url} width={preview.source.width} height={preview.source.height} alt={page?.file.name ?? ''} labels={labels} onError={() => {}} /> : <p className={s.feedback} role={preview?.error ? 'alert' : 'status'}>{preview?.error ? labels.error : labels.loading}</p>}</div>
    </FilePreviewDialog>
  </Frame>;
}
