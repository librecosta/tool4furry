import { Tooltip } from '@base-ui/react/tooltip';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { TimePickerField } from '../src/ui/date-time/TimePickerField';
import type { Locale } from '../src/i18n/locale';

function setup(initial = '13:09:42.688', locale: Locale = 'en') {
  const change = vi.fn();
  const drafts = vi.fn();
  function Fixture() {
    const [value, setValue] = useState(initial);
    return <Tooltip.Provider>
      <TimePickerField label="Time" value={value} locale={locale} onDraftChange={drafts}
        onChange={next => { change(next); setValue(next); }} />
      <button type="button">Outside picker</button>
    </Tooltip.Provider>;
  }
  render(<Fixture />);
  return { change, drafts, user: userEvent.setup() };
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const time = () => screen.getByRole('textbox', { name: 'Time' }) as HTMLInputElement;
const part = (name: string) => screen.getByRole('spinbutton', { name }) as HTMLInputElement;
const input = (name: string, value: string) => fireEvent.change(part(name), { target: { value } });

it.each(['00:00:00.000', '23:59:59.999'])('shows %s in an ordinary text input without a native picker', value => {
  setup(value);
  expect(time()).toMatchObject({ value, type: 'text' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('input[type=time]')).toBeNull();
});

it('commits complete manual entry and leaves the prior value intact while direct entry is invalid', () => {
  const { change, drafts } = setup();
  fireEvent.change(time(), { target: { value: '23:59:60.999' } });
  expect(time().value).toBe('23:59:60.999');
  expect(change).not.toHaveBeenCalled();
  expect(drafts).toHaveBeenLastCalledWith('23:59:60.999');
  expect(screen.getByRole('alert').textContent).toContain('HH:mm:ss.SSS');
  fireEvent.change(time(), { target: { value: '23:59:59.999' } });
  expect(change).toHaveBeenLastCalledWith('23:59:59.999');
  expect(drafts).toHaveBeenLastCalledWith(null);
});

it('edits all four segments independently and clamps without carry at bounds', async () => {
  const { change, user } = setup();
  await user.click(button('Choose time'));
  for (const [segment, text, expected] of [
    ['Hours', '23', '23:09:42.688'], ['Minutes', '15', '23:15:42.688'],
    ['Seconds', '59', '23:15:59.688'], ['Milliseconds', '999', '23:15:59.999'],
  ]) {
    input(segment, text);
    expect(time().value).toBe(expected);
    expect(change).toHaveBeenLastCalledWith(expected);
  }
  expect(button('Increase hours').disabled).toBe(true);
  await user.click(button('Decrease milliseconds'));
  expect(time().value).toBe('23:15:59.998');
  await user.click(button('Increase milliseconds'));
  expect(time().value).toBe('23:15:59.999');
  await user.click(button('Decrease hours'));
  expect(time().value).toBe('22:15:59.999');
});

it.each([['Hours', '24'], ['Minutes', '60'], ['Seconds', '60'], ['Milliseconds', '1000']])(
  'reports invalid %s and never commits the invalid segment', async (name, invalid) => {
    const { change, user } = setup();
    const trigger = button('Choose time');
    await user.click(trigger);
    input(name, invalid);
    expect(part(name).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain(name);
    expect(change).not.toHaveBeenCalled();
    await user.click(button('Outside picker'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(time().value).toBe('13:09:42.688');
  },
);

it('supports Tab, Shift+Tab, arrows and explicit Enter with zero-padding and returning focus', async () => {
  const { change, user } = setup();
  const trigger = button('Choose time');
  await user.click(trigger);
  await waitFor(() => expect(document.activeElement).toBe(part('Hours')));
  await user.tab();
  expect(document.activeElement).toBe(part('Minutes'));
  input('Minutes', '7');
  expect(change).not.toHaveBeenCalled();
  await user.tab();
  expect(time().value).toBe('13:07:42.688');
  expect(part('Minutes').value).toBe('07');
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(part('Minutes'));
  await user.keyboard('{ArrowUp}');
  expect(time().value).toBe('13:08:42.688');
  await user.tab();
  input('Seconds', '3');
  await user.keyboard('{Enter}');
  expect(time().value).toBe('13:08:03.688');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('focuses the time panel on touch so the user can choose when to edit a segment', async () => {
  const { user } = setup();
  await user.pointer([{ keys: '[TouchA]', target: button('Choose time') }]);
  const popover = screen.getByRole('dialog', { name: 'Choose time' });
  await waitFor(() => expect(document.activeElement).toBe(popover));
});

it('associates each invalid segment with its own error and keeps the committed value', async () => {
  const { change, user } = setup();
  await user.click(button('Choose time'));
  input('Hours', '24');
  input('Milliseconds', '1000');
  for (const segment of ['Hours', 'Milliseconds']) {
    const id = part(segment).getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toContain(segment);
  }
  expect(change).not.toHaveBeenCalled();
  expect(time().value).toBe('13:09:42.688');
});

it('preserves empty input on open and Escape, then commits the editing baseline only when requested', async () => {
  const { change, user } = setup('', 'zh');
  const trigger = button('选择时间');
  await user.click(trigger);
  expect(part('毫秒').value).toBe('000');
  expect(part('小时').getAttribute('aria-valuemax')).toBe('23');
  input('小时', '1');
  await user.keyboard('{Escape}');
  expect(change).not.toHaveBeenCalled();
  expect(time().value).toBe('');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  await user.click(trigger);
  await waitFor(() => expect(document.activeElement).toBe(part('小时')));
  await user.keyboard('{Enter}');
  expect(change).toHaveBeenLastCalledWith('00:00:00.000');
});
