import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { CopyIcon, DownloadSimpleIcon, FolderOpenIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { TextEditorPane } from '../../ui/text-editor/TextEditorPane';
import { TextWorkbench } from '../../ui/text-editor/TextWorkbench';
import { Tooltip } from '../../ui/Tooltip';
import { ErrorText, Frame, saveBlob, tr } from '../general/ui';
import { jsonLanguage, jsonLanguageNotice as languageNotice } from '../json-formatter/json-language';
import type { ToolProps } from '../types';
import { ConversionControls, Segments } from './controls';
import { createDownloadNamer } from './delivery';
import { TablePreview } from './TablePreview';
import { csvDefaults, csvSample, jsonDefaults, jsonSample, previewText, type Conversion, type Direction, type Source } from './settings';
import { useConversion } from './use-conversion';
import papaNotice from './papaparse.NOTICE.txt?url';
import s from './tabular.module.scss';

type Draft = { source: Source; name?: string };
const samples = { 'csv-json': csvSample, 'json-csv': jsonSample };
const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');

function IconAction({ label, icon, onClick, disabled }: {
  label: string; icon: ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return <Tooltip content={label} borderless>
    <IconButton size="sm" variant="ghost" label={label} disabled={disabled} onClick={onClick} className={s.icon}>{icon}</IconButton>
  </Tooltip>;
}

export default function CsvJsonConverter({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [direction, setDirection] = useState<Direction>('csv-json');
  const [drafts, setDrafts] = useState<Record<Direction, Draft>>({
    'csv-json': { source: csvSample }, 'json-csv': { source: jsonSample },
  });
  const [csv, setCsv] = useState(csvDefaults);
  const [json, setJson] = useState(jsonDefaults);
  const [view, setView] = useState<'source' | 'table'>('source');
  const [downloadName] = useState(createDownloadNamer);
  const [fileError, setFileError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [clipboard, setClipboard] = useState<{ token: object; message: string }>();
  const fileField = useRef<HTMLInputElement>(null);
  const draft = drafts[direction];
  const conversion = useMemo<Conversion>(() => direction === 'csv-json'
    ? { direction, settings: csv } : { direction, settings: json }, [direction, csv, json]);
  const job = useConversion(draft.source, conversion);
  const result = job.finished?.result;
  const input = useMemo(() => typeof draft.source === 'string' ? previewText(draft.source)
    : job.input ?? { text: '', partial: true }, [draft.source, job.input]);
  const sourceExists = typeof draft.source !== 'string' || !!draft.source;
  const csvInput = direction === 'csv-json';
  const inputLabel = csvInput ? t('CSV 输入', 'CSV input') : t('JSON 输入', 'JSON input');
  const outputType = csvInput ? 'JSON' : result?.delimiter === '\t' || json.delimiter === '\t' ? 'TSV' : 'CSV';
  const outputLabel = t(outputType + ' 结果', outputType + ' result');
  const importLabel = t('导入文件', 'Import file');
  const downloadLabel = t('下载 ', 'Download ') + outputType;
  const inputLines = useMemo(() => input.text ? input.text.split(/\r\n|[\r\n]/).length : 0, [input.text]);

  function replace(mode: Direction, next: Draft) {
    setDrafts(previous => ({ ...previous, [mode]: next }));
    setFileError(undefined);
    setClipboard(undefined);
  }

  function importFiles(files: File[]) {
    if (files.length !== 1) {
      setFileError(t('请一次导入一个文件。', 'Import one file at a time.'));
      return;
    }
    const file = files[0];
    const ext = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase();
    if (ext !== 'csv' && ext !== 'tsv' && ext !== 'json') {
      setFileError(t('请选择 .csv、.tsv 或 .json 文件。', 'Choose a .csv, .tsv or .json file.'));
      return;
    }
    const next = ext === 'json' ? 'json-csv' : 'csv-json';
    if (next === 'csv-json') setCsv(previous => ({ ...previous, delimiter: ext === 'tsv' ? '\t' : 'auto' }));
    replace(next, { source: file, name: file.name });
    setDirection(next);
  }

  async function copy(text: string, token: object) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setClipboard({ token, message: t('已复制', 'Copied') });
    } catch {
      setClipboard({ token, message: t('无法写入剪贴板。', 'Could not write to the clipboard.') });
    }
  }

  const download = () => {
    if (!result) return;
    saveBlob(result.blob, downloadName(draft.name ?? '', outputType));
  };

  const delimiterName = result && {
    ',': t('逗号', 'Comma'), ';': t('分号', 'Semicolon'), '\t': 'Tab', '|': t('竖线', 'Pipe'),
  }[result.delimiter];
  const status = job.error ? t('转换失败', 'Conversion failed')
    : job.stopped ? t('任务已取消', 'Conversion cancelled')
    : job.busy ? t('正在转换… ', 'Converting… ') + job.percent + '%'
    : result ? t('转换完成', 'Converted') : t('等待输入', 'Waiting for input');

  return <Frame locale={locale}>
    <div className={s.workspace} data-csv-json-converter data-csv-license={papaNotice} data-json-language-license={languageNotice}>
      <TextWorkbench toolbar={<ConversionControls locale={locale} direction={direction} csv={csv} json={json}
        onDirection={next => { setDirection(next); setFileError(undefined); setClipboard(undefined); }}
        setCsv={values => setCsv(previous => ({ ...previous, ...values }))}
        setJson={values => setJson(previous => ({ ...previous, ...values }))} />}>
        <TextEditorPane title={inputLabel} actions={<>
          <input ref={fileField} type="file" hidden accept=".csv,.tsv,.json" aria-label={importLabel} onChange={event => {
            if (event.currentTarget.files?.length) importFiles(Array.from(event.currentTarget.files));
            event.currentTarget.value = '';
          }} />
          <Button size="sm" variant="ghost" className={s.surfaceButton} aria-label={importLabel} onClick={() => fileField.current?.click()}>
            <FolderOpenIcon size={16} aria-hidden="true" /><span className={s.actionName}>{importLabel}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => replace(direction, { source: samples[direction] })}>{t('示例', 'Sample')}</Button>
          <IconAction label={t('清空输入', 'Clear input')} icon={<TrashIcon size={16} aria-hidden="true" />}
            disabled={!sourceExists} onClick={() => replace(direction, { source: '' })} />
          <IconAction label={t('复制输入', 'Copy input')} icon={<CopyIcon size={16} aria-hidden="true" />}
            disabled={input.partial || !input.text} onClick={() => void copy(input.text, draft)} />
        </>} status={<>
          <div className={s.footer}>
            <span>{(result?.inputLines ?? inputLines) + t(' 行', ' lines')}{result && ' · ' + result.columns + t(' 列', ' columns')}</span>
            <span>{delimiterName && csvInput && t('分隔符 ', 'Delimiter ') + delimiterName + ' · '}UTF-8</span>
          </div>
          {draft.name && <div className={s.filename} title={draft.name}>{draft.name}</div>}
          {input.partial && input.text && <div>{t('局部源码预览，转换使用完整输入。', 'Partial source preview. Conversion uses the full input.')}</div>}
          {clipboard?.token === draft && <span role="status">{clipboard.message}</span>}
          <ErrorText error={fileError} />
        </>}>
          <div className={s.dropArea} data-dragging={dragging || undefined}
            onDragEnterCapture={event => { if (hasFiles(event)) { event.preventDefault(); setDragging(true); } }}
            onDragOverCapture={event => { if (hasFiles(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
            onDropCapture={event => {
              if (!hasFiles(event)) return;
              event.preventDefault();
              event.stopPropagation();
              setDragging(false);
              importFiles(Array.from(event.dataTransfer.files));
            }}>
            <TextEditor key={direction} value={input.text} ariaLabel={inputLabel} preserveCarriageReturns lineWrapping={false}
              readOnly={input.partial} extensions={csvInput ? undefined : jsonLanguage}
              placeholder={t('输入、粘贴或拖入文件', 'Type, paste or drop a file')}
              onChange={text => replace(direction, { source: text, name: draft.name })} />
          </div>
        </TextEditorPane>
        <TextEditorPane title={outputLabel} actions={<>
          <Segments label={t('结果视图', 'Result view')} value={view} onChange={setView}
            choices={[[ 'source', t('源码', 'Source') ], ['table', t('表格', 'Table')]]} />
          <IconAction label={t('复制结果', 'Copy result')} icon={<CopyIcon size={16} aria-hidden="true" />}
            disabled={!result?.preview.text || result.preview.partial} onClick={() => result && void copy(result.preview.text, result)} />
          <Button size="sm" variant="primary" disabled={!result} aria-label={downloadLabel} onClick={download}>
            <DownloadSimpleIcon size={16} aria-hidden="true" /><span className={s.actionName}>{downloadLabel}</span>
          </Button>
        </>} status={<>
          <div className={s.footer}>
            <span>{result && t(
              result.records + ' 条 · ' + result.columns + ' 列 · ' + (result.records * result.columns) + ' 单元格',
              result.records + ' records · ' + result.columns + ' columns · ' + (result.records * result.columns) + ' cells',
            )}</span>
            <span className={result ? s.success : undefined} role="status">{status}</span>
          </div>

          {result?.preview.partial && <div>{t('结果仅预览。下载可获取完整文件。', 'Partial result preview. Download the complete file.')}</div>}
          {job.busy && <Button size="sm" variant="ghost" className={s.task} onClick={job.cancel}>{t('取消转换', 'Cancel conversion')}</Button>}
          {job.stopped && <Button size="sm" variant="ghost" className={s.task} onClick={job.retry}>{t('重新转换', 'Convert again')}</Button>}
          {result && clipboard?.token === result && <span role="status">{clipboard.message}</span>}
          <ErrorText error={job.error && t(job.error.zh, job.error.en)} />
        </>}>
          {view === 'source' ? <TextEditor value={result?.preview.text ?? ''} ariaLabel={outputLabel}
            readOnly lineWrapping={false} preserveCarriageReturns extensions={csvInput ? jsonLanguage : undefined} />
            : result && job.finished ? <TablePreview worker={job.finished.worker} result={result} locale={locale} />
              : <p className={s.empty}>{t('转换完成后会显示表格。', 'The table appears after conversion.')}</p>}
        </TextEditorPane>
      </TextWorkbench>
    </div>
  </Frame>;
}
