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

export function Output({ title, value, format, copy, download, t, view, note, children }: {
  title: string; value?: string; format: ExtractFormat;
  copy: (value: string) => void; download: (format: ExtractFormat, value: string) => void; t: Translate;
  view?: React.ReactNode; note?: string; children?: React.ReactNode;
}) {
  return <div className={s.resultPane}>
    <header className={s.paneHeader}>
      <strong>{title}</strong>
      <div className={s.actions}>
        {view}
        <IconButton size="sm" variant="ghost" className={s.compactButton} label={t('复制结果', 'Copy result')}
          disabled={value === undefined} onClick={() => copy(value!)}><CopyIcon size={16} /></IconButton>
        <Button size="sm" variant="ghost" className={s.compactButton} disabled={value === undefined} onClick={() => download(format, value!)}>
          <DownloadSimpleIcon size={16} />{t('下载 ', 'Download ') + format.toUpperCase()}
        </Button>
      </div>
    </header>
    {value === undefined ? <p className={s.resultEmpty}>{t('匹配后可查看结果。', 'Run a match to see the result.')}</p>
      : children ?? <TextEditor value={value.slice(0, limits.preview)} readOnly preserveCarriageReturns
        ariaLabel={t('输出结果', 'Output result')} className={s.outputEditor} />}
    {value !== undefined && <footer className={s.resultFooter}>
      <span className={s.note}>{value.length > limits.preview
        ? t('预览前 64 Ki 单元，复制和下载保留完整结果。', 'Preview limited to 64 Ki code units. Copy and download use the complete result.')
        : value.length ? note : t('结果为空字符串。', 'The result is an empty string.')}</span>
    </footer>}
  </div>;
}

export function ReplacePreview({ result, t, copy, download }: {
  result?: RegexResult; t: Translate; copy: (value: string) => void; download: (format: ExtractFormat, value: string) => void;
}) {
  const [diff, setDiff] = useState(false);
  const value = result?.replaced;
  return <Output title={t('替换结果', 'Replacement result')} value={value} format="txt" {...{ t, copy, download }}
    note={value !== undefined ? t(result!.count + ' 次替换', result!.count + ' replacements') : undefined}
    view={<Button size="sm" variant="ghost" className={s.compactButton} aria-pressed={diff} disabled={value === undefined}
      onClick={() => setDiff(previous => !previous)}>{t('差异', 'Changes')}</Button>}>
    {diff && value !== undefined ? (result?.diff
      ? <pre className={s.diff} aria-label={t('原文与替换结果差异', 'Changes from the original')}>
        {result.diff.map((part, index) => part.added
          ? <ins key={index}>{part.value}</ins>
          : part.removed ? <del key={index}>{part.value}</del> : <span key={index}>{part.value}</span>)}
      </pre>
      : <p className={s.resultEmpty}>{t('差异超出预览预算。可切回结果，或下载完整文本。',
        'The diff exceeds its preview budget. Switch back or download the complete text.')}</p>) : undefined}
  </Output>;
}

export function ExtractRules({ captures, settings, update, t }: {
  captures: Capture[]; settings: ExtractSettings; update: (settings: ExtractSettings) => void;
  t: Translate;
}) {
  const named = [...new Set(captures.flatMap(capture => capture.name === undefined ? [] : [capture.name]))];
  const options = [
    { value: '#0', label: t('完整匹配', 'Entire match') },
    ...captures.filter(({ index }) => index > 0).map(({ index }) => ({ value: '#' + index, label: t('捕获组 ', 'Group ') + index })),
    ...named.map(name => ({ value: ':' + name, label: t('命名捕获 ', 'Named capture ') + name })),
  ];
  const selected = (typeof settings.group === 'number' ? '#' : ':') + settings.group;
  if (!options.some(option => option.value === selected)) options.push({ value: selected, label: selected.slice(1) });
  return <div className={s.extractSettings}>
    <div className={s.formGrid}>
      <SelectField label={t('提取来源', 'Extract from')} options={options} value={selected} appearance="quiet"
        onValueChange={value => { if (value) update({ ...settings, group: value[0] === ':' ? value.slice(1) : Number(value.slice(1)) }); }} />
      <SelectField label={t('输出格式', 'Output format')} options={['txt', 'json', 'csv'].map(value => ({ value, label: value.toUpperCase() }))}
        appearance="quiet" value={settings.format} onValueChange={format => {
          if (format) update({ ...settings, format: format as ExtractFormat });
        }} />
      {settings.format === 'txt' && <TextAreaField label={t('TXT 分隔符', 'TXT separator')} rows={1}
        value={settings.separator} onChange={separator => update({ ...settings, separator })} />}
      <CheckboxField label={t('去重', 'Remove duplicates')} checked={settings.unique} onCheckedChange={unique => update({ ...settings, unique })} />
    </div>
    <details className={s.extractHelp}><summary>{t('空捕获的输出方式', 'How empty captures are exported')}</summary><p className={s.note}>
      {settings.format === 'txt' ? t('空捕获与未参与的捕获都输出为空字段。', 'Empty and nonparticipating captures both produce empty fields.')
        : settings.format === 'json' ? t('空捕获输出为空字符串，未参与的捕获输出为 null。', 'Empty captures are empty strings. Nonparticipating captures are null.')
          : t('status 列使用 matched 或 absent 区分空捕获和未参与的捕获。', 'The status column uses matched or absent to distinguish empty and nonparticipating captures.')}
    </p></details>
  </div>;
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
  return <section aria-label={t('测试用例', 'Test cases')}>
    <header className={s.paneHeader}>
      <strong>{t('测试用例', 'Test cases')}</strong>
      <div className={s.actions}>
        <Button size="sm" variant="ghost" disabled={cases.length >= limits.tests}
          onClick={() => { add(); setPage(Math.floor(cases.length / size)); }}><PlusIcon />{t('新增用例', 'Add case')}</Button>
        <Button size="sm" variant="primary" disabled={running || !cases.length} onClick={run}>{t('运行全部测试', 'Run all tests')}</Button>
      </div>
    </header>
    {cases.length ? <table className={s.caseTable} aria-label={t('测试结果', 'Test results')}>
      <thead><tr>
        <th scope="col">{t('测试输入', 'Test input')}</th><th scope="col">{t('预期结果', 'Expected')}</th>
        <th scope="col">{t('实际结果', 'Actual')}</th><th scope="col">{t('状态', 'Status')}</th>
        <th scope="col" aria-label={t('操作', 'Actions')} />
      </tr></thead>
      <tbody>{cases.slice(visible * size, (visible + 1) * size).map((test, offset) => {
        const index = visible * size + offset;
        const actual = result?.tests?.find(item => item.id === test.id);
        const status = actual?.status ?? (error ? 'error' : undefined);
        const issue = actual?.issue ?? error;
        return <tr key={test.id}>
          <td><TextAreaField label={t('用例文本 ', 'Case text ') + (index + 1)} rows={2} value={test.text}
            onChange={text => update(index, { text })} /></td>
          <td className={s.assertion}>
            <SelectField label={t('预期类型 ', 'Assertion ') + (index + 1)} appearance="quiet" options={assertions}
              value={test.assertion} onValueChange={assertion => {
                if (assertion) update(index, { assertion: assertion as Assertion, expected: '' });
              }} />
            {test.assertion === 'count'
              ? <TextField label={t('预期数量', 'Expected count')} inputMode="numeric" value={test.expected} onChange={expected => update(index, { expected })} />
              : test.assertion === 'replace' && <TextAreaField label={t('预期替换内容', 'Expected replacement')} rows={2}
                hint={t('使用替换模式中的替换表达式。', 'Uses the expression from Replace mode.')}
                value={test.expected} onChange={expected => update(index, { expected })} />}
          </td>
          <td className={s.actual} data-label={t('实际结果', 'Actual')}>
            {issue ? issueText(issue, t) : actual?.actual === undefined ? '—' : <code>{
              test.assertion === 'match' || test.assertion === 'no-match'
                ? (actual.actual === 'true' ? t('已匹配', 'Matched') : t('未匹配', 'No match'))
                : actual.actual === '' ? t('空字符串', 'Empty string') : actual.actual}{actual.truncated ? '…' : ''}</code>}
          </td>
          <td><span className={s.testStatus} data-state={status}>{status === 'pass' ? t('通过', 'Pass')
            : status === 'fail' ? t('未通过', 'Fail') : status === 'error' ? t('错误', 'Error') : t('未运行', 'Not run')}</span></td>
          <td><IconButton label={t('删除用例 ', 'Delete case ') + (index + 1)} size="sm" variant="ghost"
            className={s.compactButton} onClick={() => remove(index)}><TrashIcon /></IconButton></td>
        </tr>;
      })}</tbody>
    </table> : <p className={s.resultEmpty}>{t('添加用例来验证匹配或替换结果。', 'Add a case to verify a match or replacement.')}</p>}
    <Pager t={t} page={visible} size={size} count={cases.length} onChange={setPage} />
  </section>;
}
