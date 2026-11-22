import { fail } from '../general/bounds';
import type { Locale } from '../../i18n/locale';

export type TimestampUnit = 'seconds' | 'milliseconds';
export type InputZone = 'utc' | 'local';
export const sampleInstant = 1_704_067_200_000;
const dateLimit = 8_640_000_000_000_000;

function checkedInstant(ms: number) {
  if (!Number.isSafeInteger(ms) || Math.abs(ms) > dateLimit)
    fail('时间超出有效范围。', 'Time is outside the supported range.');
  return ms;
}

export function fromTimestamp(input: string, unit: TimestampUnit) {
  const value = input.trim();
  const match = (unit === 'seconds' ? /^([+-]?)(\d+)(?:\.(\d{1,3}))?$/ : /^([+-]?)(\d+)$/).exec(value);
  if (!match)
    fail(
      unit === 'seconds' ? '请输入 Unix 秒，最多三位小数。' : '请输入整数 Unix 毫秒。',
      unit === 'seconds' ? 'Enter Unix seconds with up to three decimal places.' : 'Enter whole Unix milliseconds.',
    );
  const [, sign, whole, fraction = ''] = match;
  const digits = unit === 'seconds' ? whole + fraction.padEnd(3, '0') : whole;
  const ms = checkedInstant(Number(digits));
  return sign === '-' && ms !== 0 ? -ms : ms;
}

export function formatTimestamp(ms: number, unit: TimestampUnit) {
  checkedInstant(ms);
  if (unit === 'milliseconds') return String(ms);
  // The Date range fits in safe integers. Split its decimal digits without dividing a float.
  const digits = String(Math.abs(ms)).padStart(4, '0');
  const fraction = digits.slice(-3).replace(/0+$/, '');
  return (ms < 0 ? '-' : '') + digits.slice(0, -3) + (fraction ? '.' + fraction : '');
}

function calendarError(): never {
  fail('请输入有效的日期和时间，不支持闰秒。', 'Enter a valid date and time. Leap seconds are unsupported.');
}

function yearError(): never {
  fail('该时刻无法用四位年份表示，请使用时间戳。', 'This time cannot be entered with a four-digit year. Use a timestamp.');
}

function utcTime(y: number, m: number, d: number, hh: number, mm: number, ss: number, ms: number) {
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(hh, mm, ss, ms);
  return date;
}

function readCalendar(day: string, time: string) {
  if (/^[+-]|^\d{5,}-/.test(day)) yearError();
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const clock = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(time);
  if (!date || !clock) calendarError();
  const [year, month, dayOfMonth] = date.slice(1).map(Number);
  const [, hours, minutes, seconds = '0', fraction = ''] = clock;
  const hh = Number(hours), mm = Number(minutes), ss = Number(seconds);
  if (hh > 23 || mm > 59 || ss > 59) calendarError();
  const utc = utcTime(year, month, dayOfMonth, hh, mm, ss, Number(fraction.padEnd(3, '0')));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== dayOfMonth)
    calendarError();
  return utc;
}

function localWallTime(instant: number) {
  const date = new Date(instant);
  return utcTime(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds(),
  ).getTime();
}

export function fromCalendar(day: string, time: string, zone: InputZone) {
  if (day.startsWith('0000-')) yearError();
  const wall = readCalendar(day, time);
  if (zone === 'utc') return wall.getTime();
  const instant = new Date(wall.toISOString().slice(0, -1)).getTime();
  if (localWallTime(instant) !== wall.getTime())
    fail('此本地时间因时钟向前调整而不存在，请选择其他时间。', 'This local time does not exist because the clock moved forward. Choose another time.');

  // Date resolves a fold to the earlier instant. Check offsets through the following
  // hours (including date-line changes) and verify any alternative by round-tripping
  // its local fields. Local clocks can shift by amounts other than a whole hour.
  for (let hours = 6; hours <= 30; hours += 6) {
    const probe = instant + hours * 3_600_000;
    const alternative = wall.getTime() - (localWallTime(probe) - probe);
    if (alternative !== instant && localWallTime(alternative) === wall.getTime())
      fail('此本地时间出现两次。请在高级模式输入带明确偏移的 ISO 8601。', 'This local time occurs twice. In Advanced mode, enter ISO 8601 with an explicit offset.');
  }
  return instant;
}

export function fromIso(input: string) {
  const value = input.trim();
  if (/^[+-]|^\d{5,}-/.test(value)) yearError();
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(Z|([+-])(\d{2}):(\d{2}))$/i.exec(value);
  if (!match)
    fail('请输入带 Z 或 ±HH:MM 偏移的 ISO 8601，最多三位小数秒。', 'Enter ISO 8601 with Z or a ±HH:MM offset and up to three decimal places for seconds.');
  const [, day, time, , sign, hours = '0', minutes = '0'] = match;
  if (Number(hours) > 23 || Number(minutes) > 59)
    fail('时区偏移无效。', 'Invalid time-zone offset.');
  const offset = (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * 60_000;
  return checkedInstant(readCalendar(day, time).getTime() - offset);
}

export function calendarFields(ms: number, zone: InputZone) {
  const wall = new Date(zone === 'local' ? localWallTime(ms) : ms);
  const year = wall.getUTCFullYear();
  if (year < 1 || year > 9999 || !Number.isFinite(year)) yearError();
  const [date, time] = wall.toISOString().slice(0, -1).split('T');
  return { date, time, zone };
}

export function isoField(ms: number) {
  const iso = new Date(ms).toISOString();
  if (iso[0] === '+' || iso[0] === '-') yearError();
  return iso;
}

export const browserTimeZone = () => new Intl.DateTimeFormat().resolvedOptions().timeZone;

export function timeZoneFormatter(locale: Locale, zone: string, showEra = false) {
  // Intl can also accept a bare UTC offset. This field accepts named IANA zones only.
  const invalid = () => fail('请输入有效的 IANA 时区，例如 Asia/Shanghai。', 'Enter a valid IANA time zone, such as America/New_York.');
  if (!/^[A-Za-z][A-Za-z_0-9+/-]*$/.test(zone)) return invalid();
  try {
    return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      timeZone: zone, calendar: 'gregory', ...(showEra && { era: 'short' }),
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
      hourCycle: 'h23', timeZoneName: 'longOffset',
    });
  } catch (error) {
    if (error instanceof RangeError) return invalid();
    throw error;
  }
}

export function timestampValues(ms: number, locale: Locale, localZone: string | null = browserTimeZone()) {
  const date = new Date(checkedInstant(ms));
  const iso = date.toISOString();
  return {
    seconds: formatTimestamp(ms, 'seconds'),
    milliseconds: formatTimestamp(ms, 'milliseconds'),
    iso,
    utc: iso.replace('T', ' ').replace(/Z$/, ' UTC'),
    local: localZone ? timeZoneFormatter(locale, localZone, date.getUTCFullYear() <= 1).format(date) : undefined,
  };
}
