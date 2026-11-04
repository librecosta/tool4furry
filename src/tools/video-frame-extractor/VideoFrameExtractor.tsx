import { useEffect, useRef, useState } from 'react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { Frame, Picker, tr, ErrorText, saveBlob, useBlobUrl,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { useJob } from '../general/use-job';
import { fail, integer, MiB } from '../general/bounds';
import { packZip } from '../image-converter/zip';
import { frameSize, frameTimes } from './core';
import { loadVideo, captureFrame } from './video';
import notice from '../general/fflate.NOTICE.txt?url';
type FrameResult = { time: number; name: string; blob: Blob };
export default function VideoFrameExtractor({ locale }: ToolProps) {
  const [source, setSource] = useState<{
      file: File;
      duration: number;
      width: number;
      height: number;
    }>(),
    [time, setTime] = useState(0),
    [width, setWidth] = useState('1280'),
    [format, setFormat] = useState<'png' | 'jpeg'>('png'),
    [quality, setQuality] = useState('90'),
    [interval, setInterval] = useState('5'),
    [progress, setProgress] = useState('');
  const video = useRef<HTMLVideoElement>(null),
    url = useRef<string | undefined>(undefined),
    job = useJob<{ frames: FrameResult[]; zip?: Blob }>(locale),
    preview = useBlobUrl(job.result?.frames[0]?.blob);
  const release = () => {
    const el = video.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = undefined;
  };
  useEffect(() => () => release(), []);
  const clear = () => {
    job.invalidate();
    release();
    setSource(undefined);
    setTime(0);
    setProgress('');
  };
  const invalidate = () => {
    job.invalidate();
    setProgress('');
  };
  const extract = (batch: boolean) => {
    void job.run(async (signal) => {
      if (!source || !video.current) throw new Error();
      const size = frameSize(width, source),
        q = integer(quality, 1, 100) / 100,
        times = batch
          ? frameTimes(source.duration, interval, size)
          : [video.current.currentTime];
      const frames: FrameResult[] = [];
      let total = 0;
      for (const [index, at] of times.entries()) {
        const blob = await captureFrame(
          video.current,
          at,
          size,
          format,
          q,
          signal,
        );
        total += blob.size;
        if (total > 96 * MiB)
          fail('帧输出累计超过 96 MiB。', 'Frame output exceeds 96 MiB total.');
        frames.push({
          time: at,
          name: `frame-${String(index + 1).padStart(3, '0')}-${at.toFixed(3).replace('.', '_')}.${format === 'jpeg' ? 'jpg' : 'png'}`,
          blob,
        });
        if (!signal.aborted) setProgress(`${index + 1} / ${times.length}`);
      }
      return { frames };
    });
  };
  return (
    <Frame locale={locale}>
      <span hidden data-video-zip-license={notice} />
      <Picker
        locale={locale}
        multiple={false}
        accept="video/*"
        disabled={job.busy}
        onFiles={(files) => {
          clear();
          void job.run(async (signal) => {
            if (!files[0].size || files[0].size > 100 * MiB)
              fail('视频文件上限 100 MiB。', 'Video file limit: 100 MiB.');
            const next = URL.createObjectURL(files[0]);
            url.current = next;
            try {
              const info = await loadVideo(video.current!, next, signal);
              if (signal.aborted) throw new Error();
              setSource({ file: files[0], ...info });
              setWidth(String(Math.min(info.width, 1280)));
              return { frames: [] };
            } catch (e) {
              release();
              throw e;
            }
          });
        }}
      />
      <video
        ref={video}
        hidden={!source}
        controls={!job.busy}
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        className={s.canvas}
      />
      <ErrorText error={job.error} />
      {source && (
        <>
          <p>
            {source.file.name} · {source.width} × {source.height} ·{' '}
            {source.duration.toFixed(3)} s
          </p>
          <SliderField
            label={tr(locale, '定位（秒）', 'Position (seconds)')}
            value={Number(time.toFixed(2))}
            onValueChange={(v) => {
              invalidate();
              setTime(v);
              if (video.current)
                video.current.currentTime = Math.min(
                  v,
                  source.duration - 0.001,
                );
            }}
            min={0}
            max={source.duration}
            step={0.01}
            disabled={job.busy}
          />
          <div className={s.columns}>
            <TextField
              label={tr(
                locale,
                '输出宽度（像素，保持比例）',
                'Output width (pixels, keep aspect ratio)',
              )}
              value={width}
              onChange={(v) => {
                invalidate();
                setWidth(v);
              }}
            />
            <SelectField
              label={tr(locale, '输出格式', 'Output format')}
              value={format}
              onValueChange={(v) => {
                invalidate();
                setFormat(v as typeof format);
              }}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpeg', label: 'JPEG' },
              ]}
            />
            {format === 'jpeg' && (
              <TextField
                label={tr(locale, 'JPEG 质量（1–100）', 'JPEG quality (1–100)')}
                value={quality}
                onChange={(v) => {
                  invalidate();
                  setQuality(v);
                }}
              />
            )}
            <TextField
              label={tr(locale, '批量间隔（秒）', 'Batch interval (seconds)')}
              value={interval}
              onChange={(v) => {
                invalidate();
                setInterval(v);
              }}
            />
          </div>
          <div className={s.row}>
            <Button
              variant="primary"
              loading={job.busy}
              onClick={() => extract(false)}
            >
              {tr(locale, '提取当前帧', 'Extract current frame')}
            </Button>
            <Button disabled={job.busy} onClick={() => extract(true)}>
              {tr(locale, '按间隔提取', 'Extract at intervals')}
            </Button>
          </div>
          <p role="status" className={s.note}>
            {progress}
          </p>
        </>
      )}
      {!!job.result?.frames.length && (
        <>
          {preview && (
            <img
              src={preview}
              alt={tr(locale, '提取的实际画面', 'Extracted frame')}
              className={s.canvas}
            />
          )}
          <ul className={s.list}>
            {job.result.frames.map((frame) => (
              <li key={frame.name} className={s.item}>
                <span className={s.grow}>
                  {frame.time.toFixed(3)} s ·{' '}
                  {(frame.blob.size / 1024).toFixed(1)} KB
                </span>
                <Button onClick={() => saveBlob(frame.blob, frame.name)}>
                  {tr(locale, '下载图片', 'Download image')}
                </Button>
              </li>
            ))}
          </ul>
          <Button
            loading={job.busy}
            onClick={() => {
              const frames = job.result!.frames;
              void job.run(async (signal) => ({
                frames,
                zip: await packZip(
                  frames.map((f) => ({ name: f.name, blob: f.blob })),
                  signal,
                ),
              }));
            }}
          >
            {tr(locale, '打包 ZIP', 'Create ZIP')}
          </Button>
          {job.result.zip && (
            <Button onClick={() => saveBlob(job.result!.zip!, 'frames.zip')}>
              {tr(locale, '下载 ZIP', 'Download ZIP')}
            </Button>
          )}
        </>
      )}
      <Button onClick={clear}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
