import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CopyIcon, DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { TextEditorPane } from '../../ui/text-editor/TextEditorPane';
import { TextWorkbench } from '../../ui/text-editor/TextWorkbench';
import { Frame, tr, errorText, saveBlob } from '../general/ui';
import { runComparison } from './comparison';
import { diffReport, diffDownloadName } from './report';
import { DiffViewer } from './DiffViewer';
import type { DiffResult } from './core';
import notice from './diff.NOTICE.txt?url';
import s from './diff.module.scss';

type Snapshot = { left: string; right: string; ignore: boolean; result?: DiffResult; error?: string };
const emptyResult = (ignore: boolean): DiffResult => ({ lines: [], added: 0, removed: 0, changes: 0, oldCount: 0, newCount: 0, ignoreEndWhitespace: ignore, eof: { old: false, new: false, changed: false }, endings: { old: 'none', new: 'none' } });

export default function TextDiff({ locale }: ToolProps) {
  const [left, setLeft] = useState(''), [right, setRight] = useState('');
  const [ignore, setIgnore] = useState(false), [changesOnly, setChangesOnly] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({ left: '', right: '', ignore: false, result: emptyResult(false) });
  const [message, setMessage] = useState('');
  const feedback = useRef(0);
  const current = snapshot.left === left && snapshot.right === right && snapshot.ignore === ignore;
  const result = current ? snapshot.result : undefined;
  const enabled = !!result && !!(left || right);
  useEffect(() => {
    const controller = new AbortController();
    feedback.current++; setMessage('');
    const timer = setTimeout(() => {
      const finish = (value: Pick<Snapshot, 'result' | 'error'>) => {
        if (!controller.signal.aborted) setSnapshot({ left, right, ignore, ...value });
      };
      if (!left && !right) { finish({ result: emptyResult(ignore) }); return; }
      void runComparison({ left, right, ignore }, controller.signal).then(
        result => finish({ result }),
        error => { if (!controller.signal.aborted) finish({ error: errorText(error, locale) }); },
      );
    }, left.length + right.length > 100_000 ? 120 : 40);
    return () => { clearTimeout(timer); controller.abort(); feedback.current++; };
  }, [left, right, ignore, locale]);
  useEffect(() => { feedback.current++; setMessage(''); }, [changesOnly]);
  const copy = async () => {
    if (!enabled) return;
    const token = ++feedback.current;
    try {
      await navigator.clipboard.writeText(diffReport(result!, changesOnly, locale));
      if (token === feedback.current) setMessage(tr(locale, '已复制差异报告', 'Difference report copied'));
    } catch {
      if (token === feedback.current) setMessage(tr(locale, '复制失败，请下载 TXT 或选择文本复制。', 'Copy failed. Download the TXT or select text to copy.'));
    }
  };
  const action = (label: string, icon: ReactNode, onClick: () => void, disabled: boolean) => <Tooltip content={label}>
    <IconButton label={label} variant="ghost" size="sm" className={s.icon} disabled={disabled} onClick={onClick}>{icon}</IconButton>
  </Tooltip>;
  return <Frame locale={locale}>
    <div className={s.workspace} data-text-diff>
      <span hidden data-diff-license={notice} />
      <TextWorkbench>
        <TextEditorPane title={tr(locale, '原文', 'Original')}
          actions={action(tr(locale, '清空原文', 'Clear original'), <TrashIcon size={18} aria-hidden="true" />, () => setLeft(''), !left)}
          status={result?.oldCount ? tr(locale, `${result.oldCount.toLocaleString(locale)} 行`, `${result.oldCount.toLocaleString(locale)} lines`) : ''}>
          <TextEditor ariaLabel={tr(locale, '原文', 'Original')} value={left} onChange={setLeft} placeholder={tr(locale, '输入或粘贴原文…', 'Type or paste the original text…')} />
        </TextEditorPane>
        <TextEditorPane title={tr(locale, '新文本', 'Revised')}
          actions={action(tr(locale, '清空新文本', 'Clear revised'), <TrashIcon size={18} aria-hidden="true" />, () => setRight(''), !right)}
          status={result?.newCount ? tr(locale, `${result.newCount.toLocaleString(locale)} 行`, `${result.newCount.toLocaleString(locale)} lines`) : ''}>
          <TextEditor ariaLabel={tr(locale, '新文本', 'Revised')} value={right} onChange={setRight} placeholder={tr(locale, '输入或粘贴新文本…', 'Type or paste the revised text…')} />
        </TextEditorPane>
      </TextWorkbench>
      <DiffViewer locale={locale} result={result} error={current ? snapshot.error : undefined} busy={!current} ignore={ignore} setIgnore={setIgnore} changesOnly={changesOnly} setChangesOnly={setChangesOnly} message={message}
        actions={<>
          {action(tr(locale, '复制差异报告', 'Copy difference report'), <CopyIcon size={18} aria-hidden="true" />, () => void copy(), !enabled)}
          {action(tr(locale, '下载 TXT', 'Download TXT'), <DownloadSimpleIcon size={18} aria-hidden="true" />, () => {
            if (enabled) saveBlob(new Blob([diffReport(result!, changesOnly, locale)], { type: 'text/plain;charset=utf-8' }), diffDownloadName());
          }, !enabled)}
        </>} />
    </div>
  </Frame>;
}
