import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import { imagePreviewMessages } from '../image/preview-messages';
import { tokens } from '../../styles/tokens.stylex';
import { MetadataSession, type MetadataState } from './session';
import { fieldNames } from './read-metadata';
import type { ToolProps } from '../types';
import notice from './exifr.NOTICE.txt?url';

const messages = {
  zh: {title: '图片信息', pick: '选择图片或拖放到这里', details: '支持格式与限制', limits: 'JPEG / PNG / WebP。仅展示可可靠解析的 EXIF 字段；GPS 等信息标记为隐私。清理不重新编码，保留必要方向与受支持色彩信息，不保证清除所有隐藏信息。', clear: '清空', clean: '清理元数据', download: '下载清理后的图片', preview: '预览与对比', busy: '正在处理…', inputError: '无法读取此图片。请选择受支持的静态 JPEG、PNG 或 WebP，检查文件大小与分辨率。', cleanError: '无法安全无损清理这张图片，未生成替代文件。请尝试其他图片。', timeout: '处理超时，请重试或选择较小的图片。', empty: '添加图片，查看其中的元数据。', noFields: '未发现可展示的 EXIF 字段。', partial: '部分元数据结构未解析；下方仅展示可靠读取的字段。', private: '隐私', field: '字段', before: '清理前', after: '清理后', removed: '已移除', unchanged: '未发现需要清理的已知元数据。', done: '已无损清理并验证图片。', size: '文件大小', dimensions: '像素尺寸', format: '格式', blocks: '检测到的元数据块', none: '无', imageError: '图片预览无法加载。'},
  en: {title: 'Image information', pick: 'Choose an image or drop it here', details: 'Supported formats & limits', limits: 'JPEG / PNG / WebP. Only reliably parsed EXIF fields are shown; GPS and related private fields are marked. Cleaning does not re-encode pixels and retains necessary orientation and supported color data. It cannot guarantee removal of all hidden information.', clear: 'Clear', clean: 'Remove metadata', download: 'Download cleaned image', preview: 'Preview and compare', busy: 'Processing…', inputError: 'This image could not be read. Choose a supported static JPEG, PNG or WebP within the file and resolution limits.', cleanError: 'This image could not be safely cleaned without re-encoding. No substitute file was generated. Try another image.', timeout: 'Processing timed out. Try again or choose a smaller image.', empty: 'Add an image to inspect its metadata.', noFields: 'No displayable EXIF fields were found.', partial: 'Some metadata structures were not parsed. Only reliably read fields are shown below.', private: 'Private', field: 'Field', before: 'Before', after: 'After', removed: 'Removed', unchanged: 'No known metadata requiring cleanup was found.', done: 'The image was losslessly cleaned and verified.', size: 'File size', dimensions: 'Pixel dimensions', format: 'Format', blocks: 'Detected metadata blocks', none: 'None', imageError: 'The image preview could not load.'},
};
export default function ExifMetadata({locale}: ToolProps) {
  const t = messages[locale], [owner, setOwner] = useState<MetadataSession>(), [view, setView] = useState<MetadataState>({busy: false});
  const [open, setOpen] = useState(false), [imageError, setImageError] = useState(false), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { const session = new MetadataSession(); setOwner(session); const off = session.subscribe(() => setView(session.snapshot())); return () => { off(); session.dispose(); }; }, []);
  useEffect(() => { setOpen(false); setImageError(false); }, [view.source]);
  const labels = {parameters: t.title, close: t.clear, showParameters: t.title, hideParameters: t.title, showTools: t.title, hideTools: t.title, main: t.title, toolbar: t.title};
  const source = view.source, output = view.output;
  return <WorkbenchShell mode="form" formWidth="wide" labels={labels}>
    <link rel="license" href={notice}/>
    <div data-exif-metadata {...stylex.props(s.stack)}>
      <FileDropzone label={t.pick} disabled={!owner} accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" maxFiles={1} maxSizeBytes={owner?.limits.bytes} issueMessages={{type: t.inputError, count: t.inputError, size: t.inputError}} onFilesReceived={files => { if (files[0]) owner?.import(files[0]); }}/>
      <details {...stylex.props(s.muted)}><summary>{t.details}</summary><p>{t.limits}</p>{owner && <p>≤ {owner.limits.bytes / 1024 ** 2} MiB · {owner.limits.pixels / 1e6} MP · {owner.limits.edge}px</p>}</details>
      {view.busy && <p role="status">{t.busy}</p>}
      {view.error && <p role="alert" {...stylex.props(s.error)}>{view.error === 'input' ? t.inputError : view.error === 'clean' ? t.cleanError : t.timeout}</p>}
      {!source && !view.busy && <p {...stylex.props(s.muted)}>{t.empty}</p>}
      {source && <>
        <div {...stylex.props(s.actions)}>
          <Button variant="ghost" xstyle={s.accent} disabled={view.busy} onClick={() => owner?.clean()}>{t.clean}</Button>
          {output && <Button variant="ghost" xstyle={s.accent} onClick={() => owner?.download()}>{t.download}</Button>}
          <Button ref={trigger} variant="ghost" xstyle={s.secondary} onClick={() => setOpen(true)}>{t.preview}</Button>
          <Button variant="ghost" xstyle={s.secondary} onClick={() => owner?.clear()}>{t.clear}</Button>
        </div>
        <p {...stylex.props(s.filename)}>{source.file.name}</p>
        {output && <p role="status">{output.changed ? t.done : t.unchanged}</p>}
        {view.before?.partial && <p {...stylex.props(s.muted)}>{t.partial}</p>}
        <div {...stylex.props(s.tableScroll)}><table {...stylex.props(s.table)}><thead><tr><th>{t.field}</th><th>{t.before}</th>{output && <th>{t.after}</th>}</tr></thead><tbody>
          <tr><th>{t.format}</th><td>{source.info.format.toUpperCase()}</td>{output && <td>{source.info.format.toUpperCase()}</td>}</tr>
          <tr><th>{t.dimensions}</th><td>{source.width} × {source.height}</td>{output && <td>{source.width} × {source.height}</td>}</tr>
          <tr><th>{t.size}</th><td>{source.blob.size.toLocaleString(locale)} B</td>{output && <td>{output.blob.size.toLocaleString(locale)} B</td>}</tr>
          <tr><th>{t.blocks}</th><td>{view.before?.blocks.join(', ') || t.none}</td>{output && <td>{output.after.blocks.join(', ') || t.none}</td>}</tr>
          {view.before?.fields.map(field => <tr key={field.key}><th>{fieldNames[field.key][locale === 'zh' ? 0 : 1]} {field.private && <span {...stylex.props(s.private)}>{t.private}</span>}</th><td>{field.value}</td>{output && <td>{output.after.fields.find(item => item.key === field.key)?.value ?? t.removed}</td>}</tr>)}
        </tbody></table></div>
        {!view.before?.fields.length && <p {...stylex.props(s.muted)}>{t.noFields}</p>}
        {imageError && <p role="alert" {...stylex.props(s.error)}>{t.imageError}</p>}
        <ImageComparisonDialog open={open} onOpenChange={setOpen} name={source.file.name} source={{url: view.sourceUrl, width: source.width, height: source.height, format: source.info.format, onError: () => setImageError(true)}} output={output ? {url: output.url, width: source.width, height: source.height, format: source.info.format, onError: () => setImageError(true)} : undefined} labels={imagePreviewMessages[locale]} finalFocus={() => trigger.current}/>
      </>}
    </div>
  </WorkbenchShell>;
}
const s = stylex.create({
  stack: {display: 'grid', gap: 16, minWidth: 0}, actions: {display: 'flex', gap: 8, flexWrap: 'wrap'},
  muted: {color: tokens.textSecondary, fontSize: 13, lineHeight: 1.7}, error: {color: tokens.danger},
  filename: {margin: 0, overflowWrap: 'anywhere', fontWeight: 600},
  secondary: {borderWidth: 0, backgroundColor: {default: tokens.surfacePanel, ':hover': tokens.surfaceHover}, color: tokens.textPrimary},
  accent: {borderWidth: 0, backgroundColor: {default: tokens.communityAction, ':hover': tokens.communityActionHover}, color: tokens.onCommunityAction},
  tableScroll: {overflowX: 'auto', minWidth: 0}, table: {width: '100%', textAlign: 'start', fontSize: 14, borderCollapse: 'collapse', lineHeight: 1.8, overflowWrap: 'anywhere'},
  private: {fontWeight: 400, fontSize: 12, color: tokens.danger},
});
