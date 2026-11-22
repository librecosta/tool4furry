import { Tooltip } from '@base-ui/react/tooltip';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { DatePickerField, type DatePickerFieldProps } from '../src/ui/date-time/DatePickerField';
import { isDay, monthRows } from '../src/ui/date-time/calendar';

afterEach(() => { vi.useRealTimers(); delete document.documentElement.dataset.appearance; });

function setup(value = '2024-01-31', overrides: Partial<DatePickerFieldProps> = {}) {
  const change = vi.fn();
  const draftChange = vi.fn();
  function Field() {
    const [day, setDay] = useState(value);
    return <Tooltip.Provider>
      <DatePickerField label="Date" locale="en" value={day} onChange={next => { change(next); setDay(next); }}
        onDraftChange={draftChange} {...overrides} />
      <button type="button">Outside picker</button>
    </Tooltip.Provider>;
  }
  render(<Field />);
  return { change, draftChange, user: userEvent.setup() };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const date = () => screen.getByRole('textbox', { name: 'Date' }) as HTMLInputElement;
const dialog = () => screen.getByRole('dialog', { name: 'Choose date' });
const day = (name: RegExp) => within(dialog()).getByRole('button', { name }) as HTMLButtonElement;

it('shows the controlled value in a text input and isolates invalid direct-entry drafts', () => {
  const { change, draftChange } = setup();
  expect(date()).toMatchObject({ type: 'text', value: '2024-01-31' });
  expect(screen.queryByRole('grid')).toBeNull();
  fireEvent.change(date(), { target: { value: '2023-02-29' } });
  expect(change).not.toHaveBeenCalled();
  expect(draftChange).toHaveBeenLastCalledWith('2023-02-29');
  expect(date().value).toBe('2023-02-29');
  expect(date().getAttribute('aria-invalid')).toBe('true');
  fireEvent.change(date(), { target: { value: '2024-02-29' } });
  expect(change).toHaveBeenLastCalledWith('2024-02-29');
  expect(draftChange).toHaveBeenLastCalledWith(null);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps both entry and calendar unavailable when the field is disabled', async () => {
  const { change, user } = setup('2024-01-31', { disabled: true });
  expect(date().disabled).toBe(true);
  expect(button('Choose date').disabled).toBe(true);
  await user.click(button('Choose date'));
  expect(change).not.toHaveBeenCalled();
  expect(screen.queryByRole('grid')).toBeNull();
});

it('opens on the selected grid day, commits an adjacent-month date, then restores focus', async () => {
  const { change, user } = setup();
  const trigger = button('Choose date');
  await user.click(trigger);
  const selected = day(/January 31, 2024/);
  expect(selected.parentElement?.getAttribute('aria-selected')).toBe('true');
  await waitFor(() => expect(document.activeElement).toBe(selected));
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  expect(day(/February 1, 2024/).hasAttribute('data-adjacent')).toBe(true);
  await user.click(day(/February 1, 2024/));
  expect(change).toHaveBeenLastCalledWith('2024-02-01');
  expect(date().value).toBe('2024-02-01');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  await user.click(trigger);
  expect(screen.getByRole('grid').getAttribute('aria-labelledby')).toBeTruthy();
  expect(button('February 2024')).toBeTruthy();
});

it('supports arrows, PageUp/Down, shifted year jumps, Escape and Space selection', async () => {
  const { change, user } = setup();
  const trigger = button('Choose date');
  await user.click(trigger);
  await waitFor(() => expect(document.activeElement).toBe(day(/January 31, 2024/)));
  await user.keyboard('{ArrowRight}{ArrowDown}');
  expect(document.activeElement).toBe(day(/February 8, 2024/));
  await user.keyboard('{ArrowLeft}{ArrowUp}');
  expect(document.activeElement).toBe(day(/January 31, 2024/));
  await user.keyboard('{PageDown}');
  expect(document.activeElement).toBe(day(/February 29, 2024/));
  await user.keyboard('{Shift>}{PageUp}{/Shift}');
  expect(document.activeElement).toBe(day(/February 28, 2023/));
  await user.keyboard('{Escape}');
  expect(change).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  await user.click(trigger);
  await waitFor(() => expect(document.activeElement).toBe(day(/January 31, 2024/)));
  await user.keyboard('{PageDown} ');
  expect(change).toHaveBeenLastCalledWith('2024-02-29');
});

it('jumps by month and typed year including years 0001 and 9999', async () => {
  const { change, user } = setup();
  await user.click(button('Choose date'));
  await user.click(button('Previous month'));
  expect(button('December 2023')).toBeTruthy();
  await user.click(button('December 2023'));
  const year = screen.getByRole('textbox', { name: 'Year' });
  fireEvent.change(year, { target: { value: '0001' } });
  await user.click(button('Jan'));
  expect(button('January 1')).toBeTruthy();
  expect(button('Previous month').disabled).toBe(true);
  await user.click(day(/January 1, 1$/));
  expect(change).toHaveBeenLastCalledWith('0001-01-01');
  await user.click(button('Choose date'));
  await user.click(button('January 1'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Year' }), { target: { value: '9999' } });
  await user.click(button('Dec'));
  expect(button('Next month').disabled).toBe(true);
  await user.click(day(/December 31, 9999/));
  expect(change).toHaveBeenLastCalledWith('9999-12-31');
});

it('applies min and max to both direct entry and calendar navigation', async () => {
  const { user, change } = setup('2024-02-15', { min: '2024-02-10', max: '2024-03-01' });
  fireEvent.change(date(), { target: { value: '2024-02-09' } });
  expect(screen.getByRole('alert').textContent).toContain('2024-02-10 to 2024-03-01');
  expect(change).not.toHaveBeenCalled();
  await user.click(button('Choose date'));
  expect(button('Previous month').disabled).toBe(true);
  expect(day(/February 9, 2024/).disabled).toBe(true);
  expect(day(/March 1, 2024/).disabled).toBe(false);
  expect(day(/March 2, 2024/).disabled).toBe(true);
  await user.click(day(/March 1, 2024/));
  expect(date().value).toBe('2024-03-01');
});

it('shows today independently of selection, localizes month and follows appearance without rewriting an empty value', async () => {
  vi.stubEnv('TZ', 'UTC');
  vi.setSystemTime(new Date('2026-11-22T12:00:00Z'));
  document.documentElement.dataset.appearance = 'dark';
  const { change, user } = setup('', { locale: 'zh' });
  await user.click(button('选择日期'));
  expect(button('2026年11月')).toBeTruthy();
  const today = document.querySelector('[aria-current="date"]');
  expect(today?.textContent).toBe('22');
  expect(today?.parentElement?.getAttribute('aria-selected')).toBe('false');
  expect(change).not.toHaveBeenCalled();
  expect(date().value).toBe('');
  document.documentElement.dataset.appearance = 'light';
  await user.click(button('今天'));
  expect(change).toHaveBeenLastCalledWith('2026-11-22');
});

it('generates Monday-first Gregorian cells across leap years, month lengths and global limits', () => {
  expect(monthRows(2024, 2)[0][0]).toBe('2024-01-29');
  expect(monthRows(2024, 2).flat()).toContain('2024-02-29');
  expect(monthRows(2023, 2).flat()).not.toContain('2023-02-29');
  expect(monthRows(2024, 4).flat()).toContain('2024-04-30');
  expect(monthRows(2024, 4).flat()).not.toContain('2024-04-31');
  expect(monthRows(2024, 5).flat()).toContain('2024-05-31');
  expect(monthRows(1, 1)[0][0]).toBe('0001-01-01');
  expect(isDay('0001-01-01')).toBe(true);
  expect(isDay('9999-12-31')).toBe(true);
  expect(isDay('0000-12-31')).toBe(false);
  expect(monthRows(9999, 12).flat().at(-1)).toBeUndefined();
});
