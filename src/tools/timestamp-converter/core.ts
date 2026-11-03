import { fail } from '../general/bounds';
export function fromTimestamp(input: string, unit: 'seconds' | 'milliseconds') {
  if (!/^-?\d+$/.test(input))
    fail(
      '请输入整数时间戳并明确选择单位。',
      'Enter an integer timestamp and select its unit.',
    );
  const n = Number(input),
    ms = n * (unit === 'seconds' ? 1000 : 1);
  if (
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(ms) ||
    Math.abs(ms) > 8.64e15
  )
    fail('时间戳超出有效范围。', 'Timestamp is outside the supported range.');
  return ms;
}
export function fromIso(input: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.test(
      input,
    )
  )
    fail(
      '请输入带 Z 或时区偏移的 ISO 8601 时间。',
      'Enter ISO 8601 time including Z or an explicit time-zone offset.',
    );
  const [y, m, d] = input.slice(0, 10).split('-').map(Number),
    days = new Date(Date.UTC(y < 100 ? y + 400 : y, m, 0)).getUTCDate();
  const hh = Number(input.slice(11, 13)),
    mm = Number(input.slice(14, 16)),
    ss = Number(input.slice(17, 19));
  const offset = input.match(/([+-])(\d{2}):(\d{2})$/);
  const ms = Date.parse(input);
  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > days ||
    hh > 23 ||
    mm > 59 ||
    ss > 59 ||
    (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59)) ||
    !Number.isFinite(ms)
  )
    fail('日期或时间无效。', 'Invalid calendar date or time.');
  return ms;
}
export function timestampValues(ms: number, locale: 'zh' | 'en') {
  const date = new Date(ms);
  return {
    milliseconds: String(ms),
    seconds: String(ms / 1000),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      timeZoneName: 'short',
    }),
  };
}
