import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowsLeftRightIcon, CheckCircleIcon, CopyIcon, DownloadSimpleIcon, TrashIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { TextEditorPane } from '../../ui/text-editor/TextEditorPane';
import { TextWorkbench } from '../../ui/text-editor/TextWorkbench';
import form from '../../workbench/form-tool-layout.module.scss';
import { Frame, saveBlob, tr } from '../general/ui';
import type { ToolProps } from '../types';
import {
  codecSample, type Base64Variant, type CodecDirection, type CodecFamily, type CodecRequest,
  type Conversion, type UrlVariant,
} from './core';
import { codecMime, createCodecNamer } from './delivery';
import { codecIssue } from './messages';
import { backgroundThreshold, runCodec } from './processing';
import s from './codec.module.scss';

const initialInput = { text: codecSample({ family: 'url', direction: 'encode', variant: 'component' }), sample: true };
type Mode = 'quick' | 'advanced';
type Processed = { request: CodecRequest; result: Conversion };

function Segments<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange(value: T): void;
}) {
  return (
    <div className={[form.segmented, s.segments].join(' ')} role="group" aria-label={label}>
      {options.map(([key, name]) => (
        <Button key={key} variant="ghost" aria-pressed={value === key}
          className={[form.segment, value === key && form.segmentSelected].filter(Boolean).join(' ')}
          onClick={() => onChange(key)}>{name}</Button>
      ))}
    </div>
  );
}

function EditorAction({ label, icon, onClick, disabled }: {
  label: string; icon: ReactNode; onClick(): void; disabled: boolean;
}) {
  return (
    <Tooltip content={label}>
      <IconButton label={label} variant="ghost" size="sm" className={s.icon} disabled={disabled} onClick={onClick}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

export default function UrlBase64({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [input, setInput] = useState(initialInput);
  const [mode, setMode] = useState<Mode>('quick');
  const [family, setFamily] = useState<CodecFamily>('url');
  const [direction, setDirection] = useState<CodecDirection>('encode');
  const [urlVariant, setUrlVariant] = useState<UrlVariant>('component');
  const [alphabet, setAlphabet] = useState<Base64Variant>('standard');
  const [padding, setPadding] = useState({ standard: true, url: false });
  const [processed, setProcessed] = useState<Processed>();
  const [feedback, setFeedback] = useState<{ request: CodecRequest; message: string }>();
  const [nameFor] = useState(createCodecNamer);
  const copyRequest = useRef(0);
  const title = useId();

  const advanced = mode === 'advanced';
  const activeUrl = advanced && family === 'url' ? urlVariant : 'component';
  const activeAlphabet = advanced && family === 'base64' ? alphabet : 'standard';
  const activePadding = !advanced || family !== 'base64' || direction === 'decode' || padding[activeAlphabet];
  const request = useMemo<CodecRequest>(() => ({
    input: input.text,
    options: family === 'url'
      ? { family, direction, variant: activeUrl }
      : { family, direction, variant: activeAlphabet, padding: activePadding },
  }), [input.text, family, direction, activeUrl, activeAlphabet, activePadding]);
  const result = processed?.request === request ? processed.result : undefined;
  const output = result && 'output' in result ? result.output : '';
  const issue = result && 'issue' in result ? result.issue : undefined;
  const busy = Boolean(input.text && !result);
  const canDeliver = output.length > 0;

  useEffect(() => {
    setProcessed(undefined);
    setFeedback(undefined);
    if (!request.input) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void runCodec(request, controller.signal).then(result => {
        if (!controller.signal.aborted) setProcessed({ request, result });
      }, () => {
        if (!controller.signal.aborted) setProcessed({ request, result: { issue: 'worker' } });
      });
    }, request.input.length >= backgroundThreshold ? 120 : 0);
    return () => {
      copyRequest.current++;
      clearTimeout(timer);
      controller.abort();
    };
  }, [request]);

  const copy = async () => {
    if (!canDeliver) return;
    const id = ++copyRequest.current;
    let message;
    try {
      await navigator.clipboard.writeText(output);
      message = t('已复制', 'Copied');
    } catch {
      message = t('复制失败，请手动选择复制。', 'Copy failed. Select and copy the result manually.');
    }
    if (id === copyRequest.current) setFeedback({ request, message });
  };

  const download = () => {
    if (canDeliver) saveBlob(new Blob([output], { type: codecMime }), nameFor(request.options));
  };

  const swap = () => {
    if (!canDeliver) return;
    setInput({ text: output, sample: false });
    setDirection(direction === 'encode' ? 'decode' : 'encode');
  };

  const inputLabel = t('输入', 'Input');
  const resultLabel = t('结果', 'Result');
  const clearLabel = t('清空输入', 'Clear input');
  const swapLabel = t('反向查看', 'Swap & reverse');
  const status = issue ? codecIssue(locale, issue)
    : busy ? t('处理中…', 'Processing…')
    : canDeliver ? t('转换成功', 'Converted')
    : result ? t('结果为空', 'No output') : '';
  const count = result?.characters;
  const formattedCount = count?.toLocaleString(locale);

  return (
    <Frame locale={locale}>
      <section className={s.codecWorkspace} aria-labelledby={title} data-url-base64>
        <TextWorkbench toolbar={
          <div className={s.codecToolbar}>
            <header className={s.heading}>
              <div>
                <h2 id={title}>{t('文本编解码工作区', 'Text codec workspace')}</h2>
                <p className={s.source}>{input.sample ? t('示例文本', 'Sample text') : t('用户输入', 'Your text')} · UTF-8</p>
              </div>
              <Segments<Mode> label={t('工作区模式', 'Workspace mode')} value={mode} onChange={setMode}
                options={[[ 'quick', t('快速', 'Quick') ], [ 'advanced', t('高级', 'Advanced') ]]} />
            </header>
            <div className={s.operations}>
              <Segments<CodecFamily> label={t('编解码类型', 'Codec family')} value={family} onChange={setFamily}
                options={[[ 'url', 'URL' ], [ 'base64', 'Base64' ]]} />
              <Button variant="ghost" className={s.sample}
                onClick={() => setInput({ text: codecSample(request.options), sample: true })}>
                {t('载入示例', 'Load sample')}
              </Button>
              <div className={s.direction}>
                <Segments<CodecDirection> label={t('转换方向', 'Direction')} value={direction} onChange={setDirection}
                  options={[[ 'encode', t('编码', 'Encode') ], [ 'decode', t('解码', 'Decode') ]]} />
              </div>
            </div>
            {advanced && (
              <div className={s.options}>
                {family === 'url' ? (
                  <Segments<UrlVariant> label={t('URL 处理方式', 'URL type')} value={urlVariant} onChange={setUrlVariant}
                    options={[
                      [ 'component', t('URL 组件', 'URL component') ],
                      [ 'full', t('完整 URL', 'Full URL') ],
                      [ 'form', t('表单参数', 'Form value') ],
                    ]} />
                ) : (
                  <>
                    <Segments<Base64Variant> label={t('Base64 字母表', 'Base64 alphabet')} value={alphabet} onChange={setAlphabet}
                      options={[[ 'standard', t('标准 Base64', 'Standard Base64') ], [ 'url', 'Base64URL' ]]} />
                    {direction === 'encode' && (
                      <Segments<'pad' | 'omit'> label={t('Base64 补齐', 'Base64 padding')}
                        value={padding[alphabet] ? 'pad' : 'omit'}
                        onChange={value => setPadding(previous => ({ ...previous, [alphabet]: value === 'pad' }))}
                        options={[[ 'pad', t('使用 = 补齐', 'Pad with =') ], [ 'omit', t('省略补齐', 'Omit padding') ]]} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        }>
          <TextEditorPane title={inputLabel}
            actions={<EditorAction label={clearLabel} icon={<TrashIcon size={18} aria-hidden="true" />}
              onClick={() => setInput({ text: '', sample: false })} disabled={!input.text} />}
            status={count !== undefined && <span className={s.count}>
              {t(formattedCount + ' 字符', formattedCount + (count === 1 ? ' character' : ' characters'))}
            </span>}
          >
            <TextEditor ariaLabel={inputLabel} value={input.text} className={s.editor}
              onChange={text => setInput({ text, sample: false })} lineNumbers={false} lineWrapping={false}
              preserveCarriageReturns placeholder={t('在这里输入或粘贴文本…', 'Type or paste text here…')} />
          </TextEditorPane>
          <TextEditorPane title={resultLabel} busy={busy}
            actions={
              <>
                <EditorAction label={t('复制结果', 'Copy result')} icon={<CopyIcon size={18} aria-hidden="true" />}
                  onClick={() => void copy()} disabled={!canDeliver} />
                <EditorAction label={t('下载 TXT', 'Download TXT')} icon={<DownloadSimpleIcon size={18} aria-hidden="true" />}
                  onClick={download} disabled={!canDeliver} />
              </>
            }
            status={
              <div className={s.codecResultStatus}>
                <div className={s.resultMessage}>
                  <span className={s.status} data-state={issue ? 'error' : canDeliver ? 'success' : undefined} role="status">
                    {issue ? <WarningCircleIcon size={16} aria-hidden="true" />
                      : canDeliver && <CheckCircleIcon size={16} aria-hidden="true" />}
                    {status}
                  </span>
                  {feedback?.request === request && <span role="status">{feedback.message}</span>}
                </div>
                <Button variant="ghost" size="sm" className={s.swap} disabled={!canDeliver} onClick={swap}>
                  <ArrowsLeftRightIcon size={17} aria-hidden="true" />
                  {swapLabel}
                </Button>
              </div>
            }
          >
            <TextEditor ariaLabel={resultLabel} value={output} className={s.editor} readOnly lineNumbers={false} lineWrapping={false}
              preserveCarriageReturns placeholder={t('转换结果显示在这里', 'Converted text appears here')} />
          </TextEditorPane>
        </TextWorkbench>
      </section>
    </Frame>
  );
}
