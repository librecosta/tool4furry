import { decodeUuid, formatUuid, mapUuidBatch, uuidLines, type InputFormat } from './core';

const gregorianOffset = 122192928000000000n;
export const variants = {
  rfc: 'RFC 9562 / 4122',
  ncs: 'NCS (0xx)',
  microsoft: 'Microsoft (110)',
  future: 'Reserved (111)',
} as const;
type Variant = keyof typeof variants;
export type UuidStatus = 'invalid-encoding' | 'nil' | 'max' | 'other-variant' | 'dce' | 'unknown-version' | 'valid';
export type EmbeddedTime = { ticks: string; unit: 'gregorian-100ns' | 'unix-ms'; unixMs: string; utc: string | null };
export type Inspection = {
  status: UuidStatus;
  normalized: string | null;
  version: number | null;
  variant: Variant | null;
  time: EmbeddedTime | null;
};

function bytesValue(bytes: Uint8Array, start: number, end: number) {
  let value = 0n;
  for (let i = start; i < end; i++) value = (value << 8n) | BigInt(bytes[i]);
  return value;
}

function embeddedTime(bytes: Uint8Array, version: number): EmbeddedTime | null {
  if (version !== 1 && version !== 6 && version !== 7) return null;
  const ticks = version === 1
    ? ((bytesValue(bytes, 6, 8) & 0xfffn) << 48n) | (bytesValue(bytes, 4, 6) << 32n) | bytesValue(bytes, 0, 4)
    : version === 6
      ? (bytesValue(bytes, 0, 6) << 12n) | (bytesValue(bytes, 6, 8) & 0xfffn)
      : bytesValue(bytes, 0, 6);
  const epochTicks = ticks - gregorianOffset;
  // Date has millisecond precision. Floor negative fractions toward the
  // preceding millisecond while retaining the exact 100 ns value separately.
  const unix = version === 7 ? ticks : (epochTicks < 0n ? epochTicks - 9999n : epochTicks) / 10000n;
  const date = new Date(Number(unix));
  return {
    ticks: ticks.toString(),
    unit: version === 7 ? 'unix-ms' : 'gregorian-100ns',
    unixMs: unix.toString(),
    utc: Number.isFinite(date.getTime()) ? date.toISOString() : null,
  };
}

export function inspectUuid(bytes: Uint8Array | undefined): Inspection {
  const empty = { normalized: null, version: null, variant: null, time: null } as const;
  if (!bytes) return { status: 'invalid-encoding', ...empty };
  const normalized = formatUuid(bytes);
  if (bytes.every(byte => byte === 0)) return { ...empty, normalized, status: 'nil' };
  if (bytes.every(byte => byte === 255)) return { ...empty, normalized, status: 'max' };
  const prefix = bytes[8] >>> 5;
  const variant = prefix < 4 ? 'ncs' : prefix < 6 ? 'rfc' : prefix === 6 ? 'microsoft' : 'future';
  if (variant !== 'rfc') return { ...empty, normalized, variant, status: 'other-variant' };
  const version = bytes[6] >>> 4;
  if (version === 2) return { ...empty, normalized, variant, version, status: 'dce' };
  if (version < 1 || version > 8) return { ...empty, normalized, variant, version, status: 'unknown-version' };
  return { normalized, variant, version, status: 'valid', time: embeddedTime(bytes, version) };
}

export const isValidUuid = ({ status }: Inspection) => status === 'valid' || status === 'nil' || status === 'max';
export type ReportRow = Inspection & { line: number; input: string; duplicate: boolean };

export async function inspectBatch(source: string, format: InputFormat) {
  const seen = new Set<string>();
  const distribution = new Map<string, number>();
  let valid = 0;
  let duplicates = 0;
  const rows = await mapUuidBatch(uuidLines(source), (input, index): ReportRow => {
    const parsed = inspectUuid(decodeUuid(input, format));
    const duplicate = parsed.normalized !== null && seen.has(parsed.normalized);
    if (parsed.normalized !== null) seen.add(parsed.normalized);
    if (duplicate) duplicates++;
    if (isValidUuid(parsed)) valid++;
    const key = parsed.version !== null ? 'v' + parsed.version : parsed.status;
    distribution.set(key, (distribution.get(key) ?? 0) + 1);
    return { line: index + 1, input, duplicate, ...parsed };
  });
  return { rows, valid, invalid: rows.length - valid, duplicates, distribution };
}

const layouts = {
  1: [['time-low', 32], ['time-mid', 16], ['version', 4], ['time-high', 12], ['variant', 2], ['clock', 14], ['node', 48]],
  4: [['random-a', 48], ['version', 4], ['random-b', 12], ['variant', 2], ['random-c', 62]],
  6: [['time-big', 48], ['version', 4], ['time-small', 12], ['variant', 2], ['clock', 14], ['node', 48]],
  7: [['unix', 48], ['version', 4], ['rand-a', 12], ['variant', 2], ['rand-b', 62]],
} as const;

export function uuidFields(bytes: Uint8Array, parsed = inspectUuid(bytes)) {
  const prefix = bytes[8] >>> 5;
  const version = parsed.version;
  const variantWidth = prefix < 4 ? 1 : prefix < 6 ? 2 : 3;
  const fields: readonly (readonly [string, number])[] = version !== null && version in layouts
    ? layouts[version as keyof typeof layouts]
    : parsed.status === 'nil' || parsed.status === 'max'
      ? [[parsed.status, 128]]
      : version !== null
        ? [['data', 48], ['version', 4], ['data', 12], ['variant', 2], ['data', 62]]
        : [['data', 64], ['variant', variantWidth], ['data', 64 - variantWidth]];
  const bits = Array.from(bytes, byte => byte.toString(2).padStart(8, '0')).join('');
  let start = 0;
  return fields.map(([name, width]) => {
    const offset = start;
    start += width;
    return { name, start: offset, width, bits: bits.slice(offset, start) };
  });
}
