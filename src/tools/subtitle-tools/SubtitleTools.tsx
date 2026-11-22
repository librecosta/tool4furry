import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ClipboardTextIcon, CodeIcon, CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { FileDropzone } from '../../ui/FileDropzone';
import { TextField } from '../../ui/TextField';
import form from '../../workbench/form-tool-layout.module.scss';
import type { ToolProps } from '../types';
import { ErrorText, Frame, errorText, saveBlob, tr } from '../general/ui';
import { fail } from '../general/bounds';
import {
  checkTextSize, editCue, formatTime, inspectCues, offsetMilliseconds, parseSubtitles, readSubtitleFile,
  serializeSubtitles, validateExport, validateShift, type ShiftDirection, type SubtitleDocument, type SubtitleFormat,
} from './core';
import { createSubtitleNamer, subtitleMime, subtitleStem } from './delivery';
import CueList, { cueCount, cueTime } from './CueList';
import SubtitleEditor, { type SubtitleDraft } from './SubtitleEditor';
import s from './subtitle.module.scss';

type Origin = { kind: 'sample' | 'paste' } | { kind: 'file'; name: string };
type Mode = 'quick' | 'advanced';
type Workspace = { document: SubtitleDocument; origin: Origin; raw?: string; revision: number };

const formatName = { srt: 'SRT', vtt: 'WebVTT' };
const sampleTimes = [[1000, 3000], [3500, 5500], [6000, 8000]];
function sampleSource(locale: Locale) {
  const lines = locale === 'zh'
    ? ['欢迎使用 Tool4Furry。', '现在可以预览每一条字幕。', '转换后直接下载文件。']
    : ['Welcome to Tool4Furry.', 'Preview each subtitle cue here.', 'Choose a format and download your subtitles.'];
  return sampleTimes.map(([start, end], i) =>
    [String(i + 1), formatTime(start, false) + ' --> ' + formatTime(end, false), lines[i]].join('\n'),
  ).join('\n\n') + '\n';
}

function Segments<T extends string>({ label, value, options, onChange, stretch = false }: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  stretch?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className={[form.segmented, stretch && s.stretch].filter(Boolean).join(' ')}>
      {options.map(([key, text]) => (
        <Button key={key} variant="ghost" aria-pressed={key === value}
          className={[form.segment, key === value && form.segmentSelected].filter(Boolean).join(' ')} onClick={() => onChange(key)}>
          {text}
        </Button>
      ))}
    </div>
  );
}

export default function SubtitleTools({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [ready, setReady] = useState(false);
  const [work, setWork] = useState<Workspace>(() => {
    const raw = sampleSource(locale);
    return { document: parseSubtitles(raw), origin: { kind: 'sample' }, raw, revision: 0 };
  });
  const [mode, setMode] = useState<Mode>('quick');
  const [format, setFormat] = useState<SubtitleFormat>('vtt');
  const [direction, setDirection] = useState<ShiftDirection>('later');
  const [seconds, setSeconds] = useState('0');
  const [draft, setDraft] = useState<SubtitleDraft>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [intakeError, setIntakeError] = useState<string>();
  const [deliveryError, setDeliveryError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const request = useRef(0), feedback = useRef(0);
  const [nameFor] = useState(createSubtitleNamer);
  const workspaceTitle = useId(), outputTitle = useId();

  const { document, origin } = work;
  const facts = useMemo(() => inspectCues(document), [document]);
  const { offset, outputError } = useMemo(() => {
    let offset = 0;
    try {
      const candidate = offsetMilliseconds(seconds, direction);
      validateShift(document, facts, candidate);
      offset = candidate;
      validateExport(document, facts, format, offset);
      return { offset };
    } catch (error) {
      return { offset, outputError: errorText(error, locale) };
    }
  }, [document, facts, seconds, direction, format, locale]);
  const blocked = reading || !!intakeError || !!draft || !!outputError;
  const filename = origin.kind === 'file' ? origin.name : undefined;
  const losses = {
    settings: t('定位设置', 'positioning settings'), ids: t('字幕标识', 'cue identifiers'),
    header: t('文件头说明', 'header text'), timedText: t('内嵌时间戳的播放语义', 'inline timestamp playback'),
  };
  const incompatible = format === 'srt' ? [...facts.losses].map(key => losses[key]) : [];
  const title = origin.kind === 'sample' ? t('示例字幕', 'Sample subtitles') : filename ?? t('粘贴的字幕', 'Pasted subtitles');
  const range = cueTime(document.cues[facts.first].start + offset) + ' – ' + cueTime(document.cues[facts.last].end + offset);
  const large = document.cues.length > 5000 || (work.raw?.length ?? facts.textUnits) > 1_000_000;

  useEffect(() => {
    setReady(true);
    return () => { request.current++; feedback.current++; };
  }, []);
  useEffect(() => {
    feedback.current++;
    setCopied(false);
    setDeliveryError(undefined);
  }, [document, origin, format, seconds, direction, blocked]);

  const replace = (next: SubtitleDocument, nextOrigin: Origin, raw: string, resetOffset: boolean) => {
    setWork(previous => ({ document: next, origin: nextOrigin, raw, revision: previous.revision + 1 }));
    if (resetOffset) {
      setSeconds('0');
      setDirection('later');
    }
    setIntakeError(undefined);
  };
  const loadSample = () => {
    request.current++;
    setReading(false);
    const raw = sampleSource(locale);
    replace(parseSubtitles(raw), { kind: 'sample' }, raw, true);
  };
  const loadFile = async (files: File[]) => {
    const ticket = ++request.current;
    setReading(true);
    setIntakeError(undefined);
    try {
      if (files.length !== 1) fail('请一次导入一个字幕文件。', 'Import one subtitle file at a time.');
      const file = files[0];
      const raw = await readSubtitleFile(file);
      if (ticket !== request.current) return;
      replace(parseSubtitles(raw), { kind: 'file', name: file.name }, raw, true);
    } catch (error) {
      if (ticket === request.current) setIntakeError(errorText(error, locale));
    } finally {
      if (ticket === request.current) setReading(false);
    }
  };
  const openEditor = (next: SubtitleDraft) => {
    setDraft(next);
    setEditorOpen(true);
  };
  const cancelEditor = () => {
    setEditorOpen(false);
    setDraft(undefined);
  };
  const hideEditor = () => {
    setEditorOpen(false);
    if (!draft?.dirty && !draft?.error) setDraft(undefined);
  };
  const openSource = () => {
    try {
      const value = work.raw ?? serializeSubtitles(document, document.format, 0, facts, true);
      openEditor({ kind: 'source', value, dirty: false });
    } catch (error) {
      setDeliveryError(errorText(error, locale));
    }
  };
  const openCue = (index: number) => {
    const cue = document.cues[index];
    openEditor({ kind: 'cue', index, start: formatTime(cue.start), end: formatTime(cue.end), text: cue.text, dirty: false });
  };
  const applyDraft = () => {
    if (!draft) return;
    try {
      if (draft.kind === 'cue') {
        const original = document.cues[draft.index];
        const updated = editCue(original, draft.index + 1, draft.start, draft.end, draft.text, document.format);
        checkTextSize(facts.textUnits - original.text.length + updated.text.length);
        const preceding = document.cues[draft.index - 1], following = document.cues[draft.index + 1];
        if (document.format === 'vtt' && ((preceding && updated.start < preceding.start) || (following && updated.start > following.start)))
          fail('第 ' + (draft.index + 1) + ' 条字幕：WebVTT 开始时间需保持原列表顺序。',
            'Cue ' + (draft.index + 1) + ': WebVTT start times must follow the current cue order.');
        const cues = document.cues.slice();
        cues[draft.index] = updated;
        setWork({ ...work, document: { ...document, cues }, raw: undefined });
      } else {
        const parsed = parseSubtitles(draft.value);
        const pasting = draft.kind === 'paste';
        replace(parsed, pasting ? { kind: 'paste' } : origin, draft.value, pasting);
      }
      cancelEditor();
    } catch (error) {
      setDraft({ ...draft, error: errorText(error, locale) });
    }
  };

  const deliver = async (action: 'copy' | 'download') => {
    if (blocked) return;
    const ticket = ++feedback.current;
    setCopied(false);
    setDeliveryError(undefined);
    try {
      const text = serializeSubtitles(document, format, offset, facts);
      if (action === 'download') {
        saveBlob(new Blob([text], { type: subtitleMime[format] }), nameFor(filename, format));
      } else {
        try { await navigator.clipboard.writeText(text); }
        catch { fail('复制失败。你可以下载字幕文件。', 'Copy failed. You can download the subtitle file instead.'); }
        if (ticket === feedback.current) setCopied(true);
      }
    } catch (error) {
      if (ticket === feedback.current) setDeliveryError(errorText(error, locale));
    }
  };

  return (
    <Frame locale={locale}>
      <section className={s.workspace} data-subtitle-tools aria-labelledby={workspaceTitle} aria-busy={!ready} inert={!ready}>
        <header className={s.workspaceHeader}>
          <div className={s.identity}>
            <h2 id={workspaceTitle}>{t('字幕工作区', 'Subtitle workspace')}</h2>
            <p className={s.meta}>
              <strong data-subtitle-origin>{title}</strong>
              <span>{formatName[document.format]}</span>
              <span>{cueCount(document.cues.length, locale)}</span>
              <span className={s.timing}>{range}</span>
            </p>
          </div>
          <Segments<Mode> label={t('工作区模式', 'Workspace mode')} value={mode} onChange={setMode}
            options={ [['quick', t('快速', 'Quick')], ['advanced', t('高级', 'Advanced')]] } />
        </header>
        <div className={s.intake}>
          <FileDropzone appearance="compact" accent="lavender" accept=".srt,.vtt"
            label={t('导入 SRT / VTT', 'Import SRT / VTT')} disabled={!!draft} onFilesReceived={files => void loadFile(files)}
            issueMessages={{ type: t('格式不支持', 'Unsupported format'), size: t('文件过大', 'File is too large'), count: t('文件过多', 'Too many files') }} />
          <div className={s.intakeActions}>
            <Button variant="ghost" disabled={reading || !!draft} onClick={() => openEditor({ kind: 'paste', value: '', dirty: false })}>
              <ClipboardTextIcon size={17} aria-hidden />{t('粘贴文本', 'Paste text')}
            </Button>
            <Button variant="ghost" disabled={!!draft} onClick={loadSample}>{t('载入示例', 'Load sample')}</Button>
          </div>
        </div>
        {reading && <p role="status" className={s.muted}>{t('正在读取字幕文件…', 'Reading subtitle file…')}</p>}
        {intakeError && (
          <div className={s.feedback}>
            <ErrorText error={intakeError} />
            <Button variant="ghost" size="sm" onClick={() => setIntakeError(undefined)}>
              {t('继续使用当前字幕', 'Keep current subtitles')}
            </Button>
          </div>
        )}
        {draft && !editorOpen && (
          <div className={s.feedback}>
            <p role="status" className={s.muted}>{t('有未应用的编辑草稿。', 'You have an unapplied draft.')}</p>
            <Button variant="ghost" size="sm" onClick={() => setEditorOpen(true)}>{t('继续编辑', 'Resume editing')}</Button>
            <Button variant="ghost" size="sm" onClick={cancelEditor}>{t('舍弃草稿', 'Discard draft')}</Button>
          </div>
        )}
        <div className={[form.container, form.expanded, form.columns, form.fileForm, s.columns].join(' ')} data-form-file>
          <div className={form.fileWorkspace} data-form-workspace>
            <CueList key={work.revision} cues={document.cues} offset={offset} locale={locale} editable={mode === 'advanced'}
              disabled={reading || !!intakeError || !!draft} edit={openCue} />
          </div>
          <aside className={form.settingsPanel} aria-labelledby={outputTitle} data-form-settings>
            <h3 className={form.settingsTitle} id={outputTitle}>{t('输出设置', 'Output settings')}</h3>
            <div className={s.setting}>
              <span className={s.label}>{t('输出格式', 'Output format')}</span>
              <Segments<SubtitleFormat> label={t('输出格式', 'Output format')} value={format}
                onChange={setFormat} options={ [['srt', 'SRT'], ['vtt', 'WebVTT']] } stretch />
            </div>
            {mode === 'advanced'
              ? <div className={s.timingSettings}>
                <h4>{t('整体时间调整', 'Overall time shift')}</h4>
                <Segments<ShiftDirection> label={t('调整方向', 'Shift direction')} value={direction} onChange={setDirection}
                  options={ [['earlier', t('提前', 'Earlier')], ['later', t('延后', 'Later')]] } stretch />
                <TextField label={t('调整量（秒）', 'Amount (seconds)')} value={seconds} onChange={setSeconds} inputMode="decimal" placeholder="0.000" />
              </div>
              : offset !== 0 && <p className={s.muted}>{t('已应用时间调整', 'Time shift applied')} {offset > 0 ? '+' : '−'}{Math.abs(offset) / 1000} s</p>}
            <p className={s.outputTarget}>{subtitleStem(filename)}.{format}</p>
            {incompatible.length > 0 && <p role="status" className={s.warning}>
              {t('SRT 无法保留以下 WebVTT 信息：', 'SRT cannot preserve these WebVTT details: ')}
              {incompatible.join(t('、', ', '))}{t('。', '.')}
            </p>}
            {large && <p className={s.muted}>{t('字幕较多，列表分页显示。复制和下载仍包含全部字幕。', 'This is a large subtitle set. Pages limit the preview only. Copy and download include every cue.')}</p>}
            <ErrorText error={outputError ?? deliveryError} />
            <div className={s.delivery}>
              <Button variant="primary" disabled={blocked} onClick={() => void deliver('download')}>
                <DownloadSimpleIcon size={18} aria-hidden />{t('下载 ', 'Download ') + formatName[format]}
              </Button>
              <Tooltip content={t('复制字幕', 'Copy subtitles')}>
                <IconButton variant="ghost" label={t('复制字幕', 'Copy subtitles')} disabled={blocked} onClick={() => void deliver('copy')}>
                  <CopyIcon size={18} aria-hidden />
                </IconButton>
              </Tooltip>
            </div>
            {copied && <span role="status" className={s.muted}>{t('已复制字幕', 'Subtitles copied')}</span>}
            {mode === 'advanced' && (
              <Button variant="ghost" className={s.sourceAction} disabled={reading || !!intakeError || !!draft} onClick={openSource}>
                <CodeIcon size={17} aria-hidden />{t('查看 / 编辑源码', 'View / edit source')}
              </Button>
            )}
          </aside>
        </div>
      </section>
      {draft && <SubtitleEditor draft={draft} open={editorOpen} locale={locale} change={setDraft}
        hide={hideEditor} cancel={cancelEditor} apply={applyDraft} />}
    </Frame>
  );
}
