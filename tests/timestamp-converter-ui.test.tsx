import { Tooltip } from '@base-ui/react/tooltip';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import TimestampConverter from '../src/tools/timestamp-converter/TimestampConverter';
import { setViewport } from './setup';

const clipboard = vi.fn();
beforeEach(() => {
  clipboard.mockReset().mockResolvedValue(undefined);
  vi.stubEnv('TZ', 'UTC');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});

const sample = '2024-01-01T00:00:00.000Z';
function setup(locale: 'en' | 'zh' = 'en') {
  const viewport = setViewport();
  const result = render(
    <StrictMode>
      <Tooltip.Provider>
        <TimestampConverter locale={locale} region={locale === 'zh' ? 'cn' : 'global'} />
      </Tooltip.Provider>
    </StrictMode>,
  );
  return { ...result, viewport };
}
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const press = (name: string) => fireEvent.click(button(name));
const selected = (name: string) => expect(button(name).getAttribute('aria-pressed')).toBe('true');
const field = (label: string) => screen.getByLabelText(label, { exact: true }) as HTMLInputElement;
const edit = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });
const row = (key: string) => document.querySelector('[data-timestamp-result="' + key + '"]') as HTMLElement;
const result = (key = 'iso') => row(key).querySelector('dd')!.textContent;
function disabledResults() {
  for (const key of ['seconds', 'milliseconds', 'iso', 'utc', 'local']) {
    expect(result(key)).toBe('—');
    expect(within(row(key)).getByRole('button')).toHaveProperty('disabled', true);
  }
}

it('starts with the same fixed English sample in both languages', () => {
  const { unmount } = setup();
  selected('Quick');
  selected('Timestamp to Date');
  selected('Seconds');
  expect(field('Unix timestamp').value).toBe('1704067200');
  expect(screen.getByText('Example · January 1, 2024')).toBeTruthy();
  expect(result()).toBe(sample);
  expect(result('utc')).toBe('2024-01-01 00:00:00.000 UTC');
  expect(result('milliseconds')).toBe('1704067200000');
  expect(screen.queryByRole('group', { name: 'Date input format' })).toBeNull();
  expect(document.querySelector('select, textarea, .cm-editor')).toBeNull();
  unmount();
  setup('zh');
  selected('快速');
  selected('时间戳 → 日期');
  selected('秒');
  expect(field('Unix 时间戳').value).toBe('1704067200');
  expect(screen.getByText('示例 · January 1, 2024')).toBeTruthy();
  expect(result()).toBe(sample);
});

it('changes explicit units without changing the instant and preserves invalid text', () => {
  setup();
  edit('Unix timestamp', '-1.001');
  expect(result()).toBe('1969-12-31T23:59:58.999Z');
  press('Milliseconds');
  selected('Milliseconds');
  expect(field('Unix timestamp').value).toBe('-1001');
  expect(result('seconds')).toBe('-1.001');
  press('Seconds');
  expect(field('Unix timestamp').value).toBe('-1.001');
  edit('Unix timestamp', '12.x');
  disabledResults();
  press('Milliseconds');
  expect(field('Unix timestamp').value).toBe('12.x');
  expect(screen.getByRole('alert').textContent).toContain('whole Unix milliseconds');
  disabledResults();
  edit('Unix timestamp', '0');
  expect(result()).toBe('1970-01-01T00:00:00.000Z');
});

it('transfers the instant, uses structured date and time input, and remembers an unfinished draft', () => {
  vi.stubEnv('TZ', 'Asia/Shanghai');
  setup();
  edit('Unix timestamp', '1704067200.123');
  press('Date to Timestamp');
  expect(field('Date')).toMatchObject({ type: 'text', value: '2024-01-01' });
  expect(field('Time (millisecond precision)')).toMatchObject({ type: 'text', value: '00:00:00.123' });
  selected('UTC');
  press('Local');
  selected('Local');
  expect(screen.getAllByText('Asia/Shanghai')).toHaveLength(2);
  expect(result()).toBe('2023-12-31T16:00:00.123Z');
  edit('Time (millisecond precision)', '08:00:00.123');
  expect(result()).toBe('2024-01-01T00:00:00.123Z');
  press('Timestamp to Date');
  expect(field('Unix timestamp').value).toBe('1704067200.123');
  press('Date to Timestamp');
  edit('Time (millisecond precision)', '');
  disabledResults();
  press('Timestamp to Date');
  edit('Unix timestamp', '1.25');
  expect(result()).toBe('1970-01-01T00:00:01.250Z');
  press('Date to Timestamp');
  expect(field('Time (millisecond precision)').value).toBe('');
  disabledResults();
  press('Load sample');
  selected('UTC');
  expect(result()).toBe(sample);
});

it('uses both custom panels for the same live conversion and gates invalid raw drafts', async () => {
  setup();
  const user = userEvent.setup();
  press('Date to Timestamp');
  expect(document.querySelector('input[type=date], input[type=time]')).toBeNull();
  await user.click(button('Choose date'));
  await user.click(screen.getByRole('button', { name: /January 2, 2024/ }));
  expect(field('Date').value).toBe('2024-01-02');
  expect(result()).toBe('2024-01-02T00:00:00.000Z');
  await user.click(button('Choose time'));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Milliseconds' }), { target: { value: '789' } });
  expect(field('Time (millisecond precision)').value).toBe('00:00:00.789');
  expect(result()).toBe('2024-01-02T00:00:00.789Z');
  await user.keyboard('{Escape}');
  edit('Time (millisecond precision)', '00:00');
  disabledResults();
  press('Timestamp to Date');
  press('Date to Timestamp');
  expect(field('Time (millisecond precision)').value).toBe('00:00');
  disabledResults();
  press('Load sample');
  expect(field('Time (millisecond precision)').value).toBe('00:00:00.000');
  expect(result()).toBe(sample);
});

it('reads Now at click time and keeps millisecond precision in every active format', () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1704067200123);
  setup();
  expect(result()).toBe(sample);
  now.mockReturnValue(1704067200456);
  press('Now');
  expect(field('Unix timestamp').value).toBe('1704067200.456');
  expect(result()).toBe('2024-01-01T00:00:00.456Z');
  press('Milliseconds');
  now.mockReturnValue(1704067200789);
  press('Now');
  expect(field('Unix timestamp').value).toBe('1704067200789');
  press('Load sample');
  expect(field('Unix timestamp').value).toBe('1704067200000');
  press('Date to Timestamp');
  press('Local');
  press('Now');
  selected('Local');
  expect(result()).toBe('2024-01-01T00:00:00.789Z');
  press('Advanced');
  press('ISO 8601');
  now.mockReturnValue(1704067200999);
  press('Now');
  expect(field('ISO 8601 with time zone').value).toBe('2024-01-01T00:00:00.999Z');
  press('Load sample');
  expect(field('ISO 8601 with time zone').value).toBe(sample);
});

it('switches date representations, retains malformed ISO, and isolates optional display zones', () => {
  setup();
  press('Date to Timestamp');
  press('Advanced');
  edit('Additional IANA time zone (optional)', 'America/New_York');
  selected('Date and time');
  expect(result('zone')).toContain('19:00:00.000 GMT-05:00');
  press('ISO 8601');
  expect(field('ISO 8601 with time zone').value).toBe(sample);
  edit('ISO 8601 with time zone', '2024-07-01T08:00:00.123+08:00');
  expect(result()).toBe('2024-07-01T00:00:00.123Z');
  expect(result('zone')).toContain('20:00:00.123 GMT-04:00');
  edit('Additional IANA time zone (optional)', 'Invalid/Zone');
  expect(screen.getByRole('alert').textContent).toContain('valid IANA time zone');
  expect(result()).toBe('2024-07-01T00:00:00.123Z');
  expect(row('zone')).toBeNull();
  edit('Additional IANA time zone (optional)', 'Asia/Tokyo');
  expect(result('zone')).toContain('09:00:00.123 GMT+09:00');
  press('Quick');
  expect(field('Date').value).toBe('2024-07-01');
  expect(result()).toBe('2024-07-01T00:00:00.123Z');
  expect(row('zone')).toBeNull();
  press('Advanced');
  selected('ISO 8601');
  expect(field('ISO 8601 with time zone').value).toBe('2024-07-01T08:00:00.123+08:00');
  expect(field('Additional IANA time zone (optional)').value).toBe('Asia/Tokyo');
  edit('ISO 8601 with time zone', '2024-07-01T00:00:00');
  expect(screen.getByRole('alert').textContent).toContain('Z or a ±HH:MM offset');
  disabledResults();
  expect(result('zone')).toBe('—');
  press('Quick');
  press('Advanced');
  expect(field('ISO 8601 with time zone').value).toBe('2024-07-01T00:00:00');
  disabledResults();
  edit('ISO 8601 with time zone', '2024-07-01T00:00:00Z');
  expect(result()).toBe('2024-07-01T00:00:00.000Z');
});

it('does not surface an old date when a supported timestamp cannot fit the date input', () => {
  setup();
  press('Date to Timestamp');
  press('Timestamp to Date');
  edit('Unix timestamp', '8640000000000');
  expect(result()).toBe('+275760-09-13T00:00:00.000Z');
  press('Date to Timestamp');
  expect(screen.getByRole('alert').textContent).toContain('four-digit year');
  disabledResults();
  press('Load sample');
  expect(result()).toBe(sample);
});

it('blocks both New York DST boundaries and resolves a repeated time with explicit ISO offset', () => {
  vi.stubEnv('TZ', 'America/New_York');
  setup();
  press('Date to Timestamp');
  press('Local');
  edit('Date', '2024-03-10');
  edit('Time (millisecond precision)', '02:30:00.125');
  expect(screen.getByRole('alert').textContent).toContain('does not exist');
  disabledResults();
  edit('Date', '2024-11-03');
  edit('Time (millisecond precision)', '01:30:00.125');
  expect(screen.getByRole('alert').textContent).toContain('occurs twice');
  disabledResults();
  press('Advanced');
  press('ISO 8601');
  edit('ISO 8601 with time zone', '2024-11-03T01:30:00.125-05:00');
  expect(result()).toBe('2024-11-03T06:30:00.125Z');
  press('Date and time');
  expect(field('Time (millisecond precision)').value).toBe('01:30:00.125');
  disabledResults();
});

it('fills a known repeated instant using UTC and communicates the zone choice', () => {
  vi.stubEnv('TZ', 'America/New_York');
  vi.spyOn(Date, 'now').mockReturnValue(1730615400123);
  setup();
  press('Date to Timestamp');
  press('Local');
  press('Now');
  selected('UTC');
  expect(result()).toBe('2024-11-03T06:30:00.123Z');
  expect(screen.getByText('Entered in UTC to preserve the exact instant.')).toBeTruthy();
});

it('copies each complete row value independently and reports clipboard failure', async () => {
  setup();
  press('Advanced');
  edit('Additional IANA time zone (optional)', 'Asia/Shanghai');
  const pairs = [
    ['Copy Unix seconds', '1704067200'],
    ['Copy Unix milliseconds', '1704067200000'],
    ['Copy ISO 8601 (UTC)', sample],
    ['Copy UTC time', '2024-01-01 00:00:00.000 UTC'],
    ['Copy Local time', result('local')],
    ['Copy Additional time zone', result('zone')],
  ];
  for (const [name, value] of pairs) {
    press(name);
    await waitFor(() => expect(clipboard).toHaveBeenLastCalledWith(value));
    await screen.findByText('Copied');
  }
  expect(clipboard).toHaveBeenCalledTimes(6);
  clipboard.mockRejectedValueOnce(new Error('Denied'));
  press('Copy UTC time');
  await screen.findByText('Copy failed. Select the result and copy it manually.');
  edit('Unix timestamp', '');
  disabledResults();
  expect(button('Copy Additional time zone').disabled).toBe(true);
  expect(screen.queryByText('Copied')).toBeNull();
});

it('keeps the same mounted fields and conversion when theme and viewport change', () => {
  const { viewport } = setup();
  const input = field('Unix timestamp');
  edit('Unix timestamp', '1.123');
  try {
    document.documentElement.dataset.appearance = 'dark';
    act(() => viewport(true));
    expect(field('Unix timestamp')).toBe(input);
    expect(result()).toBe('1970-01-01T00:00:01.123Z');
    document.documentElement.dataset.appearance = 'light';
    act(() => viewport(false));
    expect(field('Unix timestamp')).toBe(input);
    expect(input.value).toBe('1.123');
  } finally {
    delete document.documentElement.dataset.appearance;
  }
});
