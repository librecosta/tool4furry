import { useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Button, IconButton } from '../src/ui/Button';
import { TextField, TextAreaField } from '../src/ui/TextField';
import { SelectField } from '../src/ui/SelectField';
import { CheckboxField } from '../src/ui/CheckboxField';
import { SliderField } from '../src/ui/SliderField';
import { Tooltip } from '../src/ui/Tooltip';
import { ConfirmDialog } from '../src/ui/ConfirmDialog';
import { UiProvider } from '../src/ui/UiProvider';
import { useToast } from '../src/ui/Toast';
import { messages } from '../src/i18n/messages';
import UILab from '../src/lab/UILab';
import { messages as labMessages } from '../src/lab/messages';
import { setViewport } from './setup';

beforeEach(() => setViewport());
const labels = messages.en;

describe('UI primitives', () => {
  it('keeps button semantics and prevents disabled/loading activation', async () => {
    const user = userEvent.setup();
    const click = vi.fn();
    render(
      <>
        <Button onClick={click}>Action</Button>
        <Button loading onClick={click}>
          Loading
        </Button>
        <Button disabled onClick={click}>
          Disabled
        </Button>
        <IconButton label="Named icon" onClick={click}>
          <span aria-hidden>+</span>
        </IconButton>
      </>,
    );
    expect(
      screen.getByRole('button', { name: 'Action' }).getAttribute('type'),
    ).toBe('button');
    await user.click(screen.getByRole('button', { name: 'Loading' }));
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(click).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Loading' }).getAttribute('aria-busy'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Action' }));
    await user.click(screen.getByRole('button', { name: 'Named icon' }));
    expect(click).toHaveBeenCalledTimes(2);
  });
  it('associates labels, hints and errors with controlled fields', async () => {
    const user = userEvent.setup();
    function Fields() {
      const [value, setValue] = useState('');
      return (
        <>
          <TextField
            label="Name"
            value={value}
            onChange={setValue}
            hint="Two characters"
            error={value.length < 2 ? 'Too short' : undefined}
            required
          />
          <TextAreaField label="Notes" value={value} onChange={setValue} />
          <TextField
            label="Locked"
            value="fixed"
            onChange={setValue}
            disabled
          />
        </>
      );
    }
    render(<Fields />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    const described = input
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Two characters', 'Too short']);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect((input as HTMLInputElement).required).toBe(true);
    await user.type(input, 'hi');
    expect(
      (screen.getByRole('textbox', { name: 'Notes' }) as HTMLTextAreaElement)
        .value,
    ).toBe('hi');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Locked' }), 'ignored');
    expect(
      (screen.getByRole('textbox', { name: 'Locked' }) as HTMLInputElement)
        .value,
    ).toBe('fixed');
  });
  it('selects with keys, refuses disabled options and returns focus on Escape', async () => {
    const user = userEvent.setup();
    function Example() {
      const [value, setValue] = useState('a');
      return (
        <>
          <SelectField
            label="Palette"
            value={value}
            onValueChange={setValue}
            options={[
              { value: 'a', label: 'Pine' },
              { value: 'b', label: 'Unavailable', disabled: true },
              { value: 'c', label: 'Orange' },
            ]}
          />
          <p>{value}</p>
          <SelectField
            label="Locked select"
            value="a"
            onValueChange={setValue}
            options={[{ value: 'a', label: 'Pine' }]}
            disabled
          />
        </>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('combobox', { name: 'Palette' });
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('listbox')).toBeTruthy();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(trigger.textContent).toContain('Pine');
    expect(screen.getByRole('listbox')).toBeTruthy();
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(trigger.textContent).toContain('Orange'));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await user.click(trigger);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('option', { name: 'Orange' }),
      ),
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.textContent).toContain('Orange');
    expect(
      (
        screen.getByRole('combobox', {
          name: 'Locked select',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it('supports checkbox Space and slider arrows, steps and bounds', async () => {
    const user = userEvent.setup();
    function Example() {
      const [checked, setChecked] = useState(false);
      const [value, setValue] = useState(4);
      return (
        <>
          <CheckboxField
            label="Enabled"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <SliderField
            label="Size"
            accent="lavender"
            min={0}
            max={10}
            step={2}
            value={value}
            onValueChange={setValue}
          />
        </>
      );
    }
    render(<Example />);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe(
      'true',
    );
    await user.tab();
    const slider = screen.getByRole('slider', { name: 'Size' });
    expect(document.activeElement).toBe(slider);
    await user.keyboard('{ArrowRight}');
    expect(slider.getAttribute('aria-valuenow')).toBe('6');
    await user.keyboard('{End}{ArrowRight}');
    expect(slider.getAttribute('aria-valuenow')).toBe('10');
    await user.keyboard('{Home}{ArrowLeft}');
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
  });
  it('opens tooltip from keyboard focus without replacing the button name', async () => {
    const user = userEvent.setup();
    render(
      <UiProvider labels={labels}>
        <Tooltip content="Extra help">
          <IconButton label="Help">
            <span aria-hidden>?</span>
          </IconButton>
        </Tooltip>
      </UiProvider>,
    );
    await user.tab();
    // Base UI 1.8 tooltips are supplementary visual labels, not ARIA tooltips.
    expect(await screen.findByText('Extra help')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Help' })).toBe(
      document.activeElement,
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText('Extra help')).toBeNull());
  });
  it('cancels by button/Escape, traps focus and confirms exactly once', async () => {
    const user = userEvent.setup();
    const confirmed = vi.fn();
    const cancelled = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Clear?"
          description="Demo records only"
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={confirmed}
          onCancel={cancelled}
          danger
          trigger={<Button>Open</Button>}
        />
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const dialog = await screen.findByRole('alertdialog', { name: 'Clear?' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Cancel' }),
      ),
    );
    await user.tab({ shift: true });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(confirmed).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelled).toHaveBeenCalledTimes(2);
    expect(confirmed).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(
      screen.getByRole('button', { name: 'Clear' }),
    );
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(cancelled).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it('exposes observable validation and confirmation in the gallery', async () => {
    const user = userEvent.setup();
    const t = labMessages.zh;
    render(
      <UiProvider labels={messages.zh}>
        <UILab t={t} header={null} />
      </UiProvider>,
    );
    const fields = within(screen.getByRole('region', { name: t.fields }));
    await user.clear(fields.getByRole('textbox', { name: t.demoName }));
    await user.click(fields.getByRole('button', { name: t.validate }));
    expect(screen.getByRole('alert').textContent).toBe(t.nameError);
    await user.click(screen.getByRole('button', { name: t.confirmTrigger }));
    await user.click(screen.getByRole('button', { name: t.cancel }));
    expect(screen.getByText(`${t.confirmed}: 0`)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: t.confirmTrigger }));
    await user.click(
      screen.getByRole('button', { name: t.confirm }),
    );
    expect(screen.getByText(`${t.confirmed}: 1`)).toBeTruthy();
  });
});

describe('island toast queue', () => {
  it('upserts by id, limits to three, labels types and closes manually', async () => {
    const user = userEvent.setup();
    function Example() {
      const toast = useToast();
      return (
        <>
          {(['success', 'info', 'warning', 'error'] as const).map((type) => (
            <Button
              key={type}
              onClick={() =>
                toast.notify({
                  id: type,
                  type,
                  title: `Notice ${type}`,
                  timeout: 0,
                })
              }
            >
              Add {type}
            </Button>
          ))}
        </>
      );
    }
    render(
      <UiProvider labels={labels}>
        <Example />
      </UiProvider>,
    );
    for (const type of ['success', 'info', 'warning', 'error'])
      await user.click(screen.getByRole('button', { name: `Add ${type}` }));
    // Base UI retains limited items for their lifecycle; they must be visually hidden.
    expect(document.querySelectorAll('[data-limited]')).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-toast]:not([hidden])'),
    ).toHaveLength(3);
    await user.tab();
    expect(
      screen.getAllByRole('button', { name: labels.dismissToast }),
    ).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Add error' }));
    expect(
      document.querySelectorAll('[data-toast][data-type="error"]'),
    ).toHaveLength(1);
    expect(screen.getByText(labels.toastError)).toBeTruthy();
    await user.tab();
    const firstToast = document.querySelector('[data-toast]')!;
    await user.click(
      within(firstToast as HTMLElement).getByRole('button', {
        name: labels.dismissToast,
      }),
    );
    await waitFor(() => expect(firstToast.isConnected).toBe(false));
  });
  it('pauses automatic dismissal on focus/hover and resumes on leaving', async () => {
    const user = userEvent.setup();
    function Example() {
      const toast = useToast();
      return (
        <Button
          onClick={() =>
            toast.notify({ title: 'Temporary notice', timeout: 300 })
          }
        >
          Notify
        </Button>
      );
    }
    render(
      <UiProvider labels={labels}>
        <Example />
      </UiProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    await user.tab();
    expect(
      document.querySelector('[data-toast]')?.contains(document.activeElement),
    ).toBe(true);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(screen.getByText('Temporary notice')).toBeTruthy();
    act(() => screen.getByRole('button', { name: 'Notify' }).focus());
    await waitFor(() =>
      expect(screen.queryByText('Temporary notice')).toBeNull(),
    );
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    const notification = screen.getByRole('dialog', {
      name: 'Temporary notice',
    });
    await user.hover(notification);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(screen.getByText('Temporary notice')).toBeTruthy();
    await user.unhover(notification);
    await waitFor(() =>
      expect(screen.queryByText('Temporary notice')).toBeNull(),
    );
  });
});
