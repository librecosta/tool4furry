import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import WorkbenchShell from '../src/workbench/WorkbenchShell';
import CanvasDemo from '../src/lab/CanvasDemo';
import FormDemo from '../src/lab/FormDemo';
import BatchDemo from '../src/lab/BatchDemo';
import { messages } from '../src/lab/messages';
import { setViewport } from './setup';
const t = messages.zh;

beforeEach(() => {
  setViewport();
});
describe('shell contract', () => {
  it('opens directly on a compact viewport with focus and nested Select intact', async () => {
    setViewport(true);
    const user = userEvent.setup();
    render(<CanvasDemo t={t} header={null} />);
    const trigger = screen.getByRole('button', { name: t.showParameters });
    await user.click(trigger);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: t.close }),
      ),
    );
    const name = screen.getByRole('textbox', { name: t.label });
    const color = screen.getByRole('combobox', { name: t.accent });
    await user.click(color);
    await user.click(await screen.findByRole('option', { name: t.orange }));
    expect(color.textContent).toContain(t.orange);
    await waitFor(() => expect(document.activeElement).toBe(color));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: t.label })).toBe(name);
    expect(
      screen.getByRole('combobox', { name: t.accent }).textContent,
    ).toContain(t.orange);
  });

  it.each(['canvas', 'form', 'batch', 'custom'] as const)(
    '%s works with the main slot alone',
    (mode) => {
      const { container } = render(
        <WorkbenchShell mode={mode} labels={t}>
          <p>Main only</p>
        </WorkbenchShell>,
      );
      expect(screen.getByText('Main only')).toBeTruthy();
      expect(
        container.querySelectorAll('header, aside, footer, button'),
      ).toHaveLength(0);
    },
  );
  it('keeps a single controlled demo across panel toggles and breakpoints', async () => {
    const resize = setViewport();
    const user = userEvent.setup();
    const { container } = render(<CanvasDemo t={t} header={<h1>Demo</h1>} />);
    expect(screen.queryByRole('textbox', { name: t.label })).toBeNull();
    const opener = screen.getByRole('button', { name: t.showParameters });
    expect(opener.getAttribute('aria-expanded')).toBe('false');
    await user.click(opener);
    const name = await screen.findByRole('textbox', { name: t.label });
    expect(opener.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(opener.getAttribute('aria-controls')!)).toBe(
      screen.getByRole('region', { name: t.parameters }),
    );
    await user.clear(name);
    await user.type(name, 'kept');
    const size = screen.getByRole('slider', { name: t.size });
    act(() => size.focus());
    await user.keyboard('{ArrowRight}');
    const keptSize = size.getAttribute('aria-valuenow');
    await user.click(screen.getByRole('button', { name: t.stamp }));
    await user.click(screen.getByRole('button', { name: t.canvasAction }));
    await user.click(screen.getByRole('button', { name: t.hideTools }));
    await user.click(screen.getByRole('button', { name: t.showTools }));
    expect(
      screen
        .getByRole('button', { name: t.stamp })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: t.hideParameters }));
    expect(screen.queryByRole('textbox', { name: t.label })).toBeNull();
    await user.tab();
    expect(document.activeElement).not.toBe(name);
    await user.click(screen.getByRole('button', { name: t.showParameters }));
    expect(
      (screen.getByRole('textbox', { name: t.label }) as HTMLInputElement)
        .value,
    ).toBe('kept');
    act(() => resize(true));
    await user.click(screen.getByRole('button', { name: t.showParameters }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: t.label })).toBe(name);
    // Base UI adds a hidden Select input; still require exactly one parameter textbox DOM node.
    expect(
      container.querySelectorAll(
        'input:not([type="range"]):not([aria-hidden="true"])',
      ),
    ).toHaveLength(1);
    const color = screen.getByRole('combobox', { name: t.accent });
    await user.click(color);
    await user.click(await screen.findByRole('option', { name: t.orange }));
    expect(color.textContent).toContain(t.orange);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(color));
    await user.click(color);
    // Base UI installs focus/dismissal after mounting the portal. Send Escape only once ready.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('option', { name: t.orange }),
      ),
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(color));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        t.showParameters,
      ),
    );
    act(() => resize(false));
    expect(
      (screen.getByRole('textbox', { name: t.label }) as HTMLInputElement)
        .value,
    ).toBe('kept');
    expect(screen.getByRole('status').textContent).toContain('1');
    expect(screen.getByRole('combobox').textContent).toContain(t.orange);
    expect(screen.getByRole('textbox', { name: t.label })).toBe(name);
    expect(
      screen
        .getByRole('slider', { name: t.size })
        .getAttribute('aria-valuenow'),
    ).toBe(keptSize);
    await user.click(screen.getByRole('button', { name: t.reset }));
    expect((name as HTMLInputElement).value).toBe(t.sampleLabel);
    expect(screen.getByRole('status').textContent).toContain('0');
    expect(
      screen
        .getByRole('button', { name: t.select })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: t.canvasAction }));
    expect(screen.getByRole('status').textContent).toContain(t.selected);
    await user.click(screen.getByRole('button', { name: t.canvasAction }));
    expect(screen.getByRole('status').textContent).not.toContain(t.selected);
  });
});
describe('observable demos', () => {
  it('validates and displays a form result', async () => {
    const user = userEvent.setup();
    render(<FormDemo t={t} header={null} />);
    const input = screen.getByRole('textbox', { name: t.input });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: t.run }));
    expect(screen.getByRole('alert').textContent).toBe(t.required);
    await user.type(input, 'furry');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: t.run }));
    expect(screen.getByRole('status').textContent).toBe('✦ FURRY');
  });
  it('adds, advances, removes and clears demo tasks', async () => {
    const user = userEvent.setup();
    render(<BatchDemo t={t} header={null} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'WEBP' }));
    await user.click(screen.getByRole('button', { name: t.add }));
    expect(screen.getByText('Demo 02 · WEBP')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: t.advance }));
    expect(screen.getAllByText(t.running)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: t.advance }));
    expect(screen.getByRole('status').textContent).toContain('2 / 2');
    await user.click(screen.getByRole('button', { name: '移除 Demo 1' }));
    await user.click(screen.getByRole('button', { name: t.clear }));
    expect(screen.getByText(t.queueEmpty)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: t.advance }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
