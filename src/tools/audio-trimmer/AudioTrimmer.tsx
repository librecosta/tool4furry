import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DownloadSimpleIcon, MinusIcon, PauseIcon, PlayIcon, PlusIcon,
  RepeatIcon, SquareIcon, WaveformIcon,
} from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { Tooltip } from '../../ui/Tooltip';
import form from '../../workbench/form-tool-layout.module.scss';
import type { ToolProps } from '../types';
import { ErrorText, Frame, Picker, saveBlob, tr } from '../general/ui';
import {
  audioAccept, blobBudget, displayTime, estimatedBytes, filenameFor, formats, inputBudget,
  makePlan, outputAt, parseTime, sourceAt, type Encoding, type Format, type Mode,
} from './core';
import type { AudioError } from './media';
import type { AudioTaskResults } from './protocol';
import { audioTask, AudioTaskError } from './task';
import { Audition } from './audition';
import { Waveform } from './Waveform';
import notice from './audio-trimmer.NOTICE.txt?url&no-inline';
import s from './audio.module.scss';

type SavePicker = (options: { suggestedName: string; types: {
  description: string; accept: Record<string, string[]>;
}[] }) => Promise<FileSystemFileHandle>;

const errors: Record<AudioError, readonly [string, string]> = {
  inputSize: ['请选择不超过 512 MiB 的非空音频。', 'Choose a non-empty audio file up to 512 MiB.'],
  inputFormat: ['未找到浏览器可解码的音轨。请尝试 WAV、MP3 或 FLAC。', 'No audio track could be decoded. Try WAV, MP3, or FLAC.'],
  channels: ['请选择单声道或立体声音频。', 'Choose mono or stereo audio.'],
  decode: ['无法读取音频片段。文件可能损坏或时间戳不连续。', 'Could not read the audio segment. The file may be damaged or have discontinuous timestamps.'],
  encode: ['无法完成此格式的编码。请尝试 WAV 或降低输出大小。', 'Could not encode this format. Try WAV or a smaller output.'],
  outputSize: ['导出超过 256 MiB 内存预算。请缩短范围、选择体积更小的格式，或使用支持直接保存的浏览器。', 'The export exceeds the 256 MiB in-memory limit. Shorten the edit, choose a smaller format, or use a browser with direct file saving.'],
  write: ['无法写入所选文件。请检查可用空间及文件权限。', 'Could not write the selected file. Check free space and file permissions.'],
  playback: ['无法试听此片段。请重新定位或更换文件。', 'Could not play this segment. Try seeking or choosing another file.'],
};

const sizeText = (bytes: number) => bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(2) + ' MiB'
  : (bytes / 1024).toFixed(1) + ' KiB';
const zoomSteps = [1, 2, 4, 8, 16, 32, 64, 128];
const formatKeys = Object.keys(formats) as Format[];
type Loaded = AudioTaskResults['analyze'] & { file: File };

export default function AudioTrimmer({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [audio, setAudio] = useState<Loaded>();
  const [loading, setLoading] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [noticeText, setNoticeText] = useState('');
  const [error, setError] = useState<AudioError>();
  const [mode, setMode] = useState<Mode>('keep');
  const [startText, setStart] = useState(''), [endText, setEnd] = useState('');
  const [fadeIn, setFadeIn] = useState('0'), [fadeOut, setFadeOut] = useState('0');
  const [format, setFormat] = useState<Format>('mp3'), [quality, setQuality] = useState(192);
  const [zoom, setZoom] = useState(0), [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false), [loop, setLoop] = useState(false), [volume, setVolume] = useState(0.8);
  const loadingJob = useRef<AbortController | undefined>(undefined);
  const exportJob = useRef<AbortController | undefined>(undefined);
  const playerRef = useRef<Audition | null>(null);
  const positionRef = useRef(0);
  const replace = useRef<HTMLInputElement>(null);
  const rangeErrorId = useId();
  const player = playerRef.current ??= new Audition();

  useEffect(() => () => {
    loadingJob.current?.abort();
    exportJob.current?.abort();
    player.dispose();
  }, [player]);

  const info = audio?.info;
  const duration = info ? info.frames / info.sampleRate : 0;
  const start = startText === displayTime(duration) ? duration : parseTime(startText);
  const end = endText === displayTime(duration) ? duration : parseTime(endText);
  const selection = useRef({ start: 0, end: 0 });
  if (start >= 0 && end > start && end <= duration) selection.current = { start, end };
  const planned = useMemo(() => info && makePlan(info, mode, start, end,
    parseTime(fadeIn), parseTime(fadeOut)), [info, mode, start, end, fadeIn, fadeOut]);
  const plan = planned?.plan;
  const planError = planned?.error === 'range' ? t('起止时间无效。请使用分:秒.毫秒或时:分:秒.毫秒。', 'Enter a valid start and end as mm:ss.SSS or hh:mm:ss.SSS.')
    : planned?.error === 'empty' ? t('删除范围须至少保留一个样本。', 'Leave at least one sample outside the removed range.')
    : planned?.error === 'fade' ? t('淡入与淡出总时长不得超出输出时长。', 'The combined fades must fit within the output.') : undefined;
  const rate = audio?.capabilities[format]?.[quality];
  const encoding: Encoding | undefined = rate === undefined ? undefined : { format, bitrate: quality, sampleRate: rate };
  const estimate = info && plan && encoding ? estimatedBytes(plan, info, encoding) : undefined;
  const directSave = typeof window === 'undefined' ? undefined : (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  const large = estimate !== undefined && estimate > blobBudget;

  function move(seconds: number) {
    positionRef.current = seconds;
    setPosition(seconds);
  }

  function pause() {
    player.stop();
    setPlaying(false);
  }

  function stop() {
    pause();
    move(info && plan ? sourceAt(plan, 0) / info.sampleRate : 0);
  }

  function cancelExport() {
    const job = exportJob.current;
    exportJob.current = undefined;
    job?.abort();
    setExporting(false);
  }

  function edit(update: () => void) {
    pause();
    cancelExport();
    setError(undefined);
    setNoticeText('');
    update();
  }

  async function load(file: File) {
    edit(() => {});
    loadingJob.current?.abort();
    if (!file.size || file.size > inputBudget) {
      setLoading(undefined);
      setError('inputSize');
      return;
    }
    player.dispose();
    setAudio(undefined);
    setLoading(file.name);
    setProgress(0);
    const job = loadingJob.current = new AbortController();
    try {
      const result = await audioTask({ type: 'analyze', file }, job.signal, { progress: setProgress });
      if (job.signal.aborted) return;
      setAudio({ file, ...result });
      const seconds = result.info.frames / result.info.sampleRate;
      selection.current = { start: 0, end: seconds };
      move(0);
      setStart(displayTime(0));
      setEnd(displayTime(seconds));
      setFadeIn('0');
      setFadeOut('0');
      setMode('keep');
      setZoom(0);
      setFormat(result.capabilities.mp3 ? 'mp3' : 'wav');
      setQuality(result.capabilities.mp3 ? 192 : 0);
    } catch (failure) {
      if (!job.signal.aborted) setError(failure instanceof AudioTaskError ? failure.code : 'inputFormat');
    } finally {
      if (loadingJob.current === job) {
        loadingJob.current = undefined;
        setLoading(undefined);
      }
    }
  }

  function play(at = positionRef.current, looping = loop) {
    if (!audio || !info || !plan) return;
    const offset = outputAt(plan, Math.round(at * info.sampleRate));
    const from = offset === plan.frames ? 0 : offset;
    move(sourceAt(plan, from) / info.sampleRate);
    setPlaying(true);
    setError(undefined);
    void player.play(audio.file, info, plan, from, looping,
      frame => move(sourceAt(plan, frame) / info.sampleRate),
      () => setPlaying(false), () => { setPlaying(false); setError('playback'); });
  }

  function seek(seconds: number) {
    if (playing) play(seconds);
    else move(seconds);
  }

  async function deliver() {
    if (!audio || !info || !plan || !encoding || (large && !directSave)) return;
    const name = filenameFor(audio.file.name, format);
    cancelExport();
    setError(undefined);
    setNoticeText('');
    setProgress(0);
    setExporting(true);
    const job = exportJob.current = new AbortController();
    let stream: FileSystemWritableFileStream | undefined;
    try {
      if (large && directSave) {
        const handle = await directSave.call(window, { suggestedName: name,
          types: [{ description: format.toUpperCase(), accept: { [formats[format].mime]: ['.' + format] } }],
        });
        job.signal.throwIfAborted();
        stream = await handle.createWritable();
      }
      job.signal.throwIfAborted();
      const result = await audioTask({ type: 'export', file: audio.file, info, plan, encoding, stream: !!stream }, job.signal, {
        progress: setProgress,
        write: stream ? (offset, data) => stream!.write({ type: 'write', position: offset, data }) : undefined,
      });
      job.signal.throwIfAborted();
      if (stream) await stream.close();
      else if (result?.size) saveBlob(result, name);
      else throw new AudioTaskError('encode');
      if (!job.signal.aborted) setNoticeText(t('音频已导出。', 'Audio exported.'));
    } catch (failure) {
      await stream?.abort().catch(() => {});
      if (!job.signal.aborted && !(failure instanceof DOMException && failure.name === 'AbortError'))
        setError(failure instanceof AudioTaskError ? failure.code : large ? 'write' : 'encode');
    } finally {
      if (exportJob.current === job) {
        exportJob.current = undefined;
        setExporting(false);
      }
    }
  }

  const qualityOptions = Object.keys(audio?.capabilities[format] ?? {})
    .filter(value => Number(value) !== 0)
    .map(value => ({ value, label: value + ' kbps' }));

  return <Frame locale={locale}>
    <div className={s.workspace} data-audio-trimmer>
      {!audio && !loading && <Picker locale={locale} multiple={false} accept={audioAccept} onFiles={files => void load(files[0])} />}
      {loading && <div className={s.loading} role="status">
        <span>{t('正在读取音频', 'Reading audio')} · {loading}</span>
        <progress value={progress} max={1} aria-label={t('生成波形', 'Building waveform')} />
        <Button size="sm" variant="ghost" onClick={() => {
          loadingJob.current?.abort();
          loadingJob.current = undefined;
          setLoading(undefined);
        }}>{t('取消', 'Cancel')}</Button>
      </div>}
      {audio && info && <>
        <div className={s.file}>
          <span className={s.fileIcon}><WaveformIcon size={25} weight="bold" aria-hidden /></span>
          <div className={s.fileText}>
            <strong title={audio.file.name}>{audio.file.name}</strong>
            <span>{displayTime(duration)} · {info.sampleRate / 1000} kHz · {info.channels === 2 ? t('立体声', 'Stereo') : t('单声道', 'Mono')} · {sizeText(audio.file.size)}</span>
          </div>
          <input hidden ref={replace} type="file" accept={audioAccept} aria-label={t('更换音频', 'Replace audio')} onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void load(file);
          }} />
          <Button size="sm" className={s.replace} onClick={() => replace.current?.click()}>{t('更换文件', 'Replace file')}</Button>
        </div>
        <section className={s.timeline} aria-label={t('音频时间轴', 'Audio timeline')}>
          <div className={s.timelineHead}>
            <div className={form.segmented} role="group" aria-label={t('裁切模式', 'Trim mode')}>
              {(['keep', 'remove'] as const).map(key => <Button key={key} size="sm" variant="ghost"
                className={mode === key ? form.segment + ' ' + form.segmentSelected : form.segment}
                aria-pressed={mode === key} onClick={() => edit(() => setMode(key))}>
                {key === 'keep' ? t('保留选区', 'Keep selection') : t('删除选区', 'Remove selection')}
              </Button>)}
            </div>
            <div className={s.zoom}>
              <IconButton size="sm" variant="ghost" label={t('缩小波形', 'Zoom out')} disabled={!zoom}
                onClick={() => setZoom(zoom - 1)}><MinusIcon aria-hidden /></IconButton>
              <input type="range" min={0} max={zoomSteps.length - 1} value={zoom} onChange={e => setZoom(+e.target.value)}
                aria-label={t('波形缩放', 'Waveform zoom')} aria-valuetext={zoomSteps[zoom] + '×'} />
              <IconButton size="sm" variant="ghost" label={t('放大波形', 'Zoom in')} disabled={zoom === zoomSteps.length - 1}
                onClick={() => setZoom(zoom + 1)}><PlusIcon aria-hidden /></IconButton>
              {!!zoom && <Button size="sm" variant="ghost" onClick={() => setZoom(0)}>{t('全览', 'Fit')}</Button>}
            </div>
          </div>
          <Waveform file={audio.file} info={info} overview={audio.peaks} zoom={zoomSteps[zoom]}
            start={selection.current.start} end={selection.current.end} mode={mode} position={position}
            label={t('波形播放头', 'Waveform playhead')} onSeek={seek} onError={() => setError('decode')}
            onSelect={(from, to) => edit(() => { setStart(displayTime(from)); setEnd(displayTime(to)); })} />
          <div className={s.transport}>
            <div className={s.transportControls}>
              <Tooltip content={playing ? t('暂停', 'Pause') : t('播放', 'Play')}>
                <IconButton variant="primary" className={s.play} label={playing ? t('暂停', 'Pause') : t('播放', 'Play')}
                  disabled={!plan} onClick={() => playing ? pause() : play()}>
                  {playing ? <PauseIcon weight="fill" aria-hidden /> : <PlayIcon weight="fill" aria-hidden />}
                </IconButton>
              </Tooltip>
              <Tooltip content={t('停止', 'Stop')}>
                <IconButton size="sm" variant="ghost" label={t('停止', 'Stop')} onClick={stop}>
                  <SquareIcon weight="fill" aria-hidden />
                </IconButton>
              </Tooltip>
              <Tooltip content={t('循环试听', 'Loop preview')}>
                <IconButton size="sm" variant="ghost" label={t('循环试听', 'Loop preview')} aria-pressed={loop} onClick={() => {
                  setLoop(!loop);
                  if (playing) play(positionRef.current, !loop);
                }}><RepeatIcon size={18} aria-hidden /></IconButton>
              </Tooltip>
              <span className={s.clock}>{displayTime(position)} <span>/ {displayTime(duration)}</span></span>
            </div>
            <div className={s.transportMeta}>
              <label className={s.volume}><span>{t('音量', 'Volume')}</span>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={event => { setVolume(+event.target.value); player.setVolume(+event.target.value); }} /></label>
              <div className={s.length}><span>{t('输出时长', 'Output duration')}</span>
                <strong data-output-duration>{plan ? displayTime(plan.frames / info.sampleRate) : '—'}</strong></div>
            </div>
          </div>
        </section>
        <div className={s.settings}>
          <section className={s.panel} aria-labelledby="audio-cut-title">
            <h2 id="audio-cut-title">{t('裁切设置', 'Trim settings')}</h2>
            <div className={s.fields}>
              <TextField label={t('起点', 'Start')} className={s.time} value={startText} placeholder="00:00.000"
                aria-describedby={planError ? rangeErrorId : undefined} onChange={value => edit(() => setStart(value))} />
              <TextField label={t('终点', 'End')} className={s.time} value={endText} placeholder="00:00.000"
                aria-describedby={planError ? rangeErrorId : undefined} onChange={value => edit(() => setEnd(value))} />
              <TextField label={t('淡入（秒）', 'Fade in (s)')} className={s.time} value={fadeIn} inputMode="decimal"
                onChange={value => edit(() => setFadeIn(value))} />
              <TextField label={t('淡出（秒）', 'Fade out (s)')} className={s.time} value={fadeOut} inputMode="decimal"
                onChange={value => edit(() => setFadeOut(value))} />
            </div>
            {planError && <p id={rangeErrorId} role="alert" className={s.error}>{planError}</p>}
          </section>
          <section className={s.panel} aria-labelledby="audio-export-title">
            <h2 id="audio-export-title">{t('导出音频', 'Export audio')}</h2>
            <div className={s.fields}>
              <SelectField label={t('格式', 'Format')} appearance="quiet" value={format} disabled={exporting}
                options={formatKeys.map(value => ({ value, label: value.toUpperCase(), disabled: !audio.capabilities[value] }))}
                onValueChange={value => edit(() => {
                  const next = value as Format;
                  const preferred = formats[next].defaultRate;
                  setQuality(audio.capabilities[next]?.[preferred] ? preferred : Number(Object.keys(audio.capabilities[next] ?? {})[0]));
                  setFormat(next);
                })} />
              {qualityOptions.length ? <SelectField label={t('码率', 'Bitrate')} appearance="quiet" disabled={exporting}
                value={String(quality)} options={qualityOptions} onValueChange={value => edit(() => setQuality(Number(value)))} />
                : <div className={s.encoding}><span>{t('编码', 'Encoding')}</span>
                  <strong>{format === 'wav' ? 'PCM16' : 'FLAC · 24-bit'}</strong></div>}
            </div>
            <p className={s.estimate}>{t('预计大小', 'Estimated size')} · {estimate === undefined ? '—' : sizeText(estimate)}</p>
            {rate !== undefined && rate !== info.sampleRate &&
              <p className={s.estimate}>{t('兼容采样率', 'Compatible sample rate')} · {rate / 1000} kHz</p>}
            {large && !directSave && <p className={s.error}>{t(...errors.outputSize)}</p>}
            {exporting ? <div className={s.exporting} role="status">
              <progress value={progress} max={1} aria-label={t('导出进度', 'Export progress')} />
              <span>{Math.round(progress * 100)}%</span>
              <Button size="sm" variant="ghost" onClick={() => { cancelExport(); setNoticeText(t('已取消导出。', 'Export canceled.')); }}>{t('取消', 'Cancel')}</Button>
            </div> : <Button className={s.export} variant="primary" disabled={!plan || !encoding || (large && !directSave)}
              onClick={() => void deliver()}><DownloadSimpleIcon size={19} aria-hidden />{t('导出音频', 'Export audio')}</Button>}
          </section>
        </div>
      </>}
      <ErrorText error={error ? t(...errors[error]) : undefined} />
      {noticeText && <p className={s.estimate} role="status">{noticeText}</p>}
      <a className={s.license} href={notice} target="_blank" rel="noreferrer">{t('音频组件许可', 'Audio component licenses')}</a>
    </div>
  </Frame>;
}
