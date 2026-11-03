import { fail, MiB } from '../general/bounds';
export async function hashFile(file: Blob, signal?: AbortSignal) {
  if (file.size > 32 * MiB)
    fail('SHA-256 单文件上限 32 MiB。', 'SHA-256 file limit: 32 MiB.');
  if (!globalThis.crypto?.subtle)
    fail(
      '当前浏览器不支持安全哈希，请使用 HTTPS 或本地环境。',
      'Secure hashing is unavailable. Use HTTPS or localhost.',
    );
  const data = await file.arrayBuffer();
  if (signal?.aborted) throw new Error();
  const bytes = await crypto.subtle.digest('SHA-256', data);
  if (signal?.aborted) throw new Error();
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export function compareHash(actual: string, expected: string) {
  if (!/^[a-f\d]{64}$/i.test(expected.trim()))
    fail(
      '预期 SHA-256 必须是 64 位十六进制。',
      'Expected SHA-256 must contain 64 hexadecimal characters.',
    );
  return actual.toLowerCase() === expected.trim().toLowerCase();
}
