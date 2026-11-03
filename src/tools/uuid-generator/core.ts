import { fail } from '../general/bounds';
export function generateUuids(
  count: number,
  secure: Pick<Crypto, 'getRandomValues'> = globalThis.crypto,
) {
  if (!Number.isInteger(count) || count < 1 || count > 1000)
    fail('每次生成 1–1000 个 UUID。', 'Generate 1–1,000 UUIDs at a time.');
  if (!secure?.getRandomValues)
    fail('浏览器不支持安全随机数。', 'Secure random numbers are unavailable.');
  return Array.from({ length: count }, () => {
    const bytes = new Uint8Array(16);
    secure.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  });
}
