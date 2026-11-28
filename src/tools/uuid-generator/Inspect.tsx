import { useId, useMemo, useRef, useState } from 'react';
import { CaretRightIcon, ClipboardTextIcon, DownloadSimpleIcon, FolderOpenIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextField';
import { ErrorText, errorText, saveBlob } from '../general/ui';
import type { ToolProps } from '../types';
import { Choices, formatOptions, PageControls, UuidCopy, visibleRows, type Translate } from './controls';
import { decodeUuid, formatUuid, type InputFormat, type Representation } from './core';
import { createUuidNamer, mime, readUuidFile, serializeReport } from './delivery';
import { inspectBatch, inspectUuid, isValidUuid, uuidFields, variants, type Inspection } from './inspection';
import s from './workbench.module.scss';

type Props = { locale: ToolProps['locale']; t: Translate; namer: ReturnType<typeof createUuidNamer> };
const noValue = '—';
const fieldLabel: Record<string, [string, string]> = {
  'time-low': ['时间低位', 'Time low'], 'time-mid': ['时间中位', 'Time mid'], 'time-high': ['时间高位', 'Time high'],
  'time-big': ['时间高位', 'Time high'], 'time-small': ['时间低位', 'Time low'], unix: ['Unix 毫秒', 'Unix milliseconds'],
  version: ['版本', 'Version'], variant: ['变体', 'Variant'], clock: ['时钟序列', 'Clock sequence'], node: ['节点标识', 'Node'],
  'random-a': ['随机数据 A', 'Random A'], 'random-b': ['随机数据 B', 'Random B'], 'random-c': ['随机数据 C', 'Random C'],
  'rand-a': ['rand_a', 'rand_a'], 'rand-b': ['rand_b', 'rand_b'], data: ['数据', 'Data'], nil: ['全零', 'All zeros'], max: ['全一', 'All ones'],
};

function diagnosis(value: Inspection, t: Translate) {
  const label = {
    'invalid-encoding': t('字符、长度或编码不合法', 'Invalid characters, length or encoding'),
    nil: t('有效特殊值 Nil', 'Valid Nil value'),
    max: t('有效特殊值 Max', 'Valid Max value'),
    'other-variant': t('可解析的 128 位值，使用其他变体', 'Decodable 128-bit value with another variant'),
    dce: t('识别为 v2（DCE Security）', 'Recognized as v2 (DCE Security)'),
    'unknown-version': t('可解析的 128 位值，使用未知版本', 'Decodable 128-bit value with an unknown version'),
    valid: t('有效的 UUIDv' + value.version, 'Valid UUIDv' + value.version),
  };
  return label[value.status];
}

const encodingOptions = (t: Translate) => [
  { value: 'auto', label: t('自动识别十六进制文本', 'Auto-detect hexadecimal text') },
  { value: 'base64', label: 'Base64' }, { value: 'base64url', label: 'Base64URL' },
];

export default function Inspect(props: Props) {
  const { t } = props;
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  return <section className={s.inspect} aria-label={t('验证与解析', 'Validate & Inspect')}>
    <Choices label={t('验证模式', 'Validation mode')} value={mode} onChange={setMode}
      items={[{ value: 'single', label: t('单个验证', 'Single') }, { value: 'batch', label: t('批量验证', 'Batch') }]} />
    <div hidden={mode !== 'single'}><Single {...props} /></div>
    <div hidden={mode !== 'batch'}><Batch {...props} /></div>
  </section>;
}

function Single({ locale, t }: Props) {
  const inputId = useId();
  const revision = useRef(0);
  const [source, setSource] = useState('');
  const [inputFormat, setInputFormat] = useState<InputFormat>('auto');
  const [format, setFormat] = useState<Representation>('standard');
  const [structure, setStructure] = useState(false);
  const [error, setError] = useState<string>();
  const bytes = useMemo(() => decodeUuid(source, inputFormat), [source, inputFormat]);
  const parsed = useMemo(() => inspectUuid(bytes), [bytes]);
  async function paste() {
    const task = ++revision.current;
    try {
      const value = await navigator.clipboard.readText();
      if (task === revision.current) {
        setSource(value);
        setError(undefined);
      }
    } catch {
      if (task === revision.current)
        setError(t('无法访问剪贴板，请手动粘贴。', 'Clipboard access failed. Paste directly into the field.'));
    }
  }
  return <>
    <div className={s.inspectInput}>
      <div className={s.inputField}>
        <label htmlFor={inputId}>{t('输入 UUID', 'Enter a UUID')}</label>
        <div className={s.pasteField}>
          <input id={inputId} value={source} autoComplete="off" spellCheck={false} aria-invalid={!!source && !bytes}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            onChange={event => { revision.current++; setSource(event.target.value); setError(undefined); }} />
          <Button variant="ghost" size="sm" onClick={() => void paste()}><ClipboardTextIcon aria-hidden="true" />{t('粘贴', 'Paste')}</Button>
        </div>
      </div>
      <SelectField label={t('输入格式', 'Input format')} value={inputFormat} options={encodingOptions(t)}
        onValueChange={value => value && setInputFormat(value as InputFormat)} />
    </div>
    <ErrorText error={error} />
    {source && <p className={s.validation} role="status" data-valid={isValidUuid(parsed)}><i aria-hidden="true" />{diagnosis(parsed, t)}</p>}
    {bytes && <>
      <dl className={s.details}>
        <div><dt>{t('版本', 'Version')}</dt><dd>{parsed.version === null ? noValue : 'v' + parsed.version}</dd></div>
        <div><dt>{t('变体', 'Variant')}</dt><dd>{parsed.variant ? variants[parsed.variant] : noValue}</dd></div>
        <div><dt>{t('标准 UUID', 'Standard UUID')}</dt><dd><code>{parsed.normalized}</code></dd></div>
        {parsed.time && <>
          <div><dt>{t('内嵌时间戳 (UTC)', 'Embedded timestamp (UTC)')}</dt><dd><code>{parsed.time.utc ?? noValue}</code></dd></div>
          <div><dt>{t('本地时间', 'Local time')}</dt><dd>{parsed.time.utc ? new Date(parsed.time.utc).toLocaleString(locale, {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
            fractionalSecondDigits: 3, timeZoneName: 'short',
          }) : noValue}</dd></div>
          {parsed.time.unit === 'gregorian-100ns' && <div><dt>{t('Gregorian 原始值 (100 ns)', 'Raw Gregorian ticks (100 ns)')}</dt><dd><code>{parsed.time.ticks}</code></dd></div>}
          <div><dt>{t('Unix 毫秒值', 'Unix milliseconds')}</dt><dd><code>{parsed.time.unixMs}</code></dd></div>
        </>}
      </dl>
      {parsed.time && <p className={s.muted}>{t('时间来自 UUID 的内嵌字段，无法证明实际创建时间。', 'The timestamp comes from the UUID field. It cannot establish when the UUID was created.')}</p>}
      <div className={s.convert}>
        <SelectField label={t('转换格式', 'Convert format')} value={format} options={formatOptions(t)}
          onValueChange={value => value && setFormat(value as Representation)} />
        {format !== 'standard' && <>
          <code data-uuid-converted>{formatUuid(bytes, format)}</code>
          <UuidCopy icon value={formatUuid(bytes, format)} label={t('复制转换结果', 'Copy converted UUID')} t={t} />
        </>}
        <UuidCopy value={parsed.normalized!} label={t('复制标准 UUID', 'Copy standard UUID')} t={t} />
      </div>
      <Button className={s.structureToggle} variant="ghost" size="sm" aria-expanded={structure}
        onClick={() => setStructure(value => !value)}>{t('查看 UUID 结构', 'View UUID structure')}<CaretRightIcon aria-hidden="true" /></Button>
      {structure && <Structure bytes={bytes} parsed={parsed} t={t} />}
    </>}
  </>;
}

function Structure({ bytes, parsed, t }: { bytes: Uint8Array; parsed: Inspection; t: Translate }) {
  const fields = uuidFields(bytes, parsed);
  return <section className={s.structure} aria-label={t('128 位 UUID 结构', '128-bit UUID structure')} data-uuid-structure>
    <div className={s.bitScale} aria-hidden="true">{[0, 32, 64, 96, 128].map(bit => <span key={bit}>{bit}</span>)}</div>
    <div className={s.bitBar} aria-hidden="true">
      {fields.map(field => <span key={field.start} data-field={field.name} style={{ flexGrow: field.width, flexBasis: 0 }} />)}
    </div>
    <ol>
      {fields.map(field => <li key={field.start} data-field={field.name}>
        <span className={s.fieldSwatch} aria-hidden="true" />
        <strong>{t(...fieldLabel[field.name])}</strong><span className={s.muted}>{field.start}–{field.start + field.width - 1}</span>
        <code>{field.bits}</code>
      </li>)}
    </ol>
    {parsed.version === 7 && <p className={s.muted}>{t('rand_a 和 rand_b 可能包含随机值、计数或亚毫秒信息。', 'rand_a and rand_b may contain random data, counters or sub-millisecond information.')}</p>}
  </section>;
}

function Batch({ locale, t, namer }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const [reading, setReading] = useState(false);
  const [source, setSource] = useState('');
  const [format, setFormat] = useState<InputFormat>('auto');
  const [report, setReport] = useState<Awaited<ReturnType<typeof inspectBatch>>>();
  const [page, setPage] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  function invalidate() {
    revision.current++;
    setReport(undefined);
    setError(undefined);
  }
  async function importFile(selected: File) {
    invalidate();
    const task = revision.current;
    setReading(true);
    try {
      const value = await readUuidFile(selected);
      if (task === revision.current) setSource(value);
    } catch (cause) {
      if (task === revision.current) setError(errorText(cause, locale));
    } finally {
      setReading(false);
    }
  }
  async function run() {
    const task = ++revision.current;
    setWorking(true);
    setError(undefined);
    try {
      const next = await inspectBatch(source, format);
      if (task === revision.current) {
        setPage(0);
        setReport(next);
      }
    } catch (cause) {
      if (task === revision.current) setError(errorText(cause, locale));
    } finally {
      setWorking(false);
    }
  }
  function download(output: 'json' | 'csv') {
    try {
      if (report) saveBlob(new Blob([serializeReport(report.rows, output)], { type: mime[output] }), namer('uuid-validation', output));
      setError(undefined);
    } catch (cause) {
      setError(errorText(cause, locale));
    }
  }
  return <>
    <TextAreaField label={t('UUID 列表（每行一个）', 'UUIDs (one per line)')} value={source} rows={5} spellCheck={false}
      onChange={value => { invalidate(); setSource(value); }} className={s.bulkInput} />
    <div className={s.batchActions}>
      <SelectField label={t('输入格式', 'Input format')} value={format} options={encodingOptions(t)}
        onValueChange={value => { if (value) { invalidate(); setFormat(value as InputFormat); } }} />
      <div className={s.actions}>
        <input ref={file} type="file" hidden accept="text/plain,.txt" onChange={event => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (selected) void importFile(selected);
        }} />
        <Button disabled={working} loading={reading} onClick={() => file.current?.click()}><FolderOpenIcon aria-hidden="true" />{t('导入文本', 'Import text')}</Button>
        <Button disabled={!source || reading} loading={working} variant="primary" onClick={() => void run()}>{t('验证全部', 'Validate all')}</Button>
      </div>
    </div>
    <ErrorText error={error} />
    {report && <>
      <div className={s.stats} role="status" data-uuid-report>
        <span>{t('总数', 'Total')} <strong>{report.rows.length}</strong></span>
        <span>{t('有效', 'Valid')} <strong>{report.valid}</strong></span>
        <span>{t('无效', 'Invalid')} <strong>{report.invalid}</strong></span>
        <span>{t('重复', 'Duplicates')} <strong>{report.duplicates}</strong></span>
      </div>
      <p className={s.muted}>{t('版本分布', 'Version distribution')} {Array.from(report.distribution, ([key, value]) => {
        const statuses: Record<string, string> = { nil: 'Nil', max: 'Max', 'other-variant': t('其他变体', 'Other variant'), 'invalid-encoding': t('编码无效', 'Invalid encoding') };
        return (statuses[key] ?? key) + ' × ' + value;
      }).join(' · ')}</p>
      <div className={s.reportScroll} role="region" aria-label={t('逐行验证结果', 'Validation results by line')} tabIndex={0}>
        <table className={s.report}>
          <thead><tr>{[t('行', 'Line'), t('原始输入', 'Original input'), t('状态', 'Status'), t('版本', 'Version'),
            t('变体', 'Variant'), 'UTC'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{report.rows.slice(page * visibleRows, (page + 1) * visibleRows).map(row =>
            <tr key={row.line} data-uuid-report-row>
              <td data-label={t('行', 'Line')}>{row.line}</td>
              <td data-label={t('原始输入', 'Original input')}><code title={row.input}>{row.input || noValue}</code></td>
              <td data-label={t('状态', 'Status')}>{diagnosis(row, t)}{row.duplicate && <span className={s.duplicate}>{t('重复', 'Duplicate')}</span>}</td>
              <td data-label={t('版本', 'Version')}>{row.version === null ? noValue : 'v' + row.version}</td>
              <td data-label={t('变体', 'Variant')}>{row.variant ? variants[row.variant] : noValue}</td>
              <td data-label="UTC"><code>{row.time?.utc ?? noValue}</code></td>
            </tr>)}</tbody>
        </table>
      </div>
      <footer className={s.resultFooter}>
        <PageControls total={report.rows.length} {...{ page, setPage, t }} />
        <div className={s.actions}>
          {(['json', 'csv'] as const).map(output => <Button key={output} onClick={() => download(output)}>
            <DownloadSimpleIcon size={17} aria-hidden="true" />{t('下载 ', 'Download ') + output.toUpperCase()}
          </Button>)}
        </div>
      </footer>
    </>}
  </>;
}
