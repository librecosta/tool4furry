import { useState, useRef, useEffect } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Frame, Picker, ErrorText, tr, s, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { fail, MiB } from '../general/bounds';
import { audioRange, encodeWav, inspectDuration } from './core';
const closeContext = (context?: AudioContext) => {
  if (context && context.state !== 'closed')
    void context.close().catch(() => {});
};
export default function AudioTrimmer({ locale }: ToolProps) {
  const [audio, setAudio] = useState<{
      file: File;
      buffer: AudioBuffer;
    }>(),
    [start, setStart] = useState('0'),
    [end, setEnd] = useState(''),
    [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    context = useRef<AudioContext | undefined>(undefined),
    source = useRef<AudioBufferSourceNode | undefined>(undefined),
    job = useJob<Blob>(locale);
  const playback = useRef(0);
  const stop = () => {
    playback.current++;
    source.current?.stop();
    source.current?.disconnect();
    source.current = undefined;
    setPlaying(false);
  };
  const clear = () => {
    job.invalidate();
    stop();
    setAudio(undefined);
    setStart('0');
    setEnd('');
    closeContext(context.current);
    context.current = undefined;
  };
  useEffect(
    () => () => {
      playback.current++;
      source.current?.stop();
      source.current?.disconnect();
      closeContext(context.current);
    },
    [],
  );
  useEffect(() => {
    if (!audio || !canvas.current) return;
    const el = canvas.current,
      ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.fillStyle = getComputedStyle(el).color;
    const data = audio.buffer.getChannelData(0);
    for (let x = 0; x < 640; x++) {
      const from = Math.floor((x * data.length) / 640),
        to = Math.floor(((x + 1) * data.length) / 640);
      let peak = 0;
      for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(data[i]));
      ctx.fillRect(x, 80 - peak * 75, 1, Math.max(1, peak * 150));
    }
  }, [audio]);
  const update = (setter: (v: string) => void) => (v: string) => {
    stop();
    job.invalidate();
    setter(v);
  };
  return (
    <Frame locale={locale}>
      <Picker
        locale={locale}
        multiple={false}
        accept="audio/*"
        disabled={job.busy}
        onFiles={(files) => {
          clear();
          void job.run(async (signal) => {
            await inspectDuration(files[0], signal);
            if (signal.aborted) throw new Error();
            if (!globalThis.AudioContext)
              fail('浏览器不支持 Web Audio。', 'Web Audio is unavailable.');
            const ctx = new AudioContext({ sampleRate: 44100 });
            context.current = ctx;
            try {
              const buffer = await ctx.decodeAudioData(
                await files[0].arrayBuffer(),
              );
              if (signal.aborted) throw new Error();
              if (
                buffer.duration > 180 ||
                buffer.numberOfChannels > 2 ||
                buffer.length * buffer.numberOfChannels * 4 > 64 * MiB
              )
                fail(
                  '解码音频超过 180 秒、双声道或 64 MiB 限制。',
                  'Decoded audio exceeds 180 seconds, two channels or 64 MiB.',
                );
              setAudio({ file: files[0], buffer });
              setEnd(String(buffer.duration));
              return new Blob();
            } catch (e) {
              closeContext(ctx);
              if (context.current === ctx) context.current = undefined;
              throw e;
            }
          });
        }}
      />
      <p {...stylex.props(s.note)}>
        {tr(
          locale,
          '支持当前浏览器可解码的音频；上限 20 MiB、180 秒、双声道。',
          'Uses browser-supported audio. Limits: 20 MiB, 180 seconds, two channels.',
        )}
      </p>
      {audio && (
        <>
          <p>
            {audio.file.name} · {audio.buffer.duration.toFixed(3)} s ·{' '}
            {audio.buffer.sampleRate} Hz
          </p>
          <canvas
            ref={canvas}
            width={640}
            height={160}
            {...stylex.props(s.canvas)}
            aria-label={tr(locale, '音频波形', 'Audio waveform')}
          />
          <div {...stylex.props(s.columns)}>
            <TextField
              label={tr(locale, '起点（秒）', 'Start (seconds)')}
              value={start}
              onChange={update(setStart)}
            />
            <TextField
              label={tr(locale, '终点（秒）', 'End (seconds)')}
              value={end}
              onChange={update(setEnd)}
            />
          </div>
          <div {...stylex.props(s.row)}>
            <Button
              disabled={job.busy}
              onClick={() => {
                stop();
                try {
                  const [a, b] = audioRange(start, end, audio.buffer.duration),
                    ctx = context.current;
                  if (!ctx) throw new Error();
                  const version = playback.current;
                  void ctx.resume().then(
                    () => {
                      if (
                        version !== playback.current ||
                        context.current !== ctx
                      )
                        return;
                      const node = ctx.createBufferSource();
                      node.buffer = audio.buffer;
                      node.connect(ctx.destination);
                      node.onended = () => {
                        if (source.current === node) {
                          source.current = undefined;
                          setPlaying(false);
                        }
                        node.disconnect();
                      };
                      source.current = node;
                      node.start(0, a, b - a);
                      setPlaying(true);
                    },
                    () =>
                      job.setError(
                        tr(locale, '无法播放音频。', 'Audio playback failed.'),
                      ),
                  );
                } catch {
                  job.setError(
                    tr(
                      locale,
                      '请选择有效的时间范围。',
                      'Select a valid time range.',
                    ),
                  );
                }
              }}
            >
              {tr(locale, '试听选中片段', 'Play selection')}
            </Button>
            <Button disabled={!playing} onClick={stop}>
              {tr(locale, '停止', 'Stop')}
            </Button>
            <Button
              variant="primary"
              loading={job.busy}
              onClick={() =>
                void job.run(async (signal) => {
                  const [a, b] = audioRange(start, end, audio.buffer.duration),
                    buffer = audio.buffer,
                    channels = Array.from(
                      { length: buffer.numberOfChannels },
                      (_, i) => buffer.getChannelData(i),
                    ),
                    bytes = encodeWav(
                      channels,
                      buffer.sampleRate,
                      Math.floor(a * buffer.sampleRate),
                      Math.min(
                        buffer.length,
                        Math.floor(b * buffer.sampleRate),
                      ),
                    );
                  const ctx = context.current;
                  if (!ctx) throw new Error();
                  const checked = await ctx.decodeAudioData(bytes.slice(0));
                  if (signal.aborted) throw new Error();
                  if (
                    checked.length !==
                      (bytes.byteLength - 44) / (buffer.numberOfChannels * 2) ||
                    checked.numberOfChannels !== buffer.numberOfChannels
                  )
                    throw new Error();
                  return new Blob([bytes], { type: 'audio/wav' });
                })
              }
            >
              {tr(locale, '导出 WAV', 'Export WAV')}
            </Button>
          </div>
        </>
      )}
      <ErrorText error={job.error} />
      {!!job.result?.size && (
        <Button onClick={() => saveBlob(job.result!, 'trimmed.wav')}>
          {tr(locale, '下载 WAV', 'Download WAV')}
        </Button>
      )}
      <Button onClick={clear}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
