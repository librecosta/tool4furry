import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Dialog } from '@base-ui/react/dialog';
import {
  CaretLeftIcon, CaretRightIcon, CodeIcon, CopyIcon, FolderOpenIcon, ListBulletsIcon, PlayIcon, StopIcon, TrashIcon, XIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { TextEditor, type TextEditorHandle } from '../../ui/text-editor/TextEditor';
import { ErrorText, errorText, Frame, saveBlob, tr } from '../general/ui';
import type { ToolProps } from '../types';
import { runAnalysis } from './client';
import { createRegexNamer, mime, readTestText } from './delivery';
import { matchTools, nodeKey, patternTools, selectedMatchTools, walkNodes } from './editor';
import { Inspector } from './Inspector';
import { ExtractPanel, ReplacePreview, TestsPanel } from './Operations';
import {
  flagsOrder, limits, RegexIssue, type Analysis, type ExpressionNode, type ExtractFormat, type ExtractSettings,
  type Issue, type Mode, type Range, type RegexRequest, type RegexResult, type TestCase,
} from './protocol';
import { examples, flagHelp, issueText, type Translate } from './reference';
import { useRegexJob } from './use-regex-job';
import notice from './regexpp.NOTICE.txt?url&no-inline';
import s from './workbench.module.scss';

const example = examples[0];
const emptyMatches: RegexResult['matches'] = [];
const initialTests: TestCase[] = [
  { id: 1, text: 'INFO 200 Request received', assertion: 'match', expected: '' },
  { id: 2, text: 'DEBUG 007 Check connection', assertion: 'no-match', expected: '' },
  { id: 3, text: 'WARN 429 then ERROR 500', assertion: 'count', expected: '2' },
];

function useAnalysis(pattern: string, flags: string, enabled: boolean) {
  const request = useMemo(() => ({ kind: 'analyze' as const, pattern, flags }), [pattern, flags]);
  const [record, setRecord] = useState<{ request: typeof request; value: Analysis }>();
  const [supported, setSupported] = useState<string>();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void runAnalysis(request, controller.signal).then(
      value => {
        if (!controller.signal.aborted) {
          setSupported(value.supported);
          setRecord({ request, value });
        }
      },
      error => {
        if (!controller.signal.aborted) {
          setRecord({ request, value: { indices: false, supported: '',
            issue: error instanceof RegexIssue ? error.issue : { code: 'worker' } } });
        }
      },
    ), 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, enabled]);
  return { analysis: enabled && record?.request === request ? record.value : undefined, supported };
}

function ExamplePicker({ t, load }: { t: Translate; load: (index: number) => void }) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(0);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger render={<Button size="sm" variant="ghost"><ListBulletsIcon />{t('示例', 'Examples')}</Button>} />
    <Dialog.Portal>
      <Dialog.Backdrop className={s.backdrop} />
      <Dialog.Popup className={s.examplesDialog}>
        <div className={s.bar}>
          <Dialog.Title>{t('载入示例', 'Load an example')}</Dialog.Title>
          <Dialog.Close render={<IconButton size="sm" variant="ghost" label={t('关闭', 'Close')}><XIcon /></IconButton>} />
        </div>
        <Dialog.Description className={s.note}>{t('确认后将替换当前表达式、Flags、测试文本和替换内容。',
          'Loading an example replaces the current expression, flags, test text and replacement.')}</Dialog.Description>
        <div className={s.examplesList}>
          {examples.map((item, index) => <button type="button" className={s.exampleRow} key={item.title[1]}
            aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <strong>{t(...item.title)}</strong><span>{t(...item.detail)}</span>
          </button>)}
        </div>
        <code className={s.examplePattern}>{examples[selected].pattern}</code>
        <div className={s.dialogActions}>
          <Dialog.Close render={<Button size="sm" variant="ghost" />}>{t('取消', 'Cancel')}</Dialog.Close>
          <Button size="sm" variant="primary" onClick={() => { load(selected); setOpen(false); }}>{t('使用示例', 'Use example')}</Button>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

export default function RegexTester({ locale }: ToolProps) {
  const t = useCallback((zh: string, en: string) => tr(locale, zh, en), [locale]);
  const [mode, setMode] = useState<Mode>('match'), [inspector, setInspector] = useState('matches');
  const [pattern, setPattern] = useState(example.pattern), [flags, setFlags] = useState(example.flags);
  const [text, setText] = useState(example.text), [replacement, setReplacement] = useState(example.replacement ?? '');
  const [engaged, setEngaged] = useState(true), [live, setLive] = useState(true);
  const [timeout, setTimeoutChoice] = useState<number>(limits.defaultTimeout);
  const [extract, setExtract] = useState<ExtractSettings>({ group: 0, format: 'txt', separator: '\n', unique: false });
  const [cases, setCases] = useState(initialTests);
  const [file, setFile] = useState(''), [fileError, setFileError] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [referenceRequest, setReferenceRequest] = useState(0);
  const [split, setSplit] = useState(62);
  const [node, setNode] = useState<{ source: string; key: string }>();
  const [selection, setSelection] = useState<{ result: RegexResult; index: number }>();

  const patternEditor = useRef<TextEditorHandle>(null), textEditor = useRef<TextEditorHandle>(null);
  const replacementEditor = useRef<TextEditorHandle>(null), fileInput = useRef<HTMLInputElement>(null);
  const panels = useRef<HTMLDivElement>(null), importID = useRef(0), nextTest = useRef(4);
  const pendingInsertion = useRef<string>(null);
  const queuedRun = useRef(false);
  const [nameOutput] = useState(createRegexNamer);

  const { analysis, supported } = useAnalysis(pattern, flags, engaged);
  const editableText = mode === 'tests' ? '' : text;
  const effectiveReplacement = mode === 'replace' || mode === 'tests' ? replacement : '';
  const activeExtract = mode === 'extract' ? extract : undefined, activeCases = mode === 'tests' ? cases : undefined;
  const request = useMemo<RegexRequest | undefined>(() => engaged ? {
    pattern, flags, text: editableText, replacement: effectiveReplacement, mode, extract: activeExtract, cases: activeCases,
  } : undefined, [engaged, pattern, flags, editableText, effectiveReplacement, mode, activeExtract, activeCases]);
  const job = useRegexJob(request, live && mode !== 'tests');
  const { run: runJob } = job;
  useEffect(() => {
    if (request && queuedRun.current) {
      queuedRun.current = false;
      runJob(timeout);
    }
  }, [request, runJob, timeout]);
  const state = job.state, result = state.status === 'result' ? state.result : undefined;
  const busy = state.status === 'waiting' || state.status === 'running';
  const issue = state.status === 'error' ? state.issue : result?.issue;
  const diagnostic = analysis?.issue?.code === 'syntax'
    ? analysis.issue : issue?.code === 'syntax' ? issue : undefined;
  const matches = result?.matches ?? emptyMatches;
  const selected = result && selection?.result === result ? selection.index : 0;
  const select = useCallback((index: number) => {
    if (result && index >= 0 && index < result.matches.length) {
      setSelection({ result, index });
      setInspector('matches');
      setInspectorOpen(true);
    }
  }, [result]);
  const locate = useCallback(([from, to]: Range) => textEditor.current?.focusAt(from, to), []);
  function selectAndLocate(index: number) {
    const match = matches[index];
    if (match) { select(index); locate([match.index, match.end]); }
  }
  const selectNode = useCallback((next: ExpressionNode) => setNode({ source: pattern, key: nodeKey(next) }), [pattern]);
  const locateNode = useCallback((next: ExpressionNode) => {
    selectNode(next);
    patternEditor.current?.focusAt(next.from, next.to);
  }, [selectNode]);
  const nodes = useMemo(() => walkNodes(analysis?.root), [analysis?.root]);
  const syntax = useMemo(() => patternTools(nodes, diagnostic ? diagnostic.position ?? 0 : undefined, selectNode),
    [nodes, diagnostic, selectNode]);
  const marks = useMemo(() => matchTools(matches, select), [matches, select]);
  const activeMark = useMemo(() => selectedMatchTools(matches[selected], selected), [matches, selected]);
  const textExtensions = useMemo(() => [marks, activeMark], [marks, activeMark]);

  useLayoutEffect(() => {
    if (mode !== 'replace' || pendingInsertion.current === null) return;
    replacementEditor.current?.insert(pendingInsertion.current);
    pendingInsertion.current = null;
  }, [mode]);

  function toggleFlag(flag: string) {
    setEngaged(true);
    setFlags([...flagsOrder].filter(value => value === flag ? !flags.includes(flag) :
      flags.includes(value) && !(flag === 'u' && value === 'v') && !(flag === 'v' && value === 'u')).join(''));
  }
  function changeText(value: string) {
    importID.current++;
    setText(value);
    setEngaged(true);
    setFileError(undefined);
  }
  async function importText(selectedFile: File) {
    const id = ++importID.current;
    setFileError(undefined);
    try {
      const value = await readTestText(selectedFile);
      if (id !== importID.current) return;
      changeText(value);
      setFile(selectedFile.name);
    } catch (error) {
      if (id === importID.current) setFileError(errorText(error, locale));
    }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(t('已复制', 'Copied')); }
    catch { setFeedback(t('无法访问剪贴板。', 'Clipboard access failed.')); }
  }
  function download(format: ExtractFormat, value: string) {
    saveBlob(new Blob([value], { type: mime[format] }), nameOutput(file || 'regex-' + mode, format));
    setFeedback(t('下载已开始', 'Download started'));
  }
  function loadExample(index: number) {
    const sample = examples[index];
    setPattern(sample.pattern); setFlags(sample.flags); changeText(sample.text);
    setReplacement(sample.replacement ?? ''); setFile(''); setExtract(previous => ({ ...previous, group: 0 }));
    setInspector('matches'); setNode(undefined);
    if (mode === 'tests') setMode('match');
  }
  function clear() {
    importID.current++;
    setPattern(''); setFlags('g'); setText(''); setReplacement(''); setFile('');
    setEngaged(false); setFileError(undefined); setNode(undefined); setFeedback('');
    setExtract(previous => ({ ...previous, group: 0 }));
  }
  function insert(value: string, isReplacement: boolean) {
    if (!isReplacement) patternEditor.current?.insert(value);
    else if (mode === 'replace') replacementEditor.current?.insert(value);
    else { pendingInsertion.current = value; setMode('replace'); }
  }
  function moveDivider(x: number) {
    const bounds = panels.current?.getBoundingClientRect();
    if (bounds?.width) setSplit(Math.max(40, Math.min(72, (x - bounds.left) / bounds.width * 100)));
  }
  function run() {
    if (request) runJob(timeout);
    else {
      queuedRun.current = true;
      setEngaged(true);
    }
  }

  const captureSchema = analysis?.captures ?? (matches[0]?.groups.map((_, index) => ({ index: index + 1 })) ?? []);
  const captures = analysis?.captures ? captureSchema : [
    ...captureSchema, ...Object.keys(matches[0]?.named ?? {}).map(name => ({ index: 0, name })),
  ];
  const count = result?.count;
  const status = state.status === 'result'
    ? result?.partial ? t('部分结果', 'Partial results')
      : issue ? t('超出预算或设置无效', 'Budget or settings error')
        : mode === 'tests' ? t('测试完成', 'Tests complete') : count === 0 ? t('无匹配', 'No matches') : t('完成', 'Complete')
    : state.status === 'error'
      ? state.issue.code === 'timeout' ? t('执行超时', 'Timed out')
        : state.issue.code === 'syntax' ? t('语法错误', 'Syntax error') : t('执行错误', 'Execution error')
      : { idle: t('空闲', 'Idle'), waiting: t('等待执行', 'Waiting'), running: t('执行中', 'Running'), cancelled: t('已取消', 'Cancelled') }[state.status];
  const summary = result && mode !== 'tests'
    ? (count === null ? matches.length + t(' 条已保留', ' retained') : count + t(' 处匹配', ' matches')) : undefined;
  const testIssue: Issue | undefined = mode === 'tests' && state.status === 'error' ? state.issue : undefined;

  return <Frame locale={locale}>
    <link rel="license" href={notice} />
    <Tabs.Root className={s.workspace} value={mode} onValueChange={value => { setMode(value as Mode); setFeedback(''); }} data-regex-workbench>
      <div className={s.toolbar}>
        <span className={s.engine}><CodeIcon size={16} />JavaScript</span>
        <Tabs.List className={s.modeTabs} aria-label={t('操作模式', 'Mode')}>
          <Tabs.Tab value="match" className={s.tab}>{t('匹配', 'Match')}</Tabs.Tab>
          <Tabs.Tab value="replace" className={s.tab}>{t('替换', 'Replace')}</Tabs.Tab>
          <Tabs.Tab value="extract" className={s.tab}>{t('提取', 'Extract')}</Tabs.Tab>
          <Tabs.Tab value="tests" className={s.tab}>{t('测试用例', 'Tests')}</Tabs.Tab>
        </Tabs.List>
        <div className={s.actions}>
          <ExamplePicker t={t} load={loadExample} />
          <IconButton label={t('清空工作区', 'Clear workspace')} size="sm" variant="ghost" onClick={clear}><TrashIcon /></IconButton>
          <Button variant="primary" size="sm" disabled={analysis?.literal === undefined}
            onClick={() => void copy(analysis!.literal!)}><CopyIcon />{t('复制正则表达式', 'Copy expression')}</Button>
        </div>
      </div>
      <section className={s.expression} aria-label={t('表达式设置', 'Expression settings')}>
        <header className={s.bar}>
          <strong>{t('正则表达式', 'Regular expression')}</strong>
          {engaged && <span className={s.expressionStatus} data-state={diagnostic ? 'error' : analysis?.literal !== undefined ? 'valid' : 'pending'}>
            {diagnostic ? issueText(diagnostic, t) : analysis?.literal !== undefined ? t('有效', 'Valid')
              : analysis?.issue ? issueText(analysis.issue, t) : t('正在检查', 'Checking')}
          </span>}
        </header>
        <div className={s.pattern}>
          <span aria-hidden="true">/</span>
          <TextEditor editorRef={patternEditor} value={pattern} preserveCarriageReturns lineNumbers={false}
            ariaLabel={t('编辑正则表达式', 'Edit regular expression')}
            placeholder={t('输入正则表达式', 'Enter an expression')}
            onChange={source => { setPattern(source); setEngaged(true); }} extensions={syntax} />
          <span aria-hidden="true">/</span><span aria-hidden="true" className={s.patternFlags}>{flags}</span>
        </div>
        <div className={s.flagBar}>
          <div className={s.flags} role="group" aria-label="Flags">
            {[...'gimsuvyd'].map(flag => {
              const description = t(...flagHelp[flag]);
              const unavailable = supported !== undefined && !supported.includes(flag);
              return <Button size="sm" variant="ghost" key={flag} aria-pressed={flags.includes(flag)} disabled={unavailable && !flags.includes(flag)}
                aria-label={flag + ' ' + description}
                title={description + (unavailable ? t('（浏览器不支持）', ' (unavailable in this browser)') : '')}
                onClick={() => toggleFlag(flag)}>{flag}</Button>;
            })}
          </div>
          <div className={s.actions}>
            {mode !== 'tests' && <CheckboxField label={t('实时执行', 'Live matching')} checked={live}
              onCheckedChange={value => { if (!value && busy) job.cancel(); setLive(value); }} />}
            <select className={s.timeout} aria-label={t('手动执行超时', 'Manual run timeout')} value={timeout}
              onChange={event => setTimeoutChoice(Number(event.currentTarget.value))}>
              <option value={1500}>1.5 s</option><option value={3000}>3 s</option><option value={5000}>5 s</option>
            </select>
            {busy ? <Button size="sm" variant="secondary" onClick={job.cancel}><StopIcon />{t('取消任务', 'Cancel run')}</Button>
              : mode !== 'tests' && <Button size="sm" variant="secondary" onClick={run}><PlayIcon />{t('运行', 'Run')}</Button>}
          </div>
        </div>
      </section>
      <div ref={panels} className={s.panes} style={{ '--rx-split': split + '%' } as CSSProperties}>
        <div className={s.workArea}>
          <section className={s.testSource} hidden={mode === 'tests'} data-compact={mode !== 'match' || undefined}
            onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
            onDrop={event => {
              if (!event.dataTransfer.files.length) return;
              event.preventDefault();
              if (event.dataTransfer.files.length === 1) void importText(event.dataTransfer.files[0]);
              else setFileError(t('每次请选择一个文本文件。', 'Choose one text file at a time.'));
            }}>
            <header className={s.bar}>
              <div className={s.sourceLabel}><strong>{t('测试文本', 'Test text')}</strong>{file && <small title={file}>{file}</small>}</div>
              <div className={s.actions}>
                <input ref={fileInput} hidden type="file" accept="text/*,.txt,.log,.csv,.json,.md"
                  onChange={event => {
                    const chosen = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (chosen) void importText(chosen);
                  }} />
                <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}><FolderOpenIcon />{t('导入文本', 'Import text')}</Button>
                <IconButton size="sm" variant="ghost" label={t('复制测试文本', 'Copy test text')} disabled={!text.length} onClick={() => void copy(text)}><CopyIcon /></IconButton>
                <IconButton size="sm" variant="ghost" label={t('清空测试文本', 'Clear test text')} onClick={() => { changeText(''); setFile(''); }}><TrashIcon /></IconButton>
              </div>
            </header>
            <TextEditor value={text} onChange={changeText} editorRef={textEditor} preserveCarriageReturns
              ariaLabel={t('编辑测试文本', 'Edit test text')} lineWrapping={text.length < 200_000} className={s.testEditor} extensions={textExtensions} />
            <ErrorText error={fileError} />
            <div className={s.textFooter}>
              <span>{summary ?? t('本地文本', 'Local text')}{matches[0]?.groups.length ? ' · ' + matches[0].groups.length + t(' 个捕获组', ' captures') : ''}</span>
              <div className={s.actions}>
                <IconButton size="sm" variant="ghost" disabled={selected <= 0} label={t('上一处匹配', 'Previous match')}
                  onClick={() => selectAndLocate(selected - 1)}><CaretLeftIcon /></IconButton>
                <span>{matches.length ? selected + 1 : 0} / {matches.length}</span>
                <IconButton size="sm" variant="ghost" disabled={selected + 1 >= matches.length} label={t('下一处匹配', 'Next match')}
                  onClick={() => selectAndLocate(selected + 1)}><CaretRightIcon /></IconButton>
              </div>
            </div>
          </section>
          <div className={s.replacementField} hidden={mode !== 'replace'}>
            <div className={s.bar}>
              <strong>{t('替换表达式', 'Replacement')}</strong>
              <Button size="sm" variant="ghost" onClick={() => {
                setInspector('reference');
                setReferenceRequest(previous => previous + 1);
                setInspectorOpen(true);
              }}>{t('替换语法', 'Replacement syntax')}</Button>
            </div>
            <TextEditor ariaLabel={t('编辑替换表达式', 'Edit replacement')} value={replacement} preserveCarriageReturns
              lineNumbers={false} onChange={setReplacement} editorRef={replacementEditor} />
          </div>
          <Tabs.Panel value="match" className={s.matchPanel} aria-label={t('匹配工作区', 'Match workspace')} />
          <Tabs.Panel value="replace" className={s.operation} keepMounted>
            <ReplacePreview result={result} t={t} copy={copy} download={download} />
          </Tabs.Panel>
          <Tabs.Panel value="extract" className={s.operation}>
            <ExtractPanel {...{ captures, settings: extract, update: setExtract, result, t, copy, download }} />
          </Tabs.Panel>
          <Tabs.Panel value="tests" className={s.operation} keepMounted>
            <TestsPanel cases={cases} update={(index, patch) => setCases(previous => previous.map((item, at) => at === index ? { ...item, ...patch } : item))}
              add={() => { const id = nextTest.current++; setCases(previous => [...previous, { id, text: '', assertion: 'match', expected: '' }]); }}
              remove={index => setCases(previous => previous.filter((_, at) => at !== index))}
              result={result} error={testIssue} t={t} running={busy} run={run} />
          </Tabs.Panel>
        </div>
        <div className={s.divider} role="separator" tabIndex={0} aria-label={t('调整分栏', 'Resize panes')}
          aria-orientation="vertical" aria-valuemin={40} aria-valuemax={72} aria-valuenow={Math.round(split)}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            moveDivider(event.clientX);
          }}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveDivider(event.clientX); }}
          onDoubleClick={() => setSplit(62)}
          onKeyDown={event => {
            const keys: Record<string, number> = { ArrowLeft: split - 3, ArrowRight: split + 3, Home: 40, End: 72, Enter: 62 };
            if (Object.hasOwn(keys, event.key)) { event.preventDefault(); setSplit(Math.max(40, Math.min(72, keys[event.key]))); }
          }}><span /></div>
        <aside className={s.inspector} data-collapsed={!inspectorOpen || undefined}>
          <Button className={s.mobileInspectorToggle} size="sm" variant="ghost" aria-expanded={inspectorOpen}
            onClick={() => setInspectorOpen(value => !value)}>{inspectorOpen ? t('收起检查器', 'Collapse inspector') : t('展开检查器', 'Expand inspector')}</Button>
          <div className={s.inspectorContent}>
            <Inspector tab={inspector} onTab={setInspector}
              {...{ result, selected, analysis, pattern, flags, select: selectAndLocate, locate, insert, referenceRequest, t }}
              current={node?.source === pattern ? node.key : undefined} onNode={locateNode} />
          </div>
        </aside>
      </div>
      <footer className={s.statusBar} aria-live="polite">
        <span>JavaScript RegExp <span aria-hidden="true">·</span> {t('UTF-16 索引', 'UTF-16 indices')}</span>
        <span data-regex-status data-state={state.status}>{status}{summary ? ' · ' + summary : ''}{result ? ' · ' + result.elapsed.toFixed(2) + ' ms' : ''}</span>
      </footer>
      {issue && !diagnostic && <ErrorText error={issueText(issue, t)} />}
      {feedback && <p className={s.feedback} role="status">{feedback}</p>}
    </Tabs.Root>
  </Frame>;
}
