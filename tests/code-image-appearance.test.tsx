import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AppearancePanel } from '../src/tools/code-image-generator/AppearancePanel';
import { defaultPhotoPlacement, defaults, defaultWindowLayers, palettes, type Preset } from '../src/tools/code-image-generator/settings';

it('exposes rendered presets and keeps background, syntax theme and window controls independent', async () => {
  const user = userEvent.setup();
  const change = vi.fn(), selectPreset = vi.fn();
  const thumbnails = {
    Midnight: '/midnight.webp', Glacier: '/glacier.webp', Sunset: '/sunset.webp', Forest: '/forest.webp',
    Paper: '/paper.webp', Aurora: '/aurora.webp', Monochrome: '/monochrome.webp', Lavender: '/lavender.webp',
  } satisfies Record<Preset, string>;
  const photo = { choose: vi.fn(), placement: defaultPhotoPlacement, change: vi.fn(), reset: vi.fn(),
    dragging: false, drag: vi.fn(), panX: false, panY: false };
  const changeWindowLayers = vi.fn();
  render(<AppearancePanel t={(_zh, en) => en} settings={defaults} selected="Lavender"
    thumbnails={thumbnails} change={change} selectPreset={selectPreset} canvasPhoto={photo}
    windowPhoto={photo} windowLayers={defaultWindowLayers} changeWindowLayers={changeWindowLayers} />);

  const lavender = screen.getByRole('button', { name: 'Lavender' });
  expect(lavender.getAttribute('aria-pressed')).toBe('true');
  expect(lavender.querySelector('img')?.getAttribute('src')).toBe(thumbnails.Lavender);
  await user.click(screen.getByRole('button', { name: 'Forest' }));
  expect(selectPreset).toHaveBeenCalledExactlyOnceWith('Forest');

  await user.click(screen.getByRole('button', { name: 'Glacier blue' }));
  expect(change).toHaveBeenLastCalledWith({ background: palettes[3].colors });
  const theme = within(screen.getByRole('radiogroup', { name: 'Syntax theme' }));
  expect(theme.getByRole('radio', { name: 'GitHub Dark', checked: true })).toBeTruthy();
  await user.click(theme.getByRole('radio', { name: 'Nord' }));
  expect(change).toHaveBeenLastCalledWith({ theme: 'nord' });
  const windowStyle = within(screen.getByRole('radiogroup', { name: 'Window style' }));
  await user.click(windowStyle.getByRole('radio', { name: 'Windows' }));
  expect(change).toHaveBeenLastCalledWith({ style: 'windows' });
  const baseColor = screen.getByRole('switch', { name: 'Window base color', checked: true });
  await user.click(baseColor);
  expect(changeWindowLayers).toHaveBeenCalledExactlyOnceWith({ baseVisible: false });
  await user.click(screen.getByRole('button', { name: 'Import window image' }));
  expect(photo.choose).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenLastCalledWith({ style: 'windows' });
});
