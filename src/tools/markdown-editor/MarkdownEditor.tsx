import {
  useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent,
} from 'react';
import { EditorState, Transaction, type Text } from '@codemirror/state';
import { isolateHistory, redo, undo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { ArrowsInLineHorizontalIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { Frame, errorText, saveBlob, tr } from '../general/ui';
import dialog from '../../ui/ConfirmDialog.module.scss';
import { MarkdownSource, replaceFile, sourceState, type SourceState } from './MarkdownSource';
import { Toolbar, type ViewMode } from './Toolbar';
import { formatCommand, type Format } from './commands';
import { autoPreviewLimit, example, renderMarkdown } from './core';
import { defaultName, exportName, htmlDocument, readMarkdown } from './delivery';
import { useScrollSync } from './scrollSync';
import dependencyNotice from './dependencies.NOTICE.txt?url&no-inline';
import editorNotice from '../../ui/text-editor/codemirror.NOTICE.txt?url&no-inline';
import './article.css';
import s from './markdown.module.scss';

type Rendered = { doc: Text; html: string; images: boolean };
type Refresh = { doc: Text };
type Replacement = { text: string; name: string };
const mobile = '(max-width: 640px)';

function DocumentName({ name, label, onRename }: { name: string; label: string; onRename: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (refocus.current) {
      refocus.current = false;
      trigger.current?.focus();
    }
  }, [editing]);

  return editing
    ? <input ref={input} type="text" aria-label={label} className={s.filename} defaultValue={name} spellCheck={false}
        onBlur={event => { onRename(event.currentTarget.value); setEditing(false); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || (event.key !== 'Enter' && event.key !== 'Escape')) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Enter') onRename(event.currentTarget.value);
          refocus.current = true;
          setEditing(false);
        }}
      />
    : <button ref={trigger} type="button" className={s.filename} aria-label={`${label} ${name}`} title={name}
        onClick={() => setEditing(true)}>{name}</button>;
}

export default function MarkdownEditor({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [source, setSource] = useState<SourceState>(() => sourceState(EditorState.create({ doc: example })));
  // Astro renders Split on the server; resolve the viewport after hydration.
  const [mode, setMode] = useState<ViewMode>('split');
  const [narrow, setNarrow] = useState(false);
  const [ratio, setRatio] = useState(50);
  const [sync, setSync] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [images, setImages] = useState(true);
  const [rendered, setRendered] = useState<Rendered>();
  const [previewError, setPreviewError] = useState<{ doc: Text; images: boolean; message: string }>();
  const [refresh, setRefresh] = useState<Refresh>();
  const [replacement, setReplacement] = useState<Replacement>();
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [drop, setDrop] = useState(false);
  const view = useRef<EditorView | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const panes = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saved = useRef({ doc: source.doc, file: source.file.id });
  const fileId = useRef(0);
  const activeFile = useRef(source.file.id);
  const scroll = useRef({ editor: 0, preview: 0 });
  const importId = useRef(0);
  const importOrigin = useRef<HTMLElement | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const ownedFullscreen = useRef(false);

  const filename = source.file.name;
  const showEditor = mode !== 'preview', showPreview = mode !== 'editor';
  const current = rendered?.doc === source.doc && rendered.images === images;
  const paused = source.doc.length > autoPreviewLimit && refresh?.doc !== source.doc;
  const failed = previewError?.doc === source.doc && previewError.images === images ? previewError.message : undefined;
  const visibleHtml = rendered?.images && !images ? undefined : rendered?.html;
  const updateGeometry = useScrollSync(mode === 'split' && sync && current, view, preview, article, visibleHtml);

  useEffect(() => {
    if (!showPreview || paused) return;
    let canceled = false;
    const timer = window.setTimeout(async () => {
      try {
        const html = await renderMarkdown(source.doc.toString(), { preview: true, allowImages: images, locale });
        if (!canceled && view.current?.state.doc === source.doc) {
          setRendered({ doc: source.doc, html, images });
          setPreviewError(undefined);
        }
      } catch (e) {
        if (!canceled) setPreviewError({ doc: source.doc, images, message: errorText(e, locale) });
      }
    }, refresh?.doc === source.doc ? 0 : source.doc.length > 48_000 ? 350 : 120);
    return () => { canceled = true; window.clearTimeout(timer); };
  }, [source.doc, images, locale, paused, refresh, showPreview]);

  useLayoutEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(mobile);
    const change = () => setNarrow(query.matches);
    change();
    if (query.matches) setMode('editor');
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (showEditor && view.current) {
        view.current.scrollDOM.scrollTop = scroll.current.editor;
        view.current.requestMeasure();
      }
      if (showPreview && preview.current) preview.current.scrollTop = scroll.current.preview;
    });
    return () => cancelAnimationFrame(frame);
  }, [showEditor, showPreview]);

  useEffect(() => {
    const onFullscreen = () => {
      if (ownedFullscreen.current && document.fullscreenElement !== document.documentElement) {
        ownedFullscreen.current = false;
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      importId.current++;
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (ownedFullscreen.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [fullscreen]);

  function changeMode(next: ViewMode) {
    if (next === mode) return;
    if (showEditor && view.current) scroll.current.editor = view.current.scrollDOM.scrollTop;
    if (showPreview && preview.current) scroll.current.preview = preview.current.scrollTop;
    setMode(next);
  }

  function exitFullscreen() {
    setFullscreen(false);
    if (ownedFullscreen.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
  }

  function toggleFullscreen() {
    if (fullscreen) { exitFullscreen(); return; }
    setFullscreen(true);
    if (document.fullscreenEnabled && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().then(() => {
        if (workspace.current) ownedFullscreen.current = true;
        else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      }).catch(() => { /* The workspace can still fill the viewport. */ });
    }
  }

  function runFormat(format: Format) {
    const editor = view.current;
    if (!editor) return;
    if (!showEditor) changeMode('editor');
    if (formatCommand(format)(editor)) requestAnimationFrame(() => { if (view.current === editor) editor.focus(); });
  }

  function history(action: typeof undo) {
    const editor = view.current;
    if (!editor || editor.composing) return;
    if (!showEditor) changeMode('editor');
    action(editor);
    requestAnimationFrame(() => { if (view.current === editor) editor.focus(); });
  }

  function find() {
    const editor = view.current;
    if (!editor) return;
    if (!showEditor) changeMode('editor');
    requestAnimationFrame(() => { if (view.current === editor) openSearchPanel(editor); });
  }

  function replaceDocument(next: Replacement) {
    const editor = view.current;
    if (!editor) return;
    const id = ++fileId.current;
    importId.current++;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: next.text },
      selection: { anchor: 0 }, effects: [EditorView.scrollIntoView(0), replaceFile.of({ id, name: next.name })],
      annotations: Transaction.userEvent.of('input.replace'),
    });
    saved.current = { doc: editor.state.doc, file: id };
    setRendered(undefined);
    setRefresh(undefined);
    setPreviewError(undefined);
    setMessage(undefined);
    scroll.current = { editor: 0, preview: 0 };
    if (preview.current) preview.current.scrollTop = 0;
  }

  function replaceWithConfirmation(next: Replacement) {
    const editor = view.current;
    if (!editor) return;
    if (activeFile.current === saved.current.file && editor.state.doc.eq(saved.current.doc)) {
      replaceDocument(next);
    } else {
      const focused = document.activeElement;
      importOrigin.current = focused instanceof HTMLElement && workspace.current?.contains(focused) ? focused : null;
      setReplacement(next);
    }
  }

  async function importFile(file: File) {
    const id = ++importId.current;
    try {
      const text = await readMarkdown(file);
      if (id === importId.current) replaceWithConfirmation({ text, name: file.name });
    } catch (e) {
      if (id === importId.current) setMessage({ text: errorText(e, locale), error: true });
    }
  }

  function openFile() {
    const input = fileInput.current;
    if (!input) return;
    input.value = '';
    input.click();
  }

  function renameFile(value: string) {
    const editor = view.current;
    if (!editor) return;
    const file = sourceState(editor.state).file;
    const name = value.trim().replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/, '');
    if (!name || name === file.name) return;
    editor.dispatch({ effects: replaceFile.of({ ...file, name }), annotations: isolateHistory.of('full') });
  }

  async function deliver(format: 'md' | 'html', download: boolean) {
    const editor = view.current;
    if (!editor) return;
    const { doc, file } = sourceState(editor.state);
    const sourceText = doc.toString();
    let copying = false;
    if (format === 'html') setDeliveryBusy(true);
    try {
      const html = format === 'html' ? await renderMarkdown(sourceText, { locale }) : undefined;
      if (view.current?.state.doc !== doc || sourceState(view.current.state).file !== file) {
        if (view.current) setMessage({ text: t('文档已变化，请重新导出。', 'The document changed. Try exporting again.'), error: true });
        return;
      }
      if (download) {
        const content = html === undefined ? sourceText : htmlDocument(html, file.name, locale);
        const mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8';
        saveBlob(new Blob([content], { type: mime }), exportName(file.name, format));
        if (format === 'md') saved.current = { doc, file: file.id };
        setMessage({ text: t('下载已开始', 'Download started') });
      } else {
        copying = true;
        await navigator.clipboard.writeText(html ?? sourceText);
        setMessage({ text: t('已复制', 'Copied') });
      }
    } catch (e) {
      setMessage({ text: copying ? t('无法访问剪贴板。', 'Clipboard access failed.') : errorText(e, locale), error: true });
    } finally {
      if (format === 'html') setDeliveryBusy(false);
    }
  }

  async function copyCode(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-md-copy]');
    const code = button?.closest('.md-code')?.querySelector('pre code');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      setMessage({ text: t('代码已复制', 'Code copied') });
    } catch {
      setMessage({ text: t('无法访问剪贴板。', 'Clipboard access failed.'), error: true });
    }
  }

  const setSplit = (value: number) => setRatio(Math.min(75, Math.max(25, value)));
  function dragSplit(event: PointerEvent<HTMLDivElement>) {
    const bounds = panes.current?.getBoundingClientRect();
    if (!bounds || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setSplit(narrow ? (event.clientY - bounds.top) * 100 / bounds.height : (event.clientX - bounds.left) * 100 / bounds.width);
  }
  function splitKeys(event: KeyboardEvent<HTMLDivElement>) {
    const values: Record<string, number> = {
      [narrow ? 'ArrowUp' : 'ArrowLeft']: ratio - 3, [narrow ? 'ArrowDown' : 'ArrowRight']: ratio + 3,
      Home: 25, End: 75, Enter: 50,
    };
    if (Object.hasOwn(values, event.key)) {
      event.preventDefault();
      setSplit(values[event.key]);
    }
  }

  const nameControl = <DocumentName key={source.file.id} name={filename}
    label={t('编辑文件名', 'Edit file name')} onRename={renameFile} />;
  return <Frame locale={locale}>
    <link rel="license" href={dependencyNotice} />
    <link rel="license" href={editorNotice} />
    <div ref={workspace} className={s.workspace} data-markdown-workspace data-narrow={narrow || undefined} data-fullscreen={fullscreen || undefined}>
      <section className={s.shell} data-drop={drop || undefined} aria-label={t('Markdown 工作区', 'Markdown workspace')}
        onKeyDown={event => {
          if (fullscreen && event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); exitFullscreen(); }
        }}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDrop(true); } }}
        onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDrop(false); }}
        onDrop={event => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDrop(false);
          if (event.dataTransfer.files.length === 1) void importFile(event.dataTransfer.files[0]);
          else setMessage({ text: t('一次只打开一个文档。', 'Open one document at a time.'), error: true });
        }}
      >
        <input ref={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
        }} />
        <Toolbar t={t} mode={mode} onMode={changeMode} fullscreen={fullscreen} onFullscreen={toggleFullscreen}
          onOpen={openFile} undo={() => history(undo)} redo={() => history(redo)} canUndo={source.canUndo} canRedo={source.canRedo}
          onFormat={runFormat} onFind={find} onClear={() => replaceWithConfirmation({ text: '', name: filename })}
          onSample={() => replaceWithConfirmation({ text: example, name: defaultName })}
          busy={deliveryBusy} onDeliver={(format, download) => void deliver(format, download)}
          allowImages={images} onImages={setImages}
        />
        <div ref={panes} className={s.panes} data-view={mode} style={{ '--md-split': `${ratio}%` } as CSSProperties}>
          <section className={s.pane} hidden={!showEditor} aria-label={t('编辑区域', 'Editor pane')}>
            <header className={s.paneHeader}><span>Markdown</span>{showEditor && nameControl}</header>
            <MarkdownSource viewRef={view} locale={locale} onUpdate={next => {
              activeFile.current = next.file.id;
              setSource(next);
            }} onGeometry={() => updateGeometry.current()} />
          </section>
          <div hidden={mode !== 'split'} className={s.divider} role="separator" tabIndex={0}
            aria-label={t('分栏比例，按 Enter 恢复等宽', 'Split ratio, press Enter to reset')}
            aria-orientation={narrow ? 'horizontal' : 'vertical'} aria-valuemin={25} aria-valuemax={75} aria-valuenow={Math.round(ratio)}
            onKeyDown={splitKeys} onDoubleClick={() => setRatio(50)}
            onPointerDown={event => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragSplit(event);
            }} onPointerMove={dragSplit}
          ><span /></div>
          <section className={`${s.pane} ${s.previewPane}`} hidden={!showPreview} aria-label={t('预览区域', 'Preview pane')}>
            <header className={s.paneHeader}><span>{t('预览', 'Preview')}</span>{!showEditor && nameControl}</header>
            {(paused || failed || !current) && <div className={s.previewStatus} role={failed ? 'alert' : 'status'} data-paused={paused || undefined}>
              <span>{failed || (paused
                ? t('长文档已暂停自动预览。', 'Automatic preview is paused for this long document.')
                : visibleHtml === undefined ? t('正在准备预览…', 'Preparing preview…') : t('正在更新，当前显示上次预览。', 'Updating. Showing the previous preview.'))}</span>
              {(paused || failed) && <Button size="sm" variant="ghost" className={s.refresh} onClick={() => {
                setPreviewError(undefined); setRefresh({ doc: source.doc });
              }}>{t('刷新预览', 'Refresh preview')}</Button>}
            </div>}
            <div ref={preview} className={s.previewScroll} tabIndex={0} aria-label={t('Markdown 实时预览', 'Live Markdown preview')}>
              <div ref={article} data-markdown-article inert={!current} onClick={copyCode} dangerouslySetInnerHTML={{ __html: visibleHtml ?? '' }} />
            </div>
          </section>
        </div>
        <footer className={s.status}>
          <span>{t(`第 ${source.line} 行，第 ${source.column} 列`, `Ln ${source.line}, Col ${source.column}`)}</span>
          <span>{t(`${source.doc.lines} 行`, `${source.doc.lines} lines`)}</span>
          <span title={t('按 UTF-16 代码单元统计', 'Counted in UTF-16 code units')}>{source.doc.length.toLocaleString(locale)} {t('代码单元', 'code units')}</span>
          <span>UTF-8</span>
          <Button size="sm" variant="ghost" className={s.sync} aria-pressed={sync} disabled={mode !== 'split'}
            onClick={() => setSync(!sync)}>
            <ArrowsInLineHorizontalIcon size={14} aria-hidden="true" />
            {sync ? t('同步滚动', 'Sync scroll') : t('同步关闭', 'Sync off')}
          </Button>
        </footer>
        {(message || deliveryBusy) && <div className={s.feedback} role={message?.error && !deliveryBusy ? 'alert' : 'status'}>
          {deliveryBusy ? t('正在准备 HTML…', 'Preparing HTML…') : message?.text}
        </div>}
      </section>
      <AlertDialog.Root open={!!replacement} onOpenChange={open => { if (!open) setReplacement(undefined); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className={dialog.backdrop} />
          <AlertDialog.Popup className={dialog.popup} initialFocus={cancel} finalFocus={() => importOrigin.current ?? view.current?.contentDOM ?? false}>
            <AlertDialog.Title className={dialog.title}>{t('替换未保存的文档？', 'Replace the unsaved document?')}</AlertDialog.Title>
            <AlertDialog.Description className={dialog.description}>{t('当前更改尚未下载为 Markdown。', 'Your current changes have not been downloaded as Markdown.')}</AlertDialog.Description>
            <div className={dialog.actions}>
              <AlertDialog.Close render={<Button ref={cancel} />}>{t('取消', 'Cancel')}</AlertDialog.Close>
              <Button variant="danger" onClick={() => {
                if (replacement) replaceDocument(replacement);
                setReplacement(undefined);
              }}>{t('替换文档', 'Replace document')}</Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  </Frame>;
}
