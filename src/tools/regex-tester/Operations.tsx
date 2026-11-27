import { useState } from 'react';
import { CopyIcon, DownloadSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField, TextField } from '../../ui/TextField';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { Pager } from './Inspector';
import {
  limits, type Assertion, type Capture, type ExtractFormat, type ExtractSettings, type Issue,
  type RegexResult, type TestCase,
} from './protocol';
import { issueText, type Translate } from './reference';
import s from './workbench.module.scss';

export function Output({ value, format, copy, download, t }: {
  value?: string; format: ExtractFormat;
  copy: (value: string) => void; download: (format: ExtractFormat, value: string) => void; t: Translate;
}) {
  return <div className={s.output}>
    <header className={s.bar}>
      <strong>{t('结果', 'Result')}</strong>
      <div className={s.actions}>
        <Button size="sm" variant="ghost" disabled={value === undefined} onClick={() => copy(value!)}><CopyIcon />{t('复制', 'Copy')}</Button>
        <Button size="sm" variant="primary" disabled={value === undefined} onClick={() => download(format, value!)}><DownloadSimpleIcon />
          {t('下载 ', 'Download ') + format.toUpperCase()}
        </Button>
      </div>
    </header>
    {value !== undefined ? <>
      <TextEditor value={value.slice(0, limits.preview)} readOnly preserveCarriageReturns
        ariaLabel={t('输出结果', 'Output result')} className={s.outputEditor} />
      {value.length > limits.preview && <p className={s.note}>{t('预览前 64 Ki UTF-16 单元。复制和下载包含完整结果。',
        'Showing the first 64 Ki UTF-16 code units. Copy and download use the complete result.')}</p>}
      {!value.length && <p className={s.note}>{t('结果为空字符串。', 'The result is an empty string.')}</p>}
    </> : <p className={s.empty}>{t('运行当前输入后可查看结果。', 'Run the current input to see the result.')}</p>}
  </div>;
}

export function ReplacePreview({ result, t, copy, download }: {
  result?: RegexResult; t: Translate; copy: (value: string) => void; download: (format: ExtractFormat, value: string) => void;
}) {
  const [diff, setDiff] = useState(false);
  return <>
    <div className={s.actions}>
      <Button size="sm" variant="ghost" aria-pressed={!diff} onClick={() => setDiff(false)}>{t('替换结果', 'Replacement result')}</Button>
      <Button size="sm" variant="ghost" aria-pressed={diff} disabled={result?.replaced === undefined}
        onClick={() => setDiff(true)}>{t('差异预览', 'Changes')}</Button>
      {result?.replaced !== undefined && <span className={s.note}>{result.count} {t('次替换', 'replacements')}</span>}
    </div>
    {diff && result?.replaced !== undefined && (result.diff
      ? <pre className={s.diff} aria-label={t('原文与替换结果差异', 'Changes from the original')}>
        {result.diff.map((part, index) => part.added
          ? <ins key={index}>{part.value}</ins>
          : part.removed ? <del key={index}>{part.value}</del> : <span key={index}>{part.value}</span>)}
      </pre>
      : <p className={s.note}>{t('差异超出预览预算。仍可复制或下载完整结果。',
        'The diff exceeds its preview budget. The complete result is available to copy or download.')}</p>)}
    <Output value={result?.replaced} format="txt" {...{ t, copy, download }} />
  </>;
}

export function ExtractPanel({ captures, settings, update, result, t, copy, download }: {
  captures: Capture[]; settings: ExtractSettings; update: (settings: ExtractSettings) => void;
  result?: RegexResult; t: Translate; copy: (value: string) => void; download: (format: ExtractFormat, value: string) => void;
}) {
  const named = [...new Set(captures.flatMap(capture => capture.name === undefined ? [] : [capture.name]))];
  const options = [
    { value: '#0', label: t('完整匹配', 'Entire match') },
    ...captures.filter(({ index }) => index > 0).map(({ index }) => ({ value: '#' + index, label: t('捕获组 ', 'Group ') + index })),
    ...named.map(name => ({ value: ':' + name, label: t('命名捕获 ', 'Named capture ') + name })),
  ];
  const selected = (typeof settings.group === 'number' ? '#' : ':') + settings.group;
  if (!options.some(option => option.value === selected)) options.push({ value: selected, label: selected.slice(1) });
  return <>
    <div className={s.formGrid}>
      <SelectField label={t('提取内容', 'Extract from')} options={options} value={selected} appearance="quiet"
        onValueChange={value => { if (value) update({ ...settings, group: value[0] === ':' ? value.slice(1) : Number(value.slice(1)) }); }} />
      <SelectField label={t('输出格式', 'Output format')} options={['txt', 'json', 'csv'].map(value => ({ value, label: value.toUpperCase() }))}
        appearance="quiet" value={settings.format} onValueChange={format => {
          if (format) update({ ...settings, format: format as ExtractFormat });
        }} />
      {settings.format === 'txt' && <TextAreaField label={t('TXT 分隔符', 'TXT separator')} rows={2}
        value={settings.separator} onChange={separator => update({ ...settings, separator })} />}
      <CheckboxField label={t('去重', 'Remove duplicates')} checked={settings.unique} onCheckedChange={unique => update({ ...settings, unique })} />
    </div>
    <p className={s.note}>
      {settings.format === 'txt' ? t('空捕获与未参与的捕获都输出为空字段。', 'Empty and nonparticipating captures both produce empty fields.')
        : settings.format === 'json' ? t('空捕获输出为空字符串，未参与的捕获输出为 null。', 'Empty captures are empty strings. Nonparticipating captures are null.')
          : t('status 列使用 matched 或 absent 区分空捕获和未参与的捕获。', 'The status column uses matched or absent to distinguish empty and nonparticipating captures.')}
      {result?.extraction && ' ' + result.extraction.rows + t(' 条结果。', ' rows.')}
    </p>
    <Output value={result?.extraction?.value} format={settings.format} {...{ t, copy, download }} />
  </>;
}

export function TestsPanel({ cases, update, add, remove, result, error, t, running, run }: {
  cases: TestCase[]; update: (index: number, patch: Partial<TestCase>) => void;
  add: () => void; remove: (index: number) => void; result?: RegexResult; error?: Issue; t: Translate;
  running: boolean; run: () => void;
}) {
  const [page, setPage] = useState(0);
  const size = 5, visible = Math.min(page, Math.max(0, Math.ceil(cases.length / size) - 1));
  const assertions = [
    ['match', t('应匹配', 'Should match')], ['no-match', t('不应匹配', 'Should not match')],
    ['count', t('匹配数量', 'Match count')], ['replace', t('替换结果', 'Replacement result')],
  ].map(([value, label]) => ({ value, label }));
  return <section aria-label={t('测试用例', 'Test cases')} className={s.tests}>
    <header className={s.bar}>
      <strong>{t('测试用例', 'Test cases')}</strong>
      <div className={s.actions}>
        <Button size="sm" variant="ghost" disabled={cases.length >= limits.tests}
          onClick={() => { add(); setPage(Math.floor(cases.length / size)); }}><PlusIcon />{t('新增', 'Add case')}</Button>
        <Button size="sm" variant="primary" disabled={running || !cases.length} onClick={run}>{t('运行全部测试', 'Run all tests')}</Button>
      </div>
    </header>
    <p className={s.note}>{t('替换断言使用替换模式中的替换表达式。', 'Replacement assertions use the expression from Replace mode.')}</p>
    {cases.slice(visible * size, (visible + 1) * size).map((test, offset) => {
      const index = visible * size + offset;
      const actual = result?.tests?.find(item => item.id === test.id);
      const status = actual?.status ?? (error ? 'error' : undefined);
      const issue = actual?.issue ?? error;
      return <article className={s.test} key={test.id}>
        <div className={s.bar}>
          <strong>{t('用例 ', 'Case ') + (index + 1)}</strong>
          <div className={s.actions}>
            <span className={s.testStatus} data-state={status}>{status === 'pass' ? t('通过', 'Pass')
              : status === 'fail' ? t('未通过', 'Fail') : status === 'error' ? t('错误', 'Error') : t('未运行', 'Not run')}</span>
            <IconButton label={t('删除用例 ', 'Delete case ') + (index + 1)} size="sm" variant="ghost" onClick={() => remove(index)}><TrashIcon /></IconButton>
          </div>
        </div>
        <TextAreaField label={t('用例文本', 'Case text')} rows={2} value={test.text} onChange={text => update(index, { text })} />
        <div className={s.formGrid}>
          <SelectField label={t('预期类型', 'Assertion')} appearance="quiet" options={assertions} value={test.assertion}
            onValueChange={assertion => { if (assertion) update(index, { assertion: assertion as Assertion, expected: '' }); }} />
          {test.assertion === 'count'
            ? <TextField label={t('预期数量', 'Expected count')} inputMode="numeric" value={test.expected} onChange={expected => update(index, { expected })} />
            : test.assertion === 'replace' && <TextAreaField label={t('预期替换内容', 'Expected replacement')} rows={2}
              value={test.expected} onChange={expected => update(index, { expected })} />}
        </div>
        {issue ? <p className={s.note}>{issueText(issue, t)}</p>
          : actual?.actual !== undefined && <p className={s.actual}>
            {t('实际结果', 'Actual result')} <code>{actual.actual === '' ? t('空字符串', 'Empty string') : actual.actual}{actual.truncated ? '…' : ''}</code>
          </p>}
      </article>;
    })}
    <Pager t={t} page={visible} size={size} count={cases.length} onChange={setPage} />
  </section>;
}
