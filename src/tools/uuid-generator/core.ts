import { fail } from '../general/bounds';

export const uuidLimits = {
  records: 10_000,
  inputBytes: 2 * 1024 * 1024,
  nameBytes: 4096,
  reportBytes: 16 * 1024 * 1024,
} as const;

export const representations = ['standard', 'uppercase', 'compact', 'guid', 'urn', 'base64', 'base64url'] as const;
export type Representation = typeof representations[number];
export type InputFormat = 'auto' | 'base64' | 'base64url';
export const versions = ['v4', 'v7', 'v1', 'v3', 'v5', 'v6', 'nil', 'max'] as const;
export type GenerationVersion = typeof versions[number];
export type UuidBatch = { version: GenerationVersion; values: Uint8Array[] };

const canonical = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const compact = /^[0-9a-f]{32}$/i;
const byteHex = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, '0'));
const utf8 = new TextEncoder();

function fromHex(hex: string) {
  return Uint8Array.from({ length: 16 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

export function formatUuid(bytes: Uint8Array, format: Representation = 'standard') {
  if (format === 'base64' || format === 'base64url') {
    const encoded = btoa(String.fromCharCode(...bytes));
    return format === 'base64' ? encoded : encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
  const hex = Array.from(bytes, byte => byteHex[byte]).join('');
  if (format === 'compact') return hex;
  const standard = hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  if (format === 'uppercase') return standard.toUpperCase();
  if (format === 'guid') return '{' + standard.toUpperCase() + '}';
  if (format === 'urn') return 'urn:uuid:' + standard;
  return standard;
}

export function decodeUuid(source: string, format: InputFormat = 'auto'): Uint8Array | undefined {
  if (format === 'auto') {
    let value = source;
    if (/^urn:uuid:/i.test(source)) value = source.slice(9);
    else if (source.startsWith('{') && source.endsWith('}')) value = source.slice(1, -1);
    else if (source.length === 32 && compact.test(source)) return fromHex(source);
    return value.length === 36 && canonical.test(value) ? fromHex(value.replaceAll('-', '')) : undefined;
  }
  const allowed = format === 'base64' ? /^[A-Za-z0-9+/]{22}==$/ : /^[A-Za-z0-9_-]{22}$/;
  if (source.length !== (format === 'base64' ? 24 : 22) || !allowed.test(source)) return;
  const standard = format === 'base64' ? source : source.replaceAll('-', '+').replaceAll('_', '/') + '==';
  const bytes = Uint8Array.from(atob(standard), char => char.charCodeAt(0));
  if (bytes.length === 16 && formatUuid(bytes, format) === source) return bytes;
}

export function checkCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > uuidLimits.records)
    fail('每次生成 1–10,000 个 UUID。', 'Generate 1–10,000 UUIDs at a time.');
}

export function randomUuid(secure: Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>> = globalThis.crypto) {
  if (secure?.randomUUID) return decodeUuid(secure.randomUUID())!;
  if (!secure?.getRandomValues)
    fail('浏览器不支持安全随机数。', 'Secure random numbers are unavailable.');
  const bytes = secure.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  return bytes;
}

/** A final line separator terminates the last record. Empty interior lines remain records. */
export function uuidLines(source: string) {
  if (source.length > uuidLimits.inputBytes || utf8.encode(source).length > uuidLimits.inputBytes)
    fail('输入超过 2 MiB 的 UTF-8 预算。', 'Input exceeds the 2 MiB UTF-8 budget.');
  if (!source) return [];
  const lines = source.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  if (lines.length > uuidLimits.records)
    fail('每批最多 10,000 条。', 'Each batch supports up to 10,000 rows.');
  return lines;
}

export async function mapUuidBatch<T, R>(values: readonly T[], transform: (value: T, index: number) => R): Promise<R[]> {
  const output: R[] = [];
  for (let offset = 0; offset < values.length; offset += 256) {
    if (offset > 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    for (let index = offset; index < Math.min(offset + 256, values.length); index++)
      output.push(transform(values[index], index));
  }
  return output;
}
