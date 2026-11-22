import { describe, expect, it, vi } from 'vitest';
import {
  browserTimeZone, calendarFields, formatTimestamp, fromCalendar, fromIso, fromTimestamp,
  isoField, sampleInstant, timestampValues, timeZoneFormatter,
} from '../src/tools/timestamp-converter/core';

describe('Unix timestamps', () => {
  it.each([
    ['0', 0], ['1', 1000], ['-1', -1000], ['1.5', 1500], ['0.001', 1],
    ['-0.001', -1], ['-1.25', -1250], ['1.001', 1001], ['1704067200.123', 1704067200123],
    ['-8639999999999.999', -8639999999999999], ['8639999999999.999', 8639999999999999],
    ['-8640000000000', -8640000000000000], ['8640000000000', 8640000000000000],
  ] as const)('converts %s seconds exactly to %d milliseconds and back', (seconds, ms) => {
    expect(fromTimestamp(seconds, 'seconds')).toBe(ms);
    expect(fromTimestamp(String(ms), 'milliseconds')).toBe(ms);
    expect(formatTimestamp(ms, 'seconds')).toBe(seconds);
    expect(formatTimestamp(ms, 'milliseconds')).toBe(String(ms));
  });

  it.each(['', '.', '-0.0001', '1e3', '0x1', '1 000', '1704067200,1', 'Infinity'])('rejects invalid Unix seconds %j', value => {
    expect(() => fromTimestamp(value, 'seconds')).toThrow('up to three decimal places');
  });

  it('allows an explicit sign and surrounding whitespace and normalizes negative zero', () => {
    expect(fromTimestamp(' +1.001 ', 'seconds')).toBe(1001);
    expect(fromTimestamp('-0.000', 'seconds')).toBe(0);
    expect(() => fromTimestamp('1.0', 'milliseconds')).toThrow('whole Unix milliseconds');
  });

  it('rejects overflow for both units and the first millisecond outside Date', () => {
    for (const input of ['8640000000000.001', '-8640000000000.001', '9'.repeat(400)])
      expect(() => fromTimestamp(input, 'seconds')).toThrow('outside the supported range');
    for (const input of ['8640000000000001', '-8640000000000001', '9007199254740993', '9'.repeat(400)])
      expect(() => fromTimestamp(input, 'milliseconds')).toThrow('outside the supported range');
    expect(() => timestampValues(NaN, 'en')).toThrow('outside the supported range');
  });
});

describe('structured and ISO date input', () => {
  it.each([
    ['2024-01-01', '00:00', 1704067200000],
    ['2024-02-29', '12:34:56.999', 1709210096999],
    ['1969-12-31', '23:59:59.999', -1],
    ['0001-01-01', '00:00:00', -62135596800000],
  ] as const)('reads %s %s as UTC without zone, precision or year remapping', (date, time, expected) => {
    expect(fromCalendar(date, time, 'utc')).toBe(expected);
    const fields = calendarFields(expected, 'utc');
    expect(fields.date).toBe(date);
    expect(fromCalendar(fields.date, fields.time, 'utc')).toBe(expected);
  });

  it.each([
    ['2023-02-29', '00:00'], ['2024-02-30', '00:00'], ['2024-00-10', '00:00'], ['2024-13-01', '00:00'],
    ['2024-01-00', '00:00'], ['2024-01-01', '24:00'], ['2024-01-01', '01:60'],
    ['2024-01-01', '01:00:60'], ['2024-01-01', '01:00:00.1000'], ['', ''],
  ])('rejects invalid calendar fields %s %s without normalization', (date, time) => {
    expect(() => fromCalendar(date, time, 'utc')).toThrow('valid date and time');
  });

  it('parses Z and both offset signs with exact millisecond equivalence', () => {
    for (const iso of ['2024-01-01T00:00:00.123Z', '2024-01-01T08:00:00.123+08:00', '2023-12-31T19:00:00.123-05:00'])
      expect(fromIso(iso)).toBe(1704067200123);
    expect(fromIso('1969-12-31T23:59:59.999Z')).toBe(-1);
    expect(fromIso('0000-01-01T00:00:00Z')).toBe(-62167219200000);
    expect(isoField(sampleInstant)).toBe('2024-01-01T00:00:00.000Z');
  });

  it('rejects missing zones, excessive precision, leap seconds and invalid offsets', () => {
    for (const iso of ['2024-01-01T01:00:00', '2024-01-01T00:00:00.1234Z'])
      expect(() => fromIso(iso)).toThrow('Z or a ±HH:MM offset');
    for (const offset of ['+24:00', '-05:60'])
      expect(() => fromIso('2024-01-01T00:00:00' + offset)).toThrow('Invalid time-zone offset');
    for (const iso of ['2024-02-30T00:00:00Z', '2023-12-31T23:59:60Z', '2024-01-01T24:00:00Z'])
      expect(() => fromIso(iso)).toThrow('valid date and time');
  });

  it('offers extended years as timestamp output and rejects them as date input', () => {
    expect(timestampValues(8640000000000000, 'en', 'UTC').iso).toBe('+275760-09-13T00:00:00.000Z');
    expect(timestampValues(-8640000000000000, 'en', 'UTC').iso).toBe('-271821-04-20T00:00:00.000Z');
    expect(() => isoField(8640000000000000)).toThrow('four-digit year');
    expect(() => fromIso('+275760-09-13T00:00:00.000Z')).toThrow('four-digit year');
    expect(() => fromCalendar('0000-01-01', '00:00', 'utc')).toThrow('four-digit year');
    expect(() => calendarFields(8640000000000000, 'utc')).toThrow('four-digit year');
  });
});

describe('browser local time and IANA display', () => {
  it('rejects both New York DST transitions with deterministic local offsets', () => {
    vi.stubEnv('TZ', 'America/New_York');
    expect(browserTimeZone()).toBe('America/New_York');
    expect(() => fromCalendar('2024-03-10', '02:30:00.123', 'local')).toThrow('does not exist');
    expect(() => fromCalendar('2024-11-03', '01:30:00.123', 'local')).toThrow('occurs twice');
    expect(fromCalendar('2024-03-10', '01:59:59.999', 'local')).toBe(1710053999999);
    expect(fromCalendar('2024-03-10', '03:00:00', 'local')).toBe(1710054000000);
    expect(fromCalendar('2024-11-03', '02:00:00', 'local')).toBe(1730617200000);
    expect(fromIso('2024-11-03T01:30:00.123-05:00') - fromIso('2024-11-03T01:30:00.123-04:00')).toBe(3600000);
  });

  it('detects a half-hour clock change and a skipped calendar day', () => {
    vi.stubEnv('TZ', 'Australia/Lord_Howe');
    expect(() => fromCalendar('2024-04-07', '01:45:00', 'local')).toThrow('occurs twice');
    expect(() => fromCalendar('2024-10-06', '02:15:00', 'local')).toThrow('does not exist');
    vi.stubEnv('TZ', 'Pacific/Apia');
    expect(() => fromCalendar('2011-12-30', '12:00:00', 'local')).toThrow('does not exist');
  });

  it('uses the browser zone for local input in UTC and Shanghai', () => {
    vi.stubEnv('TZ', 'UTC');
    expect(fromCalendar('2024-01-01', '00:00:00.001', 'local')).toBe(1704067200001);
    vi.stubEnv('TZ', 'Asia/Shanghai');
    expect(fromCalendar('2024-01-01', '08:00:00.001', 'local')).toBe(1704067200001);
    expect(calendarFields(sampleInstant, 'local')).toEqual({ date: '2024-01-01', time: '08:00:00.000', zone: 'local' });
  });

  it('keeps all values on the same instant and shows actual seasonal offsets', () => {
    const winter = timestampValues(1704067200123, 'en', 'America/New_York');
    const utc = timestampValues(1704067200123, 'en', 'UTC');
    expect(winter).toMatchObject({
      seconds: '1704067200.123', milliseconds: '1704067200123',
      iso: '2024-01-01T00:00:00.123Z', utc: '2024-01-01 00:00:00.123 UTC',
    });
    expect(winter.local).toMatch(/12\/31\/2023, 19:00:00\.123 GMT-05:00/);
    expect(utc).toEqual({ ...winter, local: expect.stringMatching(/01\/01\/2024, 00:00:00\.123 GMT(?:\+00:00)?$/) });
    const ny = timeZoneFormatter('en', 'America/New_York');
    expect(ny.format(fromIso('2024-07-01T00:00:00.123Z'))).toMatch(/06\/30\/2024, 20:00:00\.123 GMT-04:00/);
    expect(timeZoneFormatter('en', 'Asia/Shanghai').format(sampleInstant)).toContain('08:00:00.000 GMT+08:00');
    expect(timeZoneFormatter('en', 'Etc/GMT+5').format(sampleInstant)).toContain('19:00:00.000 GMT-05:00');
    for (const zone of ['Europe/Nowhere', '+08:00'])
      expect(() => timeZoneFormatter('en', zone)).toThrow('valid IANA time zone');
  });
});
