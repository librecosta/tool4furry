import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilePreviewDialog } from '../src/ui/FilePreviewDialog';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';

function Fixture() {
  const [open, setOpen] = useState(false);
  return (
    <UiProvider labels={messages.global}>
      <button id="open-preview" onClick={() => setOpen(true)}>
        Open
      </button>
      <FilePreviewDialog
        open={open}
        onOpenChange={setOpen}
        title="Media preview"
        description="A file name"
        labels={{ close: 'Close', maximize: 'Fullscreen', restore: 'Restore' }}
        finalFocus={() => document.getElementById('open-preview')}
      >
        <button>Media-specific control</button>
      </FilePreviewDialog>
    </UiProvider>
  );
}
describe('reusable preview modal shell', () => {
  it('keeps a usable maximized dialog when the browser rejects fullscreen', async () => {
    const user = userEvent.setup();
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'requestFullscreen',
    );
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error('Fullscreen unavailable');
      }),
    });
    try {
      render(<Fixture />);
      await user.click(screen.getByRole('button', { name: 'Open' }));
      await user.click(screen.getByRole('button', { name: 'Fullscreen' }));
      expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Open' }),
        ),
      );
    } finally {
      if (descriptor)
        Object.defineProperty(
          HTMLElement.prototype,
          'requestFullscreen',
          descriptor,
        );
      else Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
    }
  });
  it('maximizes without Fullscreen API, handles Escape in stages and restores focus', async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Close' }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Fullscreen' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Open' }),
      ),
    );
  });
  it.each([false, true])(
    'exits owned fullscreen when closing, including a pending request (%s)',
    async (pending) => {
      const user = userEvent.setup();
      let active: Element | null = null;
      let finish!: () => void;
      const descriptor = Object.getOwnPropertyDescriptor(
        document,
        'fullscreenElement',
      );
      const requestDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'requestFullscreen',
      );
      const exitDescriptor = Object.getOwnPropertyDescriptor(
        document,
        'exitFullscreen',
      );
      const exit = vi.fn(async () => {
        active = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => active,
      });
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        value: exit,
      });
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        value: function (this: HTMLElement) {
          const element = this;
          return new Promise<void>((resolve) => {
            finish = () => {
              active = element;
              document.dispatchEvent(new Event('fullscreenchange'));
              resolve();
            };
            if (!pending) finish();
          });
        },
      });
      try {
        render(<Fixture />);
        await user.click(screen.getByRole('button', { name: 'Open' }));
        await user.click(screen.getByRole('button', { name: 'Fullscreen' }));
        await user.click(screen.getByRole('button', { name: 'Close' }));
        if (pending) await act(async () => finish());
        await waitFor(() => expect(exit).toHaveBeenCalledTimes(1));
        expect(active).toBeNull();
        expect(screen.queryByRole('dialog')).toBeNull();
        await waitFor(() =>
          expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Open' }),
          ),
        );
      } finally {
        if (descriptor)
          Object.defineProperty(document, 'fullscreenElement', descriptor);
        else Reflect.deleteProperty(document, 'fullscreenElement');
        if (requestDescriptor)
          Object.defineProperty(
            HTMLElement.prototype,
            'requestFullscreen',
            requestDescriptor,
          );
        else
          delete (HTMLElement.prototype as Partial<HTMLElement>)
            .requestFullscreen;
        if (exitDescriptor)
          Object.defineProperty(document, 'exitFullscreen', exitDescriptor);
        else Reflect.deleteProperty(document, 'exitFullscreen');
      }
    },
  );
});
