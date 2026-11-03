import { fail, MiB } from '../general/bounds';
export function audioRange(start: string, end: string, duration: number) {
  const a = Number(start),
    b = Number(end);
  if (
    !start.trim() ||
    !end.trim() ||
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a < 0 ||
    b <= a ||
    b > duration
  )
    fail(
      '范围须满足 0 ≤ 起点 < 终点 ≤ 总时长。',
      'Range must satisfy 0 ≤ start < end ≤ duration.',
    );
  return [a, b] as const;
}
export function encodeWav(
  channels: readonly Float32Array[],
  sampleRate: number,
  start = 0,
  end = channels[0]?.length ?? 0,
) {
  if (
    !channels.length ||
    channels.length > 2 ||
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    end <= start ||
    start < 0 ||
    channels.some((c) => c.length < end)
  )
    fail('音频范围或格式无效。', 'Invalid audio range or format.');
  const length = end - start,
    bytes = length * channels.length * 2;
  if (bytes > 64 * MiB)
    fail('WAV 输出超过 64 MiB。', 'WAV output exceeds 64 MiB.');
  const buffer = new ArrayBuffer(44 + bytes),
    d = new DataView(buffer);
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      d.setUint8(at + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  d.setUint32(4, 36 + bytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, channels.length, true);
  d.setUint32(24, sampleRate, true);
  d.setUint32(28, sampleRate * channels.length * 2, true);
  d.setUint16(32, channels.length * 2, true);
  d.setUint16(34, 16, true);
  ascii(36, 'data');
  d.setUint32(40, bytes, true);
  let at = 44;
  for (let n = start; n < end; n++)
    for (const c of channels) {
      const value = Math.max(-1, Math.min(1, c[n]));
      d.setInt16(at, Math.round(value * (value < 0 ? 32768 : 32767)), true);
      at += 2;
    }
  return buffer;
}
export async function inspectDuration(file: File, signal: AbortSignal) {
  if (!file.size || file.size > 20 * MiB)
    fail('音频输入上限 20 MiB。', 'Audio input limit: 20 MiB.');
  const audio = document.createElement('audio'),
    url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const finish = (value?: number) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        value === undefined ? reject(new Error()) : resolve(value);
      };
      const cancel = () => finish();
      const timer = setTimeout(cancel, 15000);
      signal.addEventListener('abort', cancel, { once: true });
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        if (
          !Number.isFinite(audio.duration) ||
          audio.duration <= 0 ||
          audio.duration > 180
        ) {
          finish();
          return;
        }
        finish(audio.duration);
      };
      audio.onerror = cancel;
      audio.src = url;
      if (signal.aborted) cancel();
    });
  } catch {
    fail(
      '音频不受支持、损坏或超过 180 秒。',
      'Audio is unsupported, damaged or longer than 180 seconds.',
    );
  } finally {
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(url);
  }
}
