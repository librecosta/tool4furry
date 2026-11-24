import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Locale } from '../src/i18n/locale';
import { messages } from '../src/i18n/messages';
import ColorContrast from '../src/tools/color-contrast/ColorContrast';
import { contrast, parseColor } from '../src/tools/color-contrast/core';
import { UiProvider } from '../src/ui/UiProvider';
import { setViewport } from './setup';

function mount(locale: Locale = 'en') {
  return render(<UiProvider labels={messages[locale]}>
    <ColorContrast locale={locale} region={locale === 'zh' ? 'cn' : 'global'} />
  </UiProvider>);
}
const foreground = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Foreground' });
const background = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Background' });
const result = () => screen.getByRole('status', { name: 'Contrast ratio result' });
const edit = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => { setViewport(false); });

it('updates the preview and results, swaps colors, copies individual formats and resets', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('EyeDropper', undefined);
  mount();
  expect(foreground().value).toBe('#F7CDAD');
  expect(background().value).toBe('#383131');
  expect(result().textContent).toContain('8.65');
  expect(screen.queryByRole('button', { name: /pick .* from screen/i })).toBeNull();
  const sample = screen.getByText('Good design starts here.').closest<HTMLElement>('[lang="en"]')!;
  expect(sample.style.color).toBe('rgb(247, 205, 173)');
  expect(sample.style.backgroundColor).toBe('rgb(56, 49, 49)');
  expect(screen.getByText('Button preview').style.color).toBe('rgb(56, 49, 49)');
  const copy = vi.spyOn(navigator.clipboard, 'writeText');
  for (const [format, text] of [
    ['HEX', '#F7CDAD'],
    ['RGB', 'rgb(247, 205, 173)'],
    ['HSL', 'hsl(25.9, 82.2%, 82.4%)'],
  ]) {
    await user.click(screen.getByRole('button', { name: 'Copy foreground ' + format }));
    expect(copy).toHaveBeenLastCalledWith(text);
  }
  click('Swap colors');
  expect(foreground().value).toBe('#383131');
  expect(background().value).toBe('#F7CDAD');
  expect(result().textContent).toContain('8.65');
  edit(foreground(), 'rgb(20% 40% 60%)');
  expect(sample.style.color).toBe('rgb(51, 102, 153)');
  click('Reset');
  expect(foreground().value).toBe('#F7CDAD');
  expect(background().value).toBe('#383131');
});

it('keeps the other conversion valid and clears stale results after invalid input', () => {
  mount();
  edit(foreground(), 'rgb(100 22');
  expect(foreground().getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText(/enter an opaque hex/i)).toBeTruthy();
  expect(result().textContent).toBe('—');
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.queryByRole('button', { name: /apply .* suggestion/i })).toBeNull();
  expect((screen.getByRole('button', { name: 'Copy foreground HSL' }) as HTMLButtonElement).disabled).toBe(true);
  const other = within(screen.getByRole('group', { name: 'Background' }));
  expect(other.getByText('rgb(56, 49, 49)')).toBeTruthy();
  expect((other.getByRole('button', { name: 'Copy background RGB' }) as HTMLButtonElement).disabled).toBe(false);
  edit(foreground(), '#fff');
  expect(result().textContent).toContain('12.71');
});

it('applies suggestions on demand and checks the custom target selector', async () => {
  const user = userEvent.setup();
  mount();
  edit(foreground(), '#3583D2');
  expect(foreground().value).toBe('#3583D2');
  click('Apply foreground suggestion');
  expect(background().value).toBe('#383131');
  expect(contrast(parseColor(foreground().value), parseColor(background().value))).toBeGreaterThanOrEqual(4.5);
  expect(screen.getByText('These colors meet the target.')).toBeTruthy();
  click('Reset');
  edit(foreground(), '#3583D2');
  click('Apply background suggestion');
  expect(foreground().value).toBe('#3583D2');
  expect(contrast(parseColor(foreground().value), parseColor(background().value))).toBeGreaterThanOrEqual(4.5);
  edit(foreground(), '#777');
  edit(background(), '#888');
  const target = screen.getByRole('combobox', { name: 'Target' });
  expect(target.tagName).toBe('BUTTON');
  await user.click(target);
  await user.click(await screen.findByRole('option', { name: '7:1' }));
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  expect(screen.getAllByText(/target is out of reach/i)).toHaveLength(2);
  click('Reset');
  expect(target.textContent).toContain('4.5:1');
});

it.each([
  ['rgb(35 92 143)', '3.00', 'Large text', 'Fail · 3.0:1'],
  ['rgb(35 112 227)', '4.50', 'Normal text', 'Fail · 4.5:1'],
  ['rgb(35 166 155)', '7.00', 'Normal text', 'Fail · 7.0:1'],
])('marks %s as below the %s threshold before rounding', (color, display, row, status) => {
  mount();
  edit(background(), '#000');
  edit(foreground(), color);
  expect(result().textContent).toContain('< ' + display);
  expect(within(screen.getByRole('row', { name: new RegExp(row) })).getByRole('cell', { name: status })).toBeTruthy();
});

it('localizes the workspace and keeps the English preview in Chinese', () => {
  mount('zh');
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: '前景色' }).value).toBe('#F7CDAD');
  expect(screen.getByRole('button', { name: '交换颜色' })).toBeTruthy();
  expect(screen.getByRole('cell', { name: '不适用' }).textContent).toBe('—');
  expect(screen.getByText('Good design starts here.').closest('[lang="en"]')).toBeTruthy();
});

it('handles screen-picking cancellation, success and invalidation after an edit, swap, reset or unmount', async () => {
  const requests: { signal: AbortSignal; resolve: (value: { sRGBHex: string }) => void; reject: (error: DOMException) => void }[] = [];
  vi.stubGlobal('EyeDropper', class {
    open({ signal }: { signal: AbortSignal }) {
      return new Promise((resolve, reject) => requests.push({ signal, resolve, reject }));
    }
  });
  const workspace = mount();
  const start = () => {
    click('Pick foreground from screen');
    return requests.at(-1)!;
  };
  await act(async () => start().reject(new DOMException('Canceled', 'AbortError')));
  expect(foreground().value).toBe('#F7CDAD');
  const success = start();
  await act(async () => success.resolve({ sRGBHex: '#ad42c8' }));
  expect(foreground().value).toBe('#AD42C8');
  for (const invalidate of [() => edit(foreground(), '#246'), () => click('Swap colors'), () => click('Reset')]) {
    const request = start();
    invalidate();
    const current = foreground().value;
    expect(request.signal.aborted).toBe(true);
    await act(async () => request.resolve({ sRGBHex: '#765432' }));
    expect(foreground().value).toBe(current);
  }
  const pending = start();
  workspace.unmount();
  expect(pending.signal.aborted).toBe(true);
  await act(async () => pending.resolve({ sRGBHex: '#765432' }));
});
