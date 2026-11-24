import { useEffect, useRef, useState } from 'react';
import { FilmStripIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ErrorText, Frame, Picker, errorText, saveBlob, tr } from '../general/ui';
import { chooseVideoZip, videoArchive } from './archive';
import { displayTime, frameName, galleryLimit, memoryLimit, relativeTime, sourceName, VideoError,
  type FramePlan, type ImageSettings, type SheetSettings } from './core';
import { ExtractionSettings } from './ExtractionSettings';
import { FrameGallery } from './FrameGallery';
import type { GalleryFrame, VideoResults } from './protocol';
import { contactSheet } from './sheet';
import { videoTask } from './task';
import { VideoPlayer } from './VideoPlayer';
import zipNotice from '../general/fflate.NOTICE.txt?url';
import mediaNotice from './mediabunny.NOTICE.txt?url&no-inline';
import s from './video.module.scss';

type Source = VideoResults['inspect'] & { file: File; key: number };

export default function VideoFrameExtractor({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [source, setSource] = useState<Source>(), [timestamp, setTimestamp] = useState<number>();
  const [frames, setFrames] = useState<GalleryFrame[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false), [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<{ frames: number; fraction?: number }>();
  const [error, setError] = useState<string>(), [result, setResult] = useState<string>();
  const [replace, setReplace] = useState(false);
  const input = useRef<HTMLInputElement>(null), serial = useRef(0), version = useRef(0);
  const loadTask = useRef<AbortController | undefined>(undefined);
  const outputTask = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => {
    loadTask.current?.abort();
    outputTask.current?.abort();
  }, []);

  const cancelOutput = () => {
    outputTask.current?.abort();
    outputTask.current = undefined;
    setWorking(false); setProgress(undefined);
  };

  const load = async (file: File) => {
    loadTask.current?.abort();
    cancelOutput();
    const controller = new AbortController();
    loadTask.current = controller;
    setLoading(true); setError(undefined); setResult(undefined);
    try {
      const next = await videoTask({ type: 'inspect', file }, controller.signal);
      controller.signal.throwIfAborted();
      setSource({ ...next, file, key: ++version.current });
      setTimestamp(next.preview.timestamp);
      setFrames([]); setSelected(new Set()); serial.current = 0;
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorText(cause, locale));
    } finally {
      if (!controller.signal.aborted) { setLoading(false); loadTask.current = undefined; }
    }
  };

  const run = async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (outputTask.current || loadTask.current) return;
    const controller = new AbortController();
    outputTask.current = controller;
    setWorking(true); setError(undefined); setResult(undefined); setProgress({ frames: 0 });
    try { await operation(controller.signal); }
    catch (cause) {
      if (!controller.signal.aborted && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(errorText(cause, locale));
      }
    } finally {
      if (outputTask.current === controller) {
        outputTask.current = undefined;
        setWorking(false); setProgress(undefined);
      }
    }
  };

  async function withArchive(name: string, signal: AbortSignal, make: (add: (name: string, image: Blob) => Promise<void>) => Promise<void>) {
    // The picker has to run in the original click activation, before decoding.
    const handle = await chooseVideoZip(name);
    signal.throwIfAborted();
    const sink = await handle?.createWritable().catch(() => { throw new VideoError('write'); });
    const archive = videoArchive(signal, sink);
    try {
      await make(archive.add);
      const blob = await archive.finish();
      if (blob) saveBlob(blob, name);
    } finally { await archive.dispose(); }
  }

  function extract(plan: FramePlan, settings: ImageSettings, zip: boolean) {
    if (!source) return;
    const { file, info } = source;
    void run(async signal => {
      const staged: GalleryFrame[] = [];
      const gallery = zip ? undefined : {
        frames: galleryLimit - frames.length,
        bytes: memoryLimit - frames.reduce((total, frame) => total + frame.image.size + (frame.thumbnail?.size ?? 0), 0),
      };
      if (gallery && (gallery.frames <= 0 || gallery.bytes <= 0)) throw new VideoError('gallery');
      let index = serial.current;
      const perform = (add?: (name: string, image: Blob) => Promise<void>) =>
        videoTask({ type: 'extract', file, info, plan, settings, gallery }, signal, {
          frame: async frame => {
            const id = ++index;
            const name = frameName(file.name, relativeTime(frame.timestamp, info.origin), id, settings.format);
            if (add) await add(name, frame.image);
            else staged.push({ ...frame, id, name });
          },
          progress: progress => {
            const fraction = plan.mode === 'single' ? progress.frames
              : plan.mode === 'every' ? (progress.time - plan.start) / (plan.end - plan.start)
              : progress.sampled / plan.count;
            setProgress({ frames: progress.frames, fraction: Math.max(0, Math.min(1, fraction)) });
          },
        });
      const output = zip
        ? await (async () => {
          let summary: VideoResults['extract'] | undefined;
          await withArchive(sourceName(file.name) + '-frames.zip', signal, async add => { summary = await perform(add); });
          return summary!;
        })()
        : await perform();
      signal.throwIfAborted();
      if (!zip) {
        serial.current = index;
        setFrames(previous => [...previous, ...staged]);
        setSelected(previous => new Set([...previous, ...staged.map(frame => frame.id)]));
      }
      const duplicates = plan.mode === 'interval' || plan.mode === 'count' ? Math.max(0, output.sampled - output.frames) : 0;
      setResult(t(output.frames + ' 帧已' + (zip ? '导出' : '添加') + (duplicates ? ' · 合并 ' + duplicates + ' 个重复采样' : ''),
        output.frames + (zip ? ' frames exported' : ' frames added') + (duplicates ? ' · ' + duplicates + ' duplicate samples skipped' : '')));
    });
  }

  const picked = () => frames.filter(frame => selected.has(frame.id))
    .sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);

  const galleryZip = () => {
    if (!source) return;
    void run(async signal => {
      const ordered = picked();
      await withArchive(sourceName(source.file.name) + '-selected.zip', signal, async add => {
        for (const [index, frame] of ordered.entries()) {
          await add(frame.name, frame.image);
          setProgress({ frames: index + 1, fraction: (index + 1) / ordered.length });
        }
      });
      setResult(t(ordered.length + ' 帧已导出', ordered.length + ' frames exported'));
    });
  };

  const sheet = (settings: SheetSettings) => {
    if (!source) return;
    void run(async signal => {
      const blob = await contactSheet(picked(), settings, source.file.name, source.info, signal);
      saveBlob(blob, sourceName(source.file.name) + '-contact-sheet.' + (settings.format === 'png' ? 'png' : 'jpg'));
      setResult(t('联系表已导出', 'Contact sheet exported'));
    });
  };

  return <Frame locale={locale}>
    <link rel="license" href={zipNotice} />
    <link rel="license" href={mediaNotice} />
    <div className={s.workspace} data-video-frame-workspace>
      {!source ? <Picker locale={locale} multiple={false} disabled={loading} onFiles={files => void load(files[0])} /> :
        <div className={s.file}>
          <span className={s.fileIcon}><FilmStripIcon size={25} aria-hidden="true" /></span>
          <div className={s.fileText}>
            <strong title={source.file.name}>{source.file.name}</strong>
            <span>{displayTime(source.info.duration)} · {source.info.width} × {source.info.height} ·
              {' '}{t('约 ', '≈ ')}{source.info.fps.toFixed(2)} FPS · {(source.file.size / 1024 ** 2).toFixed(2)} MiB</span>
          </div>
          <input type="file" ref={input} hidden onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void load(file);
          }} />
          {frames.length ? <ConfirmDialog open={replace} onOpenChange={setReplace}
            title={t('更换视频？', 'Replace the video?')}
            description={t('新视频读取成功后将清空当前画廊。', 'The current gallery will clear when the new video opens.')}
            confirmLabel={t('选择视频', 'Choose video')} cancelLabel={t('取消', 'Cancel')}
            onConfirm={() => input.current?.click()}
            trigger={<Button size="sm" disabled={loading}>{t('更换视频', 'Replace video')}</Button>} />
            : <Button size="sm" disabled={loading} onClick={() => input.current?.click()}>{t('更换视频', 'Replace video')}</Button>}
        </div>}
      {loading && <div className={s.status} role="status">{t('正在读取视频轨道…', 'Reading video track…')}
        <Button size="sm" variant="ghost" onClick={() => {
          loadTask.current?.abort(); loadTask.current = undefined; setLoading(false);
        }}>{t('取消', 'Cancel')}</Button>
      </div>}
      {source && <div className={s.body} key={source.key}>
        <div className={s.columns}>
          <VideoPlayer file={source.file} info={source.info} initial={source.preview} locale={locale}
            disabled={loading || working} onFrame={setTimestamp} />
          <ExtractionSettings info={source.info} timestamp={timestamp} locale={locale} disabled={loading || working} onExtract={extract} />
        </div>
        {working && <div className={s.status}>
          <span role="status">{t('正在处理 · ' + (progress?.frames ?? 0) + ' 帧', 'Processing · ' + (progress?.frames ?? 0) + ' frames')}</span>
          <progress aria-label={t('任务进度', 'Task progress')} max={1} value={progress?.fraction} />
          <Button size="sm" onClick={cancelOutput}>{t('取消任务', 'Cancel task')}</Button>
        </div>}
        <FrameGallery frames={frames} selected={selected} info={source.info} locale={locale} disabled={loading || working}
          onSelect={setSelected} onRemove={id => {
            setFrames(values => values.filter(frame => frame.id !== id));
            setSelected(values => new Set([...values].filter(value => value !== id)));
          }} onClear={() => { setFrames([]); setSelected(new Set()); setResult(undefined); }}
          onZip={galleryZip} onSheet={sheet} />
      </div>}
      <ErrorText error={error} />
      {result && <p role="status" className={s.note}>{result}</p>}
    </div>
  </Frame>;
}
