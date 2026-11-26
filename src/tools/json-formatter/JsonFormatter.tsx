import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircleIcon, CopyIcon, DownloadSimpleIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { Tooltip } from '../../ui/Tooltip';
import { TextEditor, type TextEditorHandle } from '../../ui/text-editor/TextEditor';
import { TextEditorPane } from '../../ui/text-editor/TextEditorPane';
import { TextWorkbench } from '../../ui/text-editor/TextWorkbench';
import form from '../../workbench/form-tool-layout.module.scss';
import type { ToolProps } from '../types';
import { ErrorText, Frame, errorText, saveBlob, tr } from '../general/ui';
import { fail } from '../general/bounds';
import { maxJsonInput, type JsonIndent, type JsonIssue } from './core';
import type { FormatResult } from './protocol';
import { createJsonNamer, jsonMime, maxJsonFile, readJsonFile, type OutputStyle } from './delivery';
import { jsonDiagnostic } from './editor';
import { jsonLanguage, jsonLanguageNotice as notice } from './json-language';
import { JsonTree } from './JsonTree';
import { issueMessage, workerMessage } from './messages';
import { JsonProcessor } from './processing';
import s from './json.module.scss';

const sampleFields = { project: 'Tool4Furry', enabled: true, tools: ['JSON', 'Text', 'Image'], version: 1 };
const sample = '{\n' + Object.entries(sampleFields)
  .map(([key, value]) => '  ' + JSON.stringify(key) + ':' + JSON.stringify(value)).join(',\n') + '\n}';

type Origin = { kind: 'sample' | 'editor' } | { kind: 'file'; name: string };
type Input = { text: string; origin: Origin; revision: number };
type Processed = { revision: number; indent: JsonIndent; result?: FormatResult; error?: string };
type Mode = 'quick' | 'advanced';
type View = 'code' | 'tree';

function Segments<T extends string | number>({ label, value, options, change }: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  change(value: T): void;
}) {
  return (
    <div className={[form.segmented, s.segments].join(' ')} role="group" aria-label={label}>
      {options.map(([key, name]) => (
        <Button key={key} variant="ghost" aria-pressed={value === key}
          className={[form.segment, value === key && form.segmentSelected].filter(Boolean).join(' ')}
          onClick={() => change(key)}>{name}</Button>
      ))}
    </div>
  );
}

function editorAction(label: string, icon: ReactNode, click: () => void, disabled: boolean) {
  return (
    <Tooltip content={label}>
      <IconButton label={label} variant="ghost" size="sm" className={s.icon} disabled={disabled} onClick={click}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

export default function JsonFormatter({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [input, setInput] = useState<Input>({ text: sample, origin: { kind: 'sample' }, revision: 0 });
  const [mode, setMode] = useState<Mode>('quick');
  const [style, setStyle] = useState<OutputStyle>('formatted');
  const [spacing, setSpacing] = useState<2 | 4>(2);
  const [view, setView] = useState<View>('code');
  const [processed, setProcessed] = useState<Processed>();
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [processor] = useState(() => new JsonProcessor());
  const [nameFor] = useState(createJsonNamer);
  const fileRequest = useRef(0), copyRequest = useRef(0);
  const editor = useRef<TextEditorHandle>(null);
  const title = useId();

  const indent = style === 'minified' ? 0 : mode === 'quick' ? 2 : spacing;
  const indexed = processed?.revision === input.revision ? processed : undefined;
  const current = indexed?.indent === indent ? indexed : undefined;
  const result = current?.result;
  const output = result?.output;
  const pending = Boolean(input.text && !current);
  const rooted = indexed?.result?.root;
  const treeVisible = mode === 'advanced' && view === 'tree';
  const issue = current?.result?.issue;
  const diagnosis = useMemo(() => [...jsonLanguage, jsonDiagnostic(issue)], [issue]);

  useEffect(() => () => {
    fileRequest.current++;
    copyRequest.current++;
    processor.clear();
  }, [processor]);

  useEffect(() => {
    copyRequest.current++;
    setFeedback(undefined);
    if (!input.text) {
      processor.clear();
      setProcessed(undefined);
      return;
    }
    if (input.text.length > maxJsonInput) {
      processor.clear();
      setProcessed({ revision: input.revision, indent, result: { issue: { code: 'inputLimit' } } });
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      void processor.format(input.revision, input.text, indent).then(
        result => {
          if (active) setProcessed({ revision: input.revision, indent, result });
        },
        error => {
          if (active) setProcessed({ revision: input.revision, indent, error: workerMessage(locale, error) });
        },
      );
    }, input.text.length > 100_000 ? 160 : 35);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [input, indent, locale, processor]);

  const replace = (text: string, origin: Origin) => {
    setInput(previous => ({ text, origin, revision: previous.revision + 1 }));
    setFileError(undefined);
  };
  const edit = (text: string, origin: Origin) => {
    fileRequest.current++;
    setReading(false);
    replace(text, origin);
  };
  const load = async (files: File[]) => {
    const request = ++fileRequest.current;
    setReading(true);
    setFileError(undefined);
    try {
      if (files.length !== 1) fail('请一次导入一个 JSON 文件。', 'Import one JSON file at a time.');
      const file = files[0];
      const text = await readJsonFile(file);
      if (request === fileRequest.current) replace(text, { kind: 'file', name: file.name });
    } catch (error) {
      if (request === fileRequest.current) setFileError(errorText(error, locale));
    } finally {
      if (request === fileRequest.current) setReading(false);
    }
  };
  const copy = async () => {
    if (!result || output === undefined || reading) return;
    const request = ++copyRequest.current;
    let text;
    try {
      await navigator.clipboard.writeText(output);
      text = t('已复制', 'Copied');
    } catch {
      text = t('无法复制结果。', 'Could not copy the result.');
    }
    if (request === copyRequest.current) setFeedback(text);
  };
  const download = () => {
    if (output === undefined || reading) return;
    const filename = input.origin.kind === 'file' ? input.origin.name : '';
    saveBlob(new Blob([output], { type: jsonMime }), nameFor(filename, style));
  };

  const status = pending ? t('正在处理…', 'Processing…')
    : current?.error || (issue && !('offset' in issue) && !rooted) ? t('处理失败', 'Processing failed')
    : rooted ? t('JSON 有效', 'Valid JSON')
    : t('JSON 无效', 'Invalid JSON');
  const source = input.origin.kind === 'sample' ? t('示例 JSON', 'Sample JSON')
    : input.origin.kind === 'file' ? input.origin.name : t('编辑器输入', 'Editor input');
  const originalTitle = t('原始 JSON', 'Original JSON');
  const resultTitle = t('结果', 'Result');
  const deliveryDisabled = output === undefined || reading;

  const location = (issue: JsonIssue) => 'offset' in issue && issue.code !== 'empty' && (
    <Button size="sm" variant="ghost" className={s.jump} onClick={() => editor.current?.focusAt(issue.offset)}>
      {t('第 ' + issue.line + ' 行，第 ' + issue.column + ' 列', 'Line ' + issue.line + ', column ' + issue.column)}
    </Button>
  );

  return (
    <Frame locale={locale}>
      <section className={s.workspace} aria-labelledby={title} data-json-language-license={notice}>
        <TextWorkbench toolbar={
          <div className={s.toolbar}>
            <header className={s.heading}>
              <div>
                <h2 id={title}>{t('JSON 工作区', 'JSON workspace')}</h2>
                <p className={s.source}>{source}</p>
              </div>
              <Segments<Mode> label={t('工作区模式', 'Workspace mode')} value={mode} change={setMode}
                options={[[ 'quick', t('快速', 'Quick') ], [ 'advanced', t('高级', 'Advanced') ]]} />
            </header>
            <div className={s.intake}>
              <FileDropzone
                appearance="compact" accept=".json" maxSizeBytes={maxJsonFile}
                label={t('导入 JSON', 'Import JSON')}
                issueMessages={{
                  count: t('请一次导入一个文件', 'Import one file at a time'),
                  size: t('文件不能超过 32 MiB', 'Files must be 32 MiB or smaller'),
                  type: t('请选择 .json 文件', 'Choose a .json file'),
                }}
                onFilesReceived={files => void load(files)}
              />
              <Button variant="ghost" size="sm" onClick={() => edit(sample, { kind: 'sample' })}>
                {t('载入示例', 'Load sample')}
              </Button>
              {reading && <span role="status" className={s.source}>{t('正在读取…', 'Reading file…')}</span>}
            </div>
            <ErrorText error={fileError} />
          </div>
        }>
          <TextEditorPane title={originalTitle}
            actions={editorAction(t('清空输入', 'Clear input'), <TrashIcon size={18} aria-hidden="true" />,
              () => edit('', { kind: 'editor' }), !input.text)}
            status={
              <>
                <div className={s.validation} role="status" data-state={pending ? 'pending' : rooted ? 'valid' : 'invalid'}>
                  {rooted && !pending ? <CheckCircleIcon size={16} aria-hidden="true" />
                    : pending ? null : <WarningCircleIcon size={16} aria-hidden="true" />}
                  {status}
                </div>
                {issue && <div className={s.issue}>{issueMessage(locale, issue)} {location(issue)}</div>}
                {!input.text && <span>{t('输入或粘贴 JSON 以开始。', 'Type or paste JSON to get started.')}</span>}
                <ErrorText error={current?.error} />
              </>
            }
          >
            <TextEditor value={input.text} ariaLabel={originalTitle} editorRef={editor}
              className={s.editor} lineWrapping={false} extensions={diagnosis}
              onChange={text => edit(text, input.origin.kind === 'file' ? input.origin : { kind: 'editor' })} />
          </TextEditorPane>
          <TextEditorPane title={resultTitle} busy={pending}
            actions={
              <>
                {editorAction(t('复制结果', 'Copy result'), <CopyIcon size={18} aria-hidden="true" />, () => void copy(), deliveryDisabled)}
                {editorAction(t('下载 JSON', 'Download JSON'), <DownloadSimpleIcon size={18} aria-hidden="true" />, download, deliveryDisabled)}
              </>
            }
            status={
              <div className={s.outputOptions}>
                <Segments<OutputStyle> label={t('输出方式', 'Output format')} value={style} change={setStyle}
                  options={[[ 'formatted', t('格式化', 'Format') ], [ 'minified', t('压缩', 'Minify') ]]} />
                {mode === 'advanced' && (
                  <div className={s.advanced}>
                    <Segments<View> label={t('结果视图', 'Result view')} value={view} change={setView}
                      options={[[ 'code', t('代码', 'Code') ], [ 'tree', t('树形', 'Tree') ]]} />
                    {style === 'formatted' && (
                      <Segments<2 | 4> label={t('缩进', 'Indentation')} value={spacing} change={setSpacing}
                        options={[[ 2, t('2 空格', '2 spaces') ], [ 4, t('4 空格', '4 spaces') ]]} />
                    )}
                  </div>
                )}
                {feedback && !deliveryDisabled && <span role="status">{feedback}</span>}
              </div>
            }
          >
            <div className={s.resultBody} hidden={treeVisible}>
              <TextEditor value={output ?? ''} ariaLabel={resultTitle} className={s.editor}
                lineWrapping={false} extensions={jsonLanguage} readOnly />
            </div>
            {view === 'tree' && (
              <div className={s.resultBody} hidden={!treeVisible}>
                {rooted && <JsonTree key={input.revision} root={rooted} locale={locale}
                  source={input.text} revision={input.revision} processor={processor} />}
              </div>
            )}
          </TextEditorPane>
        </TextWorkbench>
      </section>
    </Frame>
  );
}
