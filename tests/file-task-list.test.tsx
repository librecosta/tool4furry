import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  FileTaskList,
  type FileTaskItem,
  type FileTaskStatus,
} from '../src/ui/FileTaskList';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';

describe('controlled FileTaskList (presentation fixtures, no media jobs)', () => {
  it('keeps multiple rows, statuses and keyboard actions independent', async () => {
    const user = userEvent.setup();
    const preview = vi.fn(),
      remove = vi.fn(),
      retry = vi.fn();
    const states: FileTaskStatus[] = [
      'validating',
      'queued',
      'processing',
      'ready',
      'stale',
      'error',
    ];
    const items: FileTaskItem[] = states.map((status, index) => ({
      id: String(index),
      name: `a-very-long-filename-${status}.png`,
      metadata: 'PNG · 80×48 · 210 B',
      media:
        status === 'ready' ? (
          <span data-testid="custom-cover">Cover</span>
        ) : undefined,
      status,
      statusLabel: status,
      output: status === 'ready' ? 'WEBP · 124 B' : undefined,
      error:
        status === 'error' ? 'Could not convert. Retry this file.' : undefined,
      actions: [
        {
          kind: 'preview',
          label: `Preview ${index}`,
          disabled: status === 'validating',
          disabledReason:
            status === 'validating' ? 'Waiting for validation' : undefined,
          onClick: () => preview(index),
        },
        {
          kind: 'remove',
          label: `Remove ${index}`,
          onClick: () => remove(index),
        },
        ...(status === 'error'
          ? [
              {
                kind: 'retry' as const,
                label: `Retry ${index}`,
                onClick: () => retry(index),
              },
            ]
          : []),
      ],
    }));
    render(
      <UiProvider labels={messages.global}>
        <FileTaskList label="Files" items={items} />
      </UiProvider>,
    );
    const rows = within(
      screen.getByRole('list', { name: 'Files' }),
    ).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    rows.forEach((row, index) => {
      expect(within(row).getByRole('status').textContent).toBe(states[index]);
      expect(
        within(row).getByText(items[index].name).getAttribute('title'),
      ).toBe(items[index].name);
    });
    const disabled = screen.getByRole('button', { name: 'Preview 0' });
    expect(disabled.getAttribute('aria-description')).toBe(
      'Waiting for validation',
    );
    await user.click(disabled);
    expect(preview).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Preview 3' }));
    expect(preview).toHaveBeenCalledExactlyOnceWith(3);
    await user.click(screen.getByRole('button', { name: 'Remove 1' }));
    expect(remove).toHaveBeenCalledExactlyOnceWith(1);
    screen.getByRole('button', { name: 'Retry 5' }).focus();
    await user.keyboard('{Enter}');
    expect(retry).toHaveBeenCalledExactlyOnceWith(5);
    expect(screen.getByRole('alert').textContent).toBe(items[5].error);
    expect(rows[3].textContent).toContain('WEBP · 124 B');
    expect(within(rows[3]).getByTestId('custom-cover')).toBeTruthy();
  });
  it('leaves status and download eligibility under caller control', async () => {
    const item: FileTaskItem = {
      id: 'one',
      name: 'art.png',
      metadata: 'PNG · 210 B',
      status: 'ready',
      statusLabel: 'Ready',
      actions: [
        {
          kind: 'download',
          label: 'Download art',
          href: 'blob:owned-by-tool',
          download: 'art.webp',
        },
      ],
    };
    const fixture = (value: FileTaskItem) => (
      <UiProvider labels={messages.global}>
        <FileTaskList label="Files" items={[value]} />
      </UiProvider>
    );
    const { rerender } = render(fixture(item));
    const row = screen.getByRole('listitem', { name: item.name });
    expect(
      screen
        .getByRole('link', { name: 'Download art' })
        .getAttribute('download'),
    ).toBe('art.webp');
    rerender(
      fixture({
        ...item,
        status: 'stale',
        statusLabel: 'Regenerate',
        actions: [
          {
            ...item.actions[0],
            disabled: true,
            disabledReason: 'Settings changed',
          },
        ],
      }),
    );
    expect(screen.getByRole('listitem', { name: item.name })).toBe(row);
    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Download art' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(within(row).getByRole('status').textContent).toBe('Regenerate');
  });
});
