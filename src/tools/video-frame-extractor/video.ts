import { fail } from '../general/bounds';
import { encodeCanvas } from '../general/canvas-output';
function waitVideo(
  video: HTMLVideoElement,
  event: 'loadedmetadata' | 'loadeddata' | 'seeked',
  signal: AbortSignal,
  act?: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', cancel);
      error ? reject(error) : resolve();
    };
    const done = () => finish(),
      failed = () => {
        try {
          fail(
            '视频不受支持、无法定位或没有可用画面。',
            'Video is unsupported, cannot seek or has no decodable frame.',
          );
        } catch (e) {
          finish(e as Error);
        }
      },
      cancel = () => finish(new Error('Cancelled'));
    const timer = setTimeout(failed, 15000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    else
      try {
        act?.();
      } catch {
        failed();
      }
  });
}
export async function loadVideo(
  video: HTMLVideoElement,
  url: string,
  signal: AbortSignal,
) {
  await waitVideo(video, 'loadedmetadata', signal, () => {
    video.src = url;
    video.load();
  });
  const { duration, videoWidth: width, videoHeight: height } = video;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 1800 ||
    !width ||
    !height ||
    width > 8192 ||
    height > 8192 ||
    width * height > 16000000
  )
    fail(
      '视频须有有效画面，最长 30 分钟、最多 1600 万像素。',
      'Video must have a valid frame, at most 30 minutes and 16 million source pixels.',
    );
  if (video.readyState < 2) await waitVideo(video, 'loadeddata', signal);
  return { duration, width, height };
}
export async function captureFrame(
  video: HTMLVideoElement,
  time: number,
  size: { width: number; height: number },
  format: 'png' | 'jpeg',
  quality: number,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new Error('Cancelled');
  video.pause();
  const target = Math.max(0, Math.min(time, video.duration - 0.001));
  if (!Number.isFinite(target)) throw new Error('time');
  if (video.seeking || Math.abs(video.currentTime - target) > 0.001)
    await waitVideo(video, 'seeked', signal, () => {
      video.currentTime = target;
    });
  if (video.readyState < 2) await waitVideo(video, 'loadeddata', signal);
  if (signal.aborted) throw new Error('Cancelled');
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error();
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size.width, size.height);
    }
    ctx.drawImage(video, 0, 0, size.width, size.height);
    const blob = await encodeCanvas(canvas, format, quality);
    if (signal.aborted) throw new Error('Cancelled');
    return blob;
  } finally {
    canvas.width = canvas.height = 0;
  }
}
