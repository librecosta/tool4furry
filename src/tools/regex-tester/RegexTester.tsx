import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Dialog } from '@base-ui/react/dialog';
import {
  CheckIcon, FolderOpenIcon, InfoIcon, ListBulletsIcon, PlayIcon, StopIcon, TrashIcon, XIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { TextEditor, type TextEditorHandle } from '../../ui/text-editor/TextEditor';
import { ErrorText, errorText, Frame, saveBlob, tr } from '../general/ui';
import type { ToolProps } from '../types';
import { runAnalysis } from './client';
import { CopyAction } from './CopyAction';
import { createRegexNamer, mime, readTestText } from './delivery';
import { matchTools, nodeKey, patternTools, selectedMatchTools, walkNodes } from './editor';
import { Explanation } from './Inspector';
import { ExecutionOptions, MatchOptions, SyntaxHelp } from './Disclosures';
import { MatchResults } from './MatchResults';
import { ExtractRules, Output, ReplacePreview, TestsPanel } from './Operations';
import {
  flagsOrder, limits, RegexIssue, type Analysis, type ExpressionNode, type ExtractFormat, type ExtractSettings,
  type Issue, type Mode, type Range, type RegexRequest, type RegexResult, type TestCase,
} from './protocol';
import { defaultExample, examples, issueText, type Translate } from './reference';
import { useRegexJob } from './use-regex-job';
import notice from './regexpp.NOTICE.txt?url&no-inline';
import s from './workbench.module.scss';

const example = defaultExample;
const initialExtraction: ExtractSettings = { group: 0, format: 'txt', separator: '\n', unique: false };
const emptyMatches: RegexResult['matches'] = [];
const initialTests: TestCase[] = [
  { id: 1, text: 'Order #1024', assertion: 'match', expected: '' },
  { id: 2, text: 'Order pending', assertion: 'no-match', expected: '' },
  { id: 3, text: 'Order #2048 and #4096', assertion: 'count', expected: '2' },
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
    <Dialog.Trigger render={<Button size="sm" variant="ghost"><ListBulletsIcon />{t('载入示例', 'Examples')}</Button>} />
    <Dialog.Portal>
      <Dialog.Backdrop className={s.backdrop} />
      <Dialog.Popup className={s.examplesDialog}>
        <div className={s.bar}>
          <Dialog.Title>{t('载入示例', 'Load an example')}</Dialog.Title>
          <Dialog.Close render={<IconButton size="sm" variant="ghost" label={t('关闭', 'Close')}><XIcon /></IconButton>} />
        </div>
        <Dialog.Description className={s.note}>{examples[selected].cases
          ? t('载入后会替换当前表达式、文本、相关设置和测试用例。', 'Loading this example replaces the expression, text, related settings and test cases.')
          : t('载入后会替换当前表达式、文本和相关设置。', 'Loading an example replaces the current expression, text and related settings.')}</Dialog.Description>
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
  const [mode, setMode] = useState<Mode>('match');
  const [explanation, showExplanation] = useState(false);
  const explanationId = useId();
  const [pattern, setPattern] = useState(example.pattern), [flags, setFlags] = useState(example.flags);
  const [text, setText] = useState(example.text), [replacement, setReplacement] = useState(example.replacement ?? '');
  const [engaged, setEngaged] = useState(true), [live, setLive] = useState(true);
  const [timeout, setTimeoutChoice] = useState<number>(limits.defaultTimeout);
  const [extract, setExtract] = useState<ExtractSettings>(initialExtraction);
  const [cases, setCases] = useState(initialTests);
  const [file, setFile] = useState(''), [fileError, setFileError] = useState<string>();
  const [feedback, setFeedback] = useState('');
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
  const matchRequest = useMemo<RegexRequest>(() => ({ mode: 'match', pattern, flags, text, replacement: '' }), [pattern, flags, text]);
  const replaceRequest = useMemo<RegexRequest>(() => ({ mode: 'replace', pattern, flags, text, replacement }), [pattern, flags, text, replacement]);
  const extractRequest = useMemo<RegexRequest>(() => ({ mode: 'extract', pattern, flags, text, replacement: '', extract }), [pattern, flags, text, extract]);
  const testRequest = useMemo<RegexRequest>(() => ({ mode: 'tests', pattern, flags, text: '', replacement, cases }), [pattern, flags, replacement, cases]);
  const request = engaged ? { match: matchRequest, replace: replaceRequest, extract: extractRequest, tests: testRequest }[mode] : undefined;
  const job = useRegexJob(mode, request, live && mode !== 'tests');
  const { run: runJob } = job;
  useEffect(() => {
    if (request && queuedRun.current) {
      queuedRun.current = false;
      runJob(timeout);
    }
  }, [request, runJob, timeout]);
  const state = job.state, result = state.status === 'result' ? state.result : undefined;
  const busy = state.status === 'waiting' || state.status === 'running';
  const issue = state.status === 'error' ? state.issue : result?.issue ?? analysis?.issue;
  const diagnostic = analysis?.issue?.code === 'syntax'
    ? analysis.issue : issue?.code === 'syntax' ? issue : undefined;
  const expressionIssue = diagnostic ?? analysis?.issue;
  const validExpression = analysis?.literal !== undefined && !expressionIssue;
  const expressionStatus = expressionIssue ? issueText(expressionIssue, t) : t('有效表达式', 'Valid expression');
  const explanationOpen = explanation && validExpression;
  const explanationLabel = explanationOpen ? t('收起解释', 'Hide explanation') : t('展开解释', 'Explain');
  const matches = result?.matches ?? emptyMatches;
  const selected = mode === 'match' && result && selection?.result === result ? selection.index : 0;
  const select = useCallback((index: number) => {
    if (mode === 'match' && result && index >= 0 && index < result.matches.length) {
      setSelection({ result, index });
    }
  }, [mode, result]);
  const locate = useCallback(([from, to]: Range) => textEditor.current?.focusAt(from, to), []);
  const selectNode = useCallback((next: ExpressionNode) => setNode({ source: pattern, key: nodeKey(next) }), [pattern]);
  const locateNode = useCallback((next: ExpressionNode) => {
    selectNode(next);
    patternEditor.current?.focusAt(next.from, next.to);
  }, [selectNode]);
  const nodes = useMemo(() => walkNodes(analysis?.root), [analysis?.root]);
  const syntax = useMemo(() => patternTools(nodes, diagnostic ? diagnostic.position ?? 0 : undefined, selectNode),
    [nodes, diagnostic, selectNode]);
  const marks = useMemo(() => matchTools(matches, select), [matches, select]);
  const activeMark = useMemo(() => selectedMatchTools(mode === 'match' ? matches[selected] : undefined, selected), [mode, matches, selected]);
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
  function download(format: ExtractFormat, value: string) {
    saveBlob(new Blob([value], { type: mime[format] }), nameOutput(file || 'regex-' + mode, format));
    setFeedback(t('下载已开始', 'Download started'));
  }
  function loadExample(index: number) {
    const sample = examples[index];
    setPattern(sample.pattern); setFlags(sample.flags); changeText(sample.text);
    setReplacement(sample.replacement ?? ''); setFile(''); setExtract({ ...initialExtraction, ...sample.extract });
    setNode(undefined); setFeedback('');
    setMode(sample.mode ?? 'match');
    if (sample.cases) setCases(sample.cases.map(item => ({ ...item, id: nextTest.current++ })));
  }
  function clear() {
    importID.current++;
    setPattern(''); setFlags('g'); setText(''); setReplacement(''); setFile('');
    setEngaged(false); setFileError(undefined); setNode(undefined); setFeedback(''); showExplanation(false);
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
  const status = diagnostic ? t('表达式无效', 'Invalid expression')
    : state.status === 'result'
      ? result?.partial
        ? t('结果不完整，已保留 ' + matches.length + ' 条', 'Partial results, ' + matches.length + ' retained')
        : issue ? t('请检查当前设置', 'Check the current settings')
          : mode === 'tests' ? t('测试完成', 'Tests complete')
            : count === 0 ? t('未找到匹配', 'No matches found') : t('已找到 ' + count + ' 处匹配', 'Found ' + count + ' matches')
      : state.status === 'error'
        ? state.issue.code === 'timeout' ? t('执行超时', 'Timed out') : t('执行错误', 'Execution error')
        : {
          idle: mode === 'tests' ? t('等待运行测试', 'Ready to run tests')
            : request && !live ? t('等待手动运行', 'Ready to run') : t('等待输入', 'Ready for input'),
          waiting: t('等待匹配', 'Waiting to match'),
          running: mode === 'tests' ? t('正在运行测试', 'Running tests') : t('正在匹配', 'Matching'),
          cancelled: t('已取消', 'Cancelled'),
        }[state.status];
  const testIssue: Issue | undefined = mode === 'tests' && state.status === 'error' ? state.issue : undefined;

  return <Frame locale={locale}>
    <link rel="license" href={notice} />
    <Tabs.Root className={s.workspace} value={mode} onValueChange={value => { setMode(value as Mode); setFeedback(''); }} data-regex-workbench>
      <div className={s.toolbar}>
        <Tabs.List className={s.modeTabs} aria-label={t('操作模式', 'Mode')}>
          <Tabs.Tab value="match" className={s.tab}>{t('查找匹配', 'Match')}</Tabs.Tab>
          <Tabs.Tab value="replace" className={s.tab}>{t('查找并替换', 'Replace')}</Tabs.Tab>
          <Tabs.Tab value="extract" className={s.tab}>{t('提取内容', 'Extract')}</Tabs.Tab>
          <Tabs.Tab value="tests" className={s.tab}>{t('测试用例', 'Tests')}</Tabs.Tab>
        </Tabs.List>
        <div className={s.actions}>
          <ExamplePicker t={t} load={loadExample} />
          <SyntaxHelp t={t} insert={insert} />
        </div>
      </div>
      <div className={s.surface}>
        <section className={s.expression} aria-label={t('表达式设置', 'Expression settings')}>
          <header className={s.bar}>
            <div className={s.expressionTitle}>
              <strong>{t('正则表达式', 'Regular expression')}</strong>
              {(validExpression || expressionIssue) && <Tooltip borderless content={expressionStatus}>
                <span className={s.expressionStatus} data-state={expressionIssue ? 'error' : 'valid'}
                  role="img" aria-label={expressionStatus} tabIndex={0}>
                  {expressionIssue ? <XIcon size={16} weight="bold" aria-hidden="true" />
                    : <CheckIcon size={16} weight="bold" aria-hidden="true" />}
                </span>
              </Tooltip>}
            </div>
            <div className={s.actions}>
              <Tooltip borderless content={explanationLabel}>
                <IconButton size="sm" variant="ghost" className={s.compactButton} label={explanationLabel}
                  disabled={!validExpression} aria-expanded={explanationOpen} aria-controls={explanationOpen ? explanationId : undefined}
                  onClick={() => showExplanation(value => !value)}>
                  <InfoIcon size={17} weight={explanationOpen ? 'fill' : 'regular'} aria-hidden="true" />
                </IconButton>
              </Tooltip>
              <CopyAction label={t('复制正则表达式', 'Copy expression')} value={analysis?.literal} t={t} />
            </div>
          </header>
          <div className={s.pattern}>
            <span aria-hidden="true">/</span>
            <TextEditor editorRef={patternEditor} value={pattern} preserveCarriageReturns lineNumbers={false}
              className={s.patternEditor}
              ariaLabel={t('编辑正则表达式', 'Edit regular expression')} placeholder={t('输入正则表达式', 'Enter an expression')}
              onChange={source => { setPattern(source); setEngaged(true); }} extensions={syntax} />
            <span className={s.patternFlags} aria-label={t('已启用选项 ', 'Active flags ') + flags}>/{flags}</span>
            <MatchOptions {...{ flags, supported, toggle: toggleFlag, t }} />
          </div>
          {explanationOpen && <section id={explanationId} className={s.explanation} aria-label={t('表达式解释', 'Expression explanation')}>
            <Explanation {...{ analysis, pattern, flags, t }} current={node?.source === pattern ? node.key : undefined} onNode={locateNode} />
          </section>}
          <div className={s.replacementField} hidden={mode !== 'replace'}>
            <div className={s.bar}>
              <strong>{t('替换表达式', 'Replacement')}</strong>
              {mode === 'replace' && <SyntaxHelp t={t} insert={insert} replacement />}
            </div>
            <TextEditor ariaLabel={t('编辑替换表达式', 'Edit replacement')} value={replacement} preserveCarriageReturns
              className={s.replacementEditor} lineNumbers={false} onChange={setReplacement} editorRef={replacementEditor} />
          </div>
          {mode === 'extract' && <ExtractRules {...{ captures, settings: extract, update: setExtract, t }} />}
        </section>
        <div ref={panels} className={s.panes} hidden={mode === 'tests'} style={{ '--rx-split': split + '%' } as CSSProperties}>
          <section className={s.testSource}
            onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
            onDrop={event => {
              if (!event.dataTransfer.files.length) return;
              event.preventDefault();
              if (event.dataTransfer.files.length === 1) void importText(event.dataTransfer.files[0]);
              else setFileError(t('每次请选择一个文本文件。', 'Choose one text file at a time.'));
            }}>
            <header className={s.paneHeader}>
              <div className={s.sourceLabel}>
                <strong>{mode === 'match' ? t('测试文本', 'Test text') : t('原始文本', 'Source text')}</strong>
                {file && <small title={file}>{file}</small>}
              </div>
              <div className={s.actions}>
                <input ref={fileInput} hidden type="file" accept="text/*,.txt,.log,.csv,.json,.md"
                  onChange={event => {
                    const chosen = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (chosen) void importText(chosen);
                  }} />
                <Button size="sm" variant="ghost" className={s.compactButton} onClick={() => fileInput.current?.click()}>
                  <FolderOpenIcon />{t('导入', 'Import')}
                </Button>
                <CopyAction label={t('复制测试文本', 'Copy test text')} value={text || undefined} t={t} />
                <IconButton size="sm" variant="ghost" className={s.compactButton} label={t('清空测试文本', 'Clear test text')}
                  onClick={() => { changeText(''); setFile(''); }}><TrashIcon /></IconButton>
              </div>
            </header>
            <TextEditor value={text} onChange={changeText} editorRef={textEditor} preserveCarriageReturns
              ariaLabel={t('编辑测试文本', 'Edit test text')} placeholder={t('输入要搜索的文本', 'Enter text to search')}
              lineWrapping={text.length < 200_000} className={s.testEditor} extensions={textExtensions} />
            <ErrorText error={fileError} />
          </section>
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
          <Tabs.Panel value="match" className={s.resultSlot}>
            <MatchResults {...{ result, text, active: selected, analysis, onSelect: select, locate, t }} />
          </Tabs.Panel>
          <Tabs.Panel value="replace" className={s.resultSlot} keepMounted>
            <ReplacePreview result={mode === 'replace' ? result : undefined} {...{ t, download }} />
          </Tabs.Panel>
          <Tabs.Panel value="extract" className={s.resultSlot}>
            <Output title={t('提取结果', 'Extracted text')} value={result?.extraction?.value} format={extract.format} {...{ t, download }}
              note={result?.extraction ? t(result.extraction.rows + ' 条结果', result.extraction.rows + ' rows') : undefined} />
          </Tabs.Panel>
        </div>
        <Tabs.Panel value="tests" className={s.testsSlot} keepMounted>
          <TestsPanel cases={cases} update={(index, patch) => setCases(previous => previous.map((item, at) => at === index ? { ...item, ...patch } : item))}
            add={() => { const id = nextTest.current++; setCases(previous => [...previous, { id, text: '', assertion: 'match', expected: '' }]); }}
            remove={index => setCases(previous => previous.filter((_, at) => at !== index))}
            result={mode === 'tests' ? result : undefined} error={testIssue} t={t} running={busy} run={run} />
        </Tabs.Panel>
        {issue && !diagnostic && <div className={s.issue}><ErrorText error={issueText(issue, t)} /></div>}
        <footer className={s.statusBar}>
          <span aria-live="polite" data-regex-status data-state={state.status}>{status}</span>
          <div className={s.actions}>
            {feedback && <span className={s.feedback} role="status">{feedback}</span>}
            {busy ? <Button size="sm" variant="secondary" className={s.compactButton} onClick={job.cancel}><StopIcon />{t('取消任务', 'Cancel run')}</Button>
              : mode !== 'tests' && !live && <Button size="sm" variant="primary" className={s.compactButton} onClick={run}><PlayIcon />{t('运行', 'Run')}</Button>}
            {mode !== 'tests' && live && <span className={s.liveHint}>{t('实时匹配已开启', 'Live matching on')}</span>}
            <ExecutionOptions {...{ t, live, timeout, setTimeoutChoice, run, busy, clear, tests: mode === 'tests', elapsed: result?.elapsed }}
              setLive={value => { if (!value && busy) job.cancel(); setLive(value); }} />
          </div>
        </footer>
      </div>
    </Tabs.Root>
  </Frame>;
}
