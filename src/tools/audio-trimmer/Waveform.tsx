import { useEffect, useRef, type KeyboardEvent } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.js';
import { audioTask } from './task';
import { displayTime, type AudioInfo, type Mode } from './core';
import type { Peaks } from './media';
import s from './audio.module.scss';

type Props = {
  file: File;
  info: AudioInfo;
  overview: Peaks;
  start: number;
  end: number;
  mode: Mode;
  zoom: number;
  position: number;
  label: string;
  onSeek: (seconds: number) => void;
  onSelect: (start: number, end: number) => void;
  onError: () => void;
};

function drawPeaks(ctx: CanvasRenderingContext2D, duration: number, overview: Peaks, detail: Peaks | undefined) {
  const canvas = ctx.canvas;
  const dpr = canvas.width / (parseFloat(canvas.style.width) || canvas.width);
  const left = parseFloat(canvas.style.left);
  const width = canvas.closest('[part="wrapper"]')?.clientWidth || canvas.width / dpr;
  if (!width || !dpr) return;
  const center = canvas.height / 2;
  const stride = Math.max(2, Math.round(dpr * 3));
  const scale = duration / width;
  ctx.beginPath();
  ctx.lineWidth = Math.max(1, dpr);
  ctx.strokeStyle = getComputedStyle(canvas).color;
  for (let x = 0; x < canvas.width; x += stride) {
    const from = (left + x / dpr) * scale;
    const to = (left + (x + stride) / dpr) * scale;
    const peaks = detail && from >= detail.from && to <= detail.to ? detail : overview;
    const bins = peaks.max.length / (peaks.to - peaks.from);
    const first = Math.max(0, Math.min(peaks.max.length - 1, Math.floor((from - peaks.from) * bins)));
    const last = Math.min(peaks.max.length, Math.max(first + 1, Math.ceil((to - peaks.from) * bins)));
    let min = 0, max = 0;
    for (let index = first; index < last; index++) {
      min = Math.min(min, peaks.min[index]);
      max = Math.max(max, peaks.max[index]);
    }
    ctx.moveTo(x + 0.5, center - Math.max(max * center * 0.9, 0.6));
    ctx.lineTo(x + 0.5, center - Math.min(min * center * 0.9, -0.6));
  }
  ctx.stroke();
}

export function Waveform(props: Props) {
  const { file, info, overview, zoom, start, end, mode, position, label } = props;
  const host = useRef<HTMLDivElement>(null);
  const wave = useRef<WaveSurfer | null>(null);
  const regions = useRef<{ selection: Region; before: Region; after: Region }>(null);
  const latest = useRef(props);
  latest.current = props;
  const duration = info.frames / info.sampleRate;

  useEffect(() => {
    const container = host.current!;
    const plugin = Regions.create();
    const timeline = Timeline.create({
      insertPosition: 'beforebegin', height: 22,
      formatTimeCallback: seconds => displayTime(seconds).split('.')[0],
      style: { color: 'var(--t4f-text-secondary)', fontSize: '11px' },
    });
    let detail: Peaks | undefined;
    let detailJob: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ready = false;
    const progressColor = () => getComputedStyle(container).getPropertyValue('--t4f-accent').trim();
    const redraw = () => { if (ready) instance.setOptions({ progressColor: progressColor() }); };
    const instance = WaveSurfer.create({
      container, peaks: [overview.max], duration, plugins: [plugin, timeline], height: 152,
      cursorColor: 'var(--t4f-text-primary)', progressColor: progressColor(), cursorWidth: 2, autoScroll: false,
      renderFunction: (_, ctx) => drawPeaks(ctx, info.frames, overview, detail),
    });
    wave.current = instance;
    function detailWindow(visibleStart: number, visibleEnd: number) {
      if (!ready) return;
      clearTimeout(timer);
      detailJob?.abort();
      if (latest.current.zoom <= 1) {
        detail = undefined;
        return;
      }
      const windowFrames = Math.ceil((visibleEnd - visibleStart) * info.sampleRate);
      if (windowFrames <= 0) return;
      const left = Math.max(0, Math.floor(visibleStart * info.sampleRate) - Math.ceil(windowFrames / 5));
      const right = Math.min(info.frames, Math.ceil(visibleEnd * info.sampleRate) + Math.ceil(windowFrames / 5));
      if (detail && left >= detail.from && right <= detail.to &&
          detail.to - detail.from < (right - left) * 2) return;
      timer = setTimeout(() => {
        const job = detailJob = new AbortController();
        void audioTask({ type: 'detail', file, info, from: left, to: right, bins: 4096 }, job.signal)
          .then(peaks => {
            if (!job.signal.aborted) {
              detail = peaks;
              redraw();
            }
          }).catch(() => { /* Retain the overview when a detail request cannot be decoded. */ });
      }, 150);
    }
    const viewport = () => {
      if (instance.getWrapper().clientWidth <= 0) return;
      const scale = duration / instance.getWrapper().clientWidth;
      const left = instance.getScroll() * scale;
      detailWindow(left, Math.min(duration, left + instance.getWidth() * scale));
    };
    instance.once('ready', () => {
      ready = true;
      const current = latest.current;
      const passive = { drag: false, resize: false, color: 'transparent' };
      const before = plugin.addRegion({ id: 'retained-before', start: 0, end: current.start, ...passive });
      const after = plugin.addRegion({ id: 'retained-after', start: current.end, end: duration, ...passive });
      const selection = plugin.addRegion({ id: 'edit-selection', start: current.start, end: current.end,
        minLength: Math.min(duration, 0.001), color: current.mode === 'keep' ? 'var(--audio-selection)' : 'var(--audio-removed)' });
      for (const region of [before, after]) {
        if (region.element) {
          region.element.style.borderInline = 'none';
          region.element.style.pointerEvents = 'none';
        }
        region.element?.setAttribute('data-audio-retained', '');
      }
      selection.element?.setAttribute('data-audio-selection', '');
      selection.element?.setAttribute('data-mode', current.mode);
      if (current.mode === 'remove') {
        before.setOptions({ color: 'var(--audio-selection)' });
        after.setOptions({ color: 'var(--audio-selection)' });
      }
      regions.current = { selection, before, after };
      instance.setTime(current.position);
      instance.zoom((current.zoom * instance.getWidth()) / duration);
      viewport();
    });
    plugin.on('region-update', region => {
      if (region.id !== 'edit-selection') return;
      if (latest.current.mode === 'remove') {
        regions.current?.before.setOptions({ end: region.start });
        regions.current?.after.setOptions({ start: region.end });
      }
      latest.current.onSelect(region.start, region.end);
    });
    plugin.on('region-clicked', (region, event) => {
      if (region.id !== 'edit-selection') return;
      const box = instance.getWrapper().getBoundingClientRect();
      if (box.width) latest.current.onSeek(Math.max(0, Math.min(duration, (event.clientX - box.x) / box.width * duration)));
    });
    instance.on('interaction', seconds => latest.current.onSeek(seconds));
    instance.on('scroll', detailWindow);
    instance.on('zoom', viewport);
    instance.on('error', () => latest.current.onError());
    const resize = new ResizeObserver(() => {
      if (ready) instance.zoom(latest.current.zoom * instance.getWidth() / duration);
    });
    resize.observe(container);
    const appearance = new MutationObserver(redraw);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-appearance'] });
    return () => {
      clearTimeout(timer);
      detailJob?.abort();
      resize.disconnect();
      appearance.disconnect();
      ready = false;
      wave.current = null;
      regions.current = null;
      instance.destroy();
    };
  }, [file, info, overview, duration]);

  useEffect(() => {
    const instance = wave.current;
    if (instance && instance.getDuration()) instance.zoom(zoom * instance.getWidth() / duration);
  }, [zoom, duration]);
  useEffect(() => { wave.current?.setTime(position); }, [position]);
  useEffect(() => {
    const entries = regions.current;
    if (!entries) return;
    if (!entries.selection.isDragging && !entries.selection.updatingSide &&
        (Math.abs(entries.selection.start - start) > 0.00051 || Math.abs(entries.selection.end - end) > 0.00051))
      entries.selection.setOptions({ start, end });
    entries.selection.element?.setAttribute('data-mode', mode);
    entries.selection.setOptions({ color: mode === 'keep' ? 'var(--audio-selection)' : 'var(--audio-removed)' });
    for (const region of [entries.before, entries.after]) {
      region.setOptions({ color: mode === 'remove' ? 'var(--audio-selection)' : 'transparent' });
    }
    entries.before.setOptions({ start: 0, end: start });
    entries.after.setOptions({ start: end, end: duration });
  }, [start, end, mode, duration]);

  const keyboard = (event: KeyboardEvent) => {
    const delta = event.shiftKey ? 10 : 1;
    const target = ({ ArrowLeft: position - delta, ArrowRight: position + delta, Home: 0, End: duration })[event.key];
    if (target === undefined) return;
    event.preventDefault();
    props.onSeek(Math.max(0, Math.min(target, duration)));
  };
  return <div className={s.waveform} tabIndex={0} role="slider" aria-label={label} aria-valuemin={0}
    aria-valuemax={duration} aria-valuenow={position} aria-valuetext={displayTime(position)} onKeyDown={keyboard}>
    <div ref={host} className={s.waveHost} />
  </div>;
}
