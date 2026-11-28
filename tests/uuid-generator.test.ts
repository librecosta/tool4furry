import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { NIL, MAX, v1, v6, v7 } from 'uuid';
import { updateV7State } from '../node_modules/uuid/dist/v7.js';
import { decodeUuid, formatUuid, randomUuid, representations, uuidLimits, uuidLines } from '../src/tools/uuid-generator/core';
import { createUuidNamer, readUuidFile, serializeReport, serializeUuids } from '../src/tools/uuid-generator/delivery';
import { generateBatch, namespaces, type GenerationSettings } from '../src/tools/uuid-generator/generation';
import { inspectBatch, inspectUuid, isValidUuid, uuidFields } from '../src/tools/uuid-generator/inspection';
import { timeOrderedUuid } from '../src/tools/uuid-generator/time-v7';

const vectors = {
  v1: 'c232ab00-9414-11ec-b3c8-9f6bdeced846',
  v3: '5df41881-3aed-3515-88a7-2f4a814cf09e',
  v4: '919108f7-52d1-4320-9bac-f847db4148a8',
  v5: '2ed6657d-e927-568b-95e1-2665a8aea6a2',
  v6: '1ec9414c-232a-6b00-b3c8-9f6bdeced846',
  v7: '017f22e2-79b0-7cc3-98c4-dc0c0c07398f',
};

const batch = (changes: Partial<GenerationSettings> = {}) => generateBatch({
  version: 'v4', count: 1, namespace: namespaces.DNS, names: '', multiline: false, ...changes,
});
const parse = (value: string) => inspectUuid(decodeUuid(value));
const strings = ({ values }: Awaited<ReturnType<typeof batch>>) => values.map(value => formatUuid(value));

describe('RFC 9562 Appendix A', () => {
  it.each(Object.entries(vectors))('recognizes %s, preserves all bytes and exposes the actual fields', (version, value) => {
    const bytes = decodeUuid(value)!;
    expect(inspectUuid(bytes)).toMatchObject({ normalized: value, variant: 'rfc', version: Number(version.slice(1)), status: 'valid' });
    expect(bytes).toHaveLength(16);
    const independentBits = Array.from(Buffer.from(value.replaceAll('-', ''), 'hex'), byte => byte.toString(2).padStart(8, '0')).join('');
    const fields = uuidFields(bytes);
    expect(fields.map(field => field.bits).join('')).toBe(independentBits);
    expect(fields.find(field => field.name === 'version')).toMatchObject({ start: 48, width: 4 });
    expect(fields.find(field => field.name === 'variant')).toMatchObject({ start: 64, width: 2, bits: '10' });
  });

  it('reproduces v1/v6 Gregorian vectors and the v4 bit swap', () => {
    const raw = 0x1ec9414c232ab00n;
    const milliseconds = Number((raw - 122192928000000000n) / 10_000n);
    const options = { msecs: milliseconds, nsecs: Number(raw % 10_000n), clockseq: 0x33c8,
      node: Uint8Array.from(Buffer.from('9f6bdeced846', 'hex')), random: new Uint8Array(16) };
    expect(v1(options)).toBe(vectors.v1);
    expect(v6(options)).toBe(vectors.v6);
    for (const version of ['v1', 'v6'] as const)
      expect(parse(vectors[version]).time).toEqual({ ticks: raw.toString(), unixMs: String(milliseconds),
        utc: new Date(milliseconds).toISOString(), unit: 'gregorian-100ns' });
    const secure = { getRandomValues: (destination: Uint8Array) => {
      destination.set(Buffer.from('919108f752d133205bacf847db4148a8', 'hex'));
      return destination;
    } } as Crypto;
    expect(formatUuid(randomUuid(secure))).toBe(vectors.v4);
  });

  it('encodes and decodes the v7 timestamp vector and handles the entire 48-bit field', () => {
    const raw = decodeUuid(vectors.v7)!;
    const sequence = (0xcc3 << 20) | (0x18 << 14) | (0xc4 << 6) | (0xdc >>> 2);
    expect(v7({ msecs: 1645557742000, seq: sequence, random: raw })).toBe(vectors.v7);
    expect(parse(vectors.v7).time).toEqual({ ticks: '1645557742000', unit: 'unix-ms',
      unixMs: '1645557742000', utc: '2022-02-22T19:22:22.000Z' });
    expect(parse('ffffffff-ffff-7000-8000-000000000000').time).toMatchObject({ ticks: '281474976710655' });
    expect(parse('00000000-0000-1000-8000-000000000000').time?.utc).toBe('1582-10-15T00:00:00.000Z');
    expect(parse(vectors.v4).time).toBeNull();
  });

  it.each(['v3', 'v5'] as const)('generates %s DNS vectors and agrees with independent hashing', async version => {
    expect(strings(await batch({ version, names: 'www.example.com' }))).toEqual([vectors[version]]);
    const names = [' 中🎨 ', 'é', 'e\u0301', '', ' 中🎨 ', 'Example', 'example'];
    const expected = names.map(name => {
      const digest = createHash(version === 'v3' ? 'md5' : 'sha1')
        .update(Buffer.from(namespaces['X.500'].replaceAll('-', ''), 'hex')).update(name, 'utf8').digest();
      digest[6] = (digest[6] & 15) | Number(version.slice(1)) << 4;
      digest[8] = (digest[8] & 63) | 128;
      return digest.subarray(0, 16).toString('hex');
    });
    const actual = await batch({ version, namespace: '{' + namespaces['X.500'].toUpperCase() + '}',
      names: names.join('\r\n'), multiline: true });
    expect(actual.values.map(value => formatUuid(value, 'compact'))).toEqual(expected);
    expect(actual.values[0]).toEqual(actual.values[4]);
    await expect(batch({ version, namespace: 'bad', names: 'abc' })).rejects.toThrow(/namespace/);
    await expect(batch({ version, names: '中'.repeat(1400) })).rejects.toThrow(/4 KiB/);
  });
});

describe('generation and ordering', () => {
  it('uses secure v4 bytes and supports all ordinary versions and special values', async () => {
    expect(parse(formatUuid(randomUuid())).version).toBe(4);
    expect(parse(randomUUID()).version).toBe(4);
    expect(() => randomUuid({} as Crypto)).toThrow(/Secure random/);
    for (const version of ['v1', 'v4', 'v6', 'v7'] as const) {
      const output = await batch({ version, count: 50 });
      expect(new Set(strings(output)).size).toBe(50);
      expect(output.values.every(value => inspectUuid(value).version === Number(version.slice(1)))).toBe(true);
      if (version === 'v1' || version === 'v6')
        expect(output.values.every(value => (value[10] & 1) === 1)).toBe(true);
    }
    expect(strings(await batch({ version: 'nil', count: 100 }))).toEqual([NIL]);
    expect(strings(await batch({ version: 'max', count: 100 }))).toEqual([MAX]);
    for (const count of [-1, 0, 10001, 1.5]) await expect(batch({ count })).rejects.toThrow(/1–10,000/);
  });

  it('orders 10,000 same-millisecond values across quick, advanced, and a clock rollback', async () => {
    const now = Date.now() + 10_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const first = formatUuid(timeOrderedUuid());
      const bulk = strings(await batch({ version: 'v7', count: 10_000 }));
      clock.mockReturnValue(now - 1_000);
      const after = formatUuid(timeOrderedUuid());
      const all = [first, ...bulk, after];
      expect(all.every((value, index) => index === 0 || all[index - 1] < value)).toBe(true);
      expect(all.every(value => parse(value).time?.unixMs === String(now))).toBe(true);
    } finally {
      clock.mockRestore();
    }
  });

  it('verifies the pinned browser engine advances time when its 32-bit sequence is exhausted', () => {
    const bytes = new Uint8Array(16);
    const state = { msecs: 9000, seq: -2 };
    expect(updateV7State(state, 9000, bytes)).toEqual({ msecs: 9000, seq: -1 });
    expect(updateV7State(state, 8999, bytes)).toEqual({ msecs: 9001, seq: 0 });
    expect(updateV7State(state, 9000, bytes)).toEqual({ msecs: 9001, seq: 1 });
  });
});

describe('representations, validation and delivery', () => {
  it('round-trips the same 16 bytes in all formats with strict RFC 4648 encodings', () => {
    const bytes = decodeUuid(vectors.v4)!;
    for (const format of representations) {
      const text = formatUuid(bytes, format);
      expect(decodeUuid(text, format === 'base64' || format === 'base64url' ? format : 'auto')).toEqual(bytes);
    }
    expect(formatUuid(bytes, 'guid')).toBe('{919108F7-52D1-4320-9BAC-F847DB4148A8}');
    expect(formatUuid(bytes, 'base64')).toBe(Buffer.from(bytes).toString('base64'));
    expect(formatUuid(bytes, 'base64url')).toBe(Buffer.from(bytes).toString('base64url'));
    expect(decodeUuid('AAAAAAAAAAAAAAAAAAAAAB==', 'base64')).toBeUndefined();
    expect(decodeUuid('AAAAAAAAAAAAAAAAAAAAAB', 'base64url')).toBeUndefined();
    expect(decodeUuid('AAAAAAAAAAAAAAAAAAAAAA', 'base64')).toBeUndefined();
    expect(decodeUuid('AAAAAAAAAAAAAAAAAAAAAA==', 'base64url')).toBeUndefined();
    expect(decodeUuid('AAAAAAAAAAAAAAAAAAAAAA==')).toBeUndefined();
    expect(decodeUuid(vectors.v4 + '\n')).toBeUndefined();
  });

  it('distinguishes special values, valid v8, DCE, unknown versions and other variants', () => {
    expect(parse(NIL)).toMatchObject({ status: 'nil', version: null, variant: null });
    expect(parse(MAX)).toMatchObject({ status: 'max', version: null, variant: null });
    expect(parse('00000000-0000-8000-8000-000000000000')).toMatchObject({ status: 'valid', version: 8 });
    expect(parse('00000000-0000-2000-8000-000000000000')).toMatchObject({ status: 'dce', version: 2 });
    expect(parse('00000000-0000-9000-8000-000000000000')).toMatchObject({ status: 'unknown-version', version: 9 });
    for (const [bits, variant] of [['0', 'ncs'], ['c', 'microsoft'], ['e', 'future']]) {
      const parsed = parse('00000000-0000-1000-' + bits + '000-000000000000');
      expect(parsed).toMatchObject({ status: 'other-variant', variant, version: null, time: null });
      expect(isValidUuid(parsed)).toBe(false);
    }
    expect(parse('not a UUID')).toMatchObject({ status: 'invalid-encoding', normalized: null });
  });

  it('preserves original lines and identifies duplicates by bytes', async () => {
    const otherForms = ['urn:uuid:' + vectors.v7, '{' + vectors.v7.toUpperCase() + '}', vectors.v7.replaceAll('-', '')];
    const entries = [vectors.v7, ...otherForms, '', '=2+2', 'invalid,"中文"', NIL];
    const report = await inspectBatch(entries.join('\r\n') + '\r\n', 'auto');
    expect(report).toMatchObject({ valid: 5, invalid: 3, duplicates: 3 });
    expect(report.rows.map(row => row.input)).toEqual(entries);
    expect(report.rows.map(row => row.duplicate)).toEqual([false, true, true, true, false, false, false, false]);
    expect(JSON.parse(serializeReport(report.rows, 'json'))).toEqual(report.rows);
    const csv = Papa.parse<Record<string, string>>(serializeReport(report.rows, 'csv'), { header: true }).data;
    expect(csv[0]).toMatchObject({ line: '1', unix_ms: '1645557742000', duplicate: 'false' });
    expect(csv[5].input).toBe("'=2+2");
    expect(csv[6].input).toBe(entries[6]);
    expect(csv[7]).toMatchObject({ status: 'nil', version: '', unix_ms: '' });
    expect(uuidLines('\n\n')).toEqual(['', '']);
    expect(() => uuidLines('a\n'.repeat(uuidLimits.records + 1))).toThrow(/10,000/);
    expect(() => uuidLines('中'.repeat(700000))).toThrow(/2 MiB/);
  });

  it('bounds UTF-8 file reading and delivers complete, typed formats with unique names', async () => {
    const file = new File(['\ufeff中文\r\nUUID'], 'uuids.txt');
    expect(await readUuidFile(file)).toBe('中文\r\nUUID');
    await expect(readUuidFile(new File([new Uint8Array([0xc3, 0x28])], 'bad.txt'))).rejects.toThrow(/UTF-8/);
    await expect(readUuidFile(new File([new Uint8Array(uuidLimits.inputBytes + 1)], 'big.txt'))).rejects.toThrow(/2 MiB/);
    const values = [vectors.v1, vectors.v6];
    expect(serializeUuids(values, 'txt', 'comma')).toBe(values.join(','));
    expect(JSON.parse(serializeUuids(values, 'json'))).toEqual(values);
    expect(Papa.parse(serializeUuids(values, 'csv')).data).toEqual([['uuid'], [values[0]], [values[1]]]);
    expect(serializeUuids(values, 'sql')).toBe(values.map(value => "'" + value + "'").join(',\n'));
    const name = createUuidNamer(), date = new Date(2026, 10, 28, 18, 1, 2, 3);
    expect(name('uuid-v4', 'txt', date)).toBe('uuid-v4-20261128-180102-003.txt');
    expect(name('uuid-v4', 'txt', date)).toBe('uuid-v4-20261128-180102-003-2.txt');
  });
});
