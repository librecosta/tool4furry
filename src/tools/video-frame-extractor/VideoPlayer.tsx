import { useEffect, useRef, useState } from 'react';
import { Slider } from '@base-ui/react/slider';
import { CaretLeftIcon, CaretRightIcon, CornersInIcon, CornersOutIcon, PauseIcon, PlayIcon,
  SkipBackIcon, SkipForwardIcon, SpeakerHighIcon, SpeakerXIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { ErrorText, errorText, tr, useBlobUrl } from '../general/ui';
import { displayTime, parseTime, relativeTime, VideoError } from './core';
import type { Position, Preview, VideoInfo } from './protocol';
import { videoTask } from './task';
import s from './video.module.scss';

type Props = {
  file: File; info: VideoInfo; initial: Preview; locale: Locale;
  disabled: boolean; onFrame: (timestamp?: number) => void;
};

export function VideoPlayer({ file, info, initial, locale, disabled, onFrame }: Props) {
  const video = useRef<HTMLVideoElement>(null), panel = useRef<HTMLElement>(null);
  const task = useRef<AbortController | undefined>(undefined);
  const suppressPause = useRef(false), presented = useRef<number | undefined>(undefined);
  const scrubbing = useRef(false), nativeOffset = useRef(0);
  const [preview, setPreview] = useState(initial);
  const [requested, setRequested] = useState(0), [liveTime, setLiveTime] = useState(0);
  const [playing, setPlaying] = useState(false), [pending, setPending] = useState(false);
  const [nativeReady, setNativeReady] = useState(false), [nativeFailure, setNativeFailure] = useState(false);
  const [volume, setVolume] = useState(1), [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false), [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string>(), [error, setError] = useState<string>();
  const sourceUrl = useBlobUrl(file), frameUrl = useBlobUrl(preview.image);
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const actual = relativeTime(preview.timestamp, info.origin);

  const stopNative = () => {
    const element = video.current;
    if (element && !element.paused) {
      suppressPause.current = true;
      element.pause();
    }
    setPlaying(false);
  };

  function locate(time: number, step?: Position['step']) {
    stopNative();
    if (!Number.isFinite(time) || time < 0 || time > info.duration + .0000005) {
      setError(errorText(new VideoError('time'), locale));
      return;
    }
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setRequested(Math.min(time, info.duration));
    setDraft(undefined); setError(undefined); setPending(true);
    onFrame(undefined);
    void videoTask({ type: 'preview', file, info, position: {
      requested: time, timestamp: preview.timestamp, step,
    } }, controller.signal).then(frame => {
      if (controller.signal.aborted) return;
      setPreview(frame);
      if (step) setRequested(relativeTime(frame.timestamp, info.origin));
      onFrame(frame.timestamp);
    }, cause => {
      if (!controller.signal.aborted) setError(errorText(cause, locale));
    }).finally(() => {
      if (!controller.signal.aborted) { task.current = undefined; setPending(false); }
    });
  }

  useEffect(() => {
    const media = video.current;
    const abort = () => task.current?.abort();
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === panel.current);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', escape);
    return () => {
      abort();
      media?.pause();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    if (!disabled) return;
    const element = video.current;
    if (element && !element.paused) element.pause();
  }, [disabled]);

  useEffect(() => {
    const element = video.current;
    if (!playing || !element?.requestVideoFrameCallback) return;
    let id: number;
    const update: VideoFrameRequestCallback = (_, metadata) => {
      presented.current = metadata.mediaTime;
      setLiveTime(Math.max(0, Math.min(info.duration, metadata.mediaTime - nativeOffset.current)));
      id = element.requestVideoFrameCallback(update);
    };
    id = element.requestVideoFrameCallback(update);
    return () => element.cancelVideoFrameCallback(id);
  }, [playing, info.duration]);

  const play = async () => {
    const element = video.current;
    if (!element || !nativeReady || nativeFailure) return;
    if (!element.paused) { element.pause(); return; }
    task.current?.abort(); task.current = undefined;
    setPending(false); setError(undefined);
    presented.current = undefined;
    if (element.seekable.length) nativeOffset.current = Math.max(nativeOffset.current, element.seekable.start(0));
    element.currentTime = Math.min(actual + nativeOffset.current, Math.max(0, element.duration - .001));
    setLiveTime(actual);
    onFrame(undefined);
    try { await element.play(); } catch {
      setNativeFailure(true);
      onFrame(preview.timestamp);
    }
  };

  const fullscreenAction = async () => {
    if (expanded) { setExpanded(false); return; }
    if (fullscreen) { await document.exitFullscreen().catch(() => {}); return; }
    try {
      if (!panel.current?.requestFullscreen) setExpanded(true);
      else await panel.current.requestFullscreen();
    } catch { setExpanded(true); }
  };

  const shown = playing ? liveTime : pending || scrubbing.current ? requested : actual;
  const format = (value: number) => displayTime(value);
  const timeLabel = t('精确时间', 'Precise time');
  const control = (label: string, icon: React.ReactNode, action: () => void, unavailable = disabled) => (
    <Tooltip content={label}><IconButton label={label} size="sm" variant="ghost" disabled={unavailable} onClick={action}>{icon}</IconButton></Tooltip>
  );

  return <section ref={panel} className={s.player} data-expanded={expanded || undefined} aria-label={t('视频播放器', 'Video player')}>
    <div className={s.stage} aria-busy={pending || undefined}>
      <video ref={video} src={sourceUrl} playsInline preload="metadata" aria-hidden={!playing}
        data-visible={playing || undefined}
        onLoadedMetadata={({ currentTarget }) => {
          const nativeDuration = currentTarget.duration;
          nativeOffset.current = Math.abs(nativeDuration - info.end) < Math.abs(nativeDuration - info.duration)
            ? info.origin : 0;
          currentTarget.volume = volume; currentTarget.muted = muted; setNativeReady(true);
        }}
        onError={() => { setNativeFailure(true); setPlaying(false); if (playing) locate(liveTime); }}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={({ currentTarget }) => {
          if (!currentTarget.paused && presented.current === undefined)
            setLiveTime(Math.max(0, Math.min(info.duration, currentTarget.currentTime - nativeOffset.current)));
        }}
        onPause={({ currentTarget }) => {
          setPlaying(false);
          if (suppressPause.current) { suppressPause.current = false; return; }
          const time = presented.current ?? currentTarget.currentTime;
          locate(Math.max(0, Math.min(info.duration, time - nativeOffset.current)));
        }} />
      {frameUrl && !playing && <img src={frameUrl} alt={t('精确解码画面', 'Precisely decoded frame')} />}
      <span className={s.stageLabel}>{info.width} × {info.height}</span>
    </div>
    <Slider.Root value={shown} min={0} max={info.duration} step={Math.min(info.duration, .001)} disabled={disabled}
      onValueChange={(time) => {
        stopNative(); task.current?.abort(); task.current = undefined;
        scrubbing.current = true; setPending(false); setRequested(time); onFrame(undefined);
        setDraft(undefined); setError(undefined);
      }}
      onValueCommitted={time => { scrubbing.current = false; locate(time); }}>
      <Slider.Control className={s.timeline}>
        <Slider.Track className={s.track}>
          <Slider.Indicator className={s.indicator} />
          <Slider.Thumb className={s.thumb} aria-label={t('视频时间轴', 'Video timeline')} getAriaValueText={(_, value) => format(value)} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
    <div className={s.ticks} aria-hidden="true"><span>00:00</span><span>{displayTime(info.duration / 2, 0)}</span><span>{displayTime(info.duration, 0)}</span></div>
    <div className={s.transport}>
      <div className={s.navigation}>
        {control(t('第一帧', 'First frame'), <SkipBackIcon size={17} weight="fill" />, () => locate(0, 'first'), disabled || pending)}
        {control(t('上一帧', 'Previous frame'), <CaretLeftIcon size={17} />, () => locate(actual, 'previous'), disabled || pending)}
        <IconButton className={s.play} label={playing ? t('暂停', 'Pause') : t('播放', 'Play')} variant="primary" size="sm"
          disabled={disabled || !nativeReady || nativeFailure} onClick={() => void play()}>
          {playing ? <PauseIcon size={17} weight="fill" /> : <PlayIcon size={17} weight="fill" />}
        </IconButton>
        {control(t('下一帧', 'Next frame'), <CaretRightIcon size={17} />, () => locate(actual, 'next'), disabled || pending)}
        {control(t('最后一帧', 'Last frame'), <SkipForwardIcon size={17} weight="fill" />, () => locate(info.duration, 'last'), disabled || pending)}
      </div>
      <div className={s.clock}>
        <input className={s.time} aria-label={timeLabel} title={timeLabel} value={draft ?? format(shown)}
          disabled={disabled} spellCheck={false} inputMode="text" onFocus={e => e.currentTarget.select()}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => {
            if (draft === undefined) return;
            try { locate(parseTime(draft)); } catch (cause) { setError(errorText(cause, locale)); }
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') { setDraft(undefined); setError(undefined); }
          }} />
        <span>/ {format(info.duration)}</span>
      </div>
      <div className={s.aux}>
        {control(muted ? t('取消静音', 'Unmute') : t('静音', 'Mute'), muted ? <SpeakerXIcon size={17} /> : <SpeakerHighIcon size={17} />,
          () => { if (video.current) video.current.muted = !muted; setMuted(!muted); }, disabled || !nativeReady || nativeFailure)}
        <input className={s.volume} aria-label={t('音量', 'Volume')} type="range" min={0} max={1} step={.05} value={volume}
          disabled={disabled || !nativeReady || nativeFailure}
          onChange={event => { const value = event.currentTarget.valueAsNumber; if (video.current) video.current.volume = value; setVolume(value); }} />
        {control(fullscreen || expanded ? t('退出全屏', 'Exit fullscreen') : t('全屏', 'Fullscreen'),
          fullscreen || expanded ? <CornersInIcon size={18} /> : <CornersOutIcon size={18} />, () => void fullscreenAction())}
      </div>
    </div>
    {!playing && (pending || Math.abs(requested - actual) > .0000005) && <p role="status" className={s.note}>
      {pending ? t('正在定位画面…', 'Locating frame…') : t('请求 ' + displayTime(requested, 6) + ' · 实际 ' + displayTime(actual, 6),
        'Requested ' + displayTime(requested, 6) + ' · Frame ' + displayTime(actual, 6))}
    </p>}
    {nativeFailure && <p className={s.note}>{t('浏览器无法播放此视频。仍可逐帧浏览和提取。', 'Playback is unavailable for this video. Precise viewing and extraction are still available.')}</p>}
    <ErrorText error={error} />
  </section>;
}
