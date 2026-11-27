import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import CreativeAssetPicker from '../src/ui/creative-assets/CreativeAssetPicker';

it('restores the active built-in image and commits only on confirmation', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn(), onOpenChange = vi.fn();
  render(<CreativeAssetPicker open locale="en" target="window" currentId="winter-wolf"
    onSelect={onSelect} onOpenChange={onOpenChange} onImport={vi.fn()} />);
  const gallery = within(screen.getByRole('radiogroup', { name: 'Background assets' }));
  expect(gallery.getAllByRole('radio')[0].textContent).toBe('Crimson Aurora');
  expect(gallery.getByRole('radio', { name: 'Winter Wolf', checked: true })).toBeTruthy();
  await user.click(screen.getByRole('radio', { name: 'Water' }));
  expect(gallery.getAllByRole('radio')).toHaveLength(4);
  await user.click(gallery.getByRole('radio', { name: 'Midnight Surf' }));
  expect(screen.getByText('1920 × 1280 px')).toBeTruthy();
  expect(onSelect).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Use image' }));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'midnight-surf' }));
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
});

it('cancels without selecting and hands local files off to the caller', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn(), onImport = vi.fn(), onOpenChange = vi.fn();
  render(<CreativeAssetPicker open locale="en" target="canvas" onSelect={onSelect}
    onOpenChange={onOpenChange} onImport={onImport} accept="image/png" />);
  await user.click(screen.getByRole('radio', { name: 'Winter Wolf' }));
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  expect(onSelect).not.toHaveBeenCalled();
  const file = new File(['png'], 'test.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('Local image file'), file);
  expect(onImport).toHaveBeenCalledExactlyOnceWith(file);
  expect(onOpenChange).toHaveBeenCalledTimes(2);
});
