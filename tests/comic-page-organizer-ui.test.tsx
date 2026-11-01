import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ComicPageOrganizer from '../src/tools/comic-page-organizer/ComicPageOrganizer';
import { acceptImage } from '../src/tools/image/browser-codec';
import { setViewport } from './setup';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
vi.mock('../src/tools/image/ImagePreviewViewport', () => ({ImagePreviewViewport: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt}/>}));
const file = (name: string) => new File(['original'], name, {type: 'image/png'});
beforeEach(() => {
  setViewport();
  vi.mocked(acceptImage).mockImplementation(async f => {
    if (f.name === 'broken.png') throw new Error('decode');
    return {file: f, blob: f, width: 40, height: 60, info: {format: 'png', width: 40, height: 60, orientation: 1}};
  });
  vi.stubGlobal('URL', Object.assign(URL, {createObjectURL: vi.fn(() => `blob:${Math.random()}`), revokeObjectURL: vi.fn()}));
});
async function load(names = ['10.png', '2.png', '1.png']) {
  const rendered = render(<ComicPageOrganizer locale="en" region="global"/>);
  fireEvent.change(screen.getByLabelText('Choose images or drop them here', {selector: 'input'}), {target: {files: names.map(file)}});
  await waitFor(() => expect(screen.getByRole('button', {name: 'Download CBZ'}).hasAttribute('disabled')).toBe(false));
  return rendered;
}
const names = () => [...document.querySelectorAll('[data-page-id] p[title]')].map(node => node.textContent);

it('imports, naturally sorts, chooses a cover and preserves page identity during reordering', async () => {
  await load(); expect(names()).toEqual(['1.png', '2.png', '10.png']);
  fireEvent.click(screen.getByRole('button', {name: 'Use as cover 3'}));
  expect(names()).toEqual(['10.png', '1.png', '2.png']);
  expect(screen.getByText('Cover')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Move earlier 3'}));
  expect(names()).toEqual(['10.png', '2.png', '1.png']);
  fireEvent.click(screen.getByRole('button', {name: 'Remove cover 1'}));
  fireEvent.click(screen.getByRole('button', {name: 'Natural sort'}));
  expect(names()).toEqual(['1.png', '2.png', '10.png']);
});

it('supports drag reordering and multi-selection removal with a mobile-friendly button alternative', async () => {
  await load(); const pages = [...document.querySelectorAll('[data-page-id]')];
  const data = {types: ['application/x-t4f-comic-page'], setData: vi.fn(), effectAllowed: ''};
  fireEvent.dragStart(pages[2], {dataTransfer: data}); fireEvent.dragOver(pages[0], {dataTransfer: data}); fireEvent.drop(pages[0], {dataTransfer: data});
  expect(names()).toEqual(['10.png', '1.png', '2.png']);
  fireEvent.click(screen.getByRole('checkbox', {name: 'Select page 1'}));
  fireEvent.click(screen.getByRole('checkbox', {name: 'Select page 3'}));
  fireEvent.click(screen.getByRole('button', {name: 'Remove selected (2)'}));
  expect(names()).toEqual(['1.png']);
  fireEvent.click(screen.getByRole('button', {name: 'Clear all'}));
  expect(screen.getByRole('button', {name: 'Choose images or drop them here'}).hasAttribute('disabled')).toBe(false);
  expect(document.querySelectorAll('[data-page-id]')).toHaveLength(0);
});

it('reads the clicked page, navigates sequentially and closes safely when its file is removed', async () => {
  await load(); fireEvent.click(screen.getByRole('button', {name: 'Read page 2'}));
  expect(await screen.findByRole('dialog')).not.toBeNull();
  expect(screen.getByRole('heading', {name: '2/3 · 2.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
  expect(screen.getByRole('heading', {name: '3/3 · 10.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Previous page'}));
  expect(screen.getByRole('heading', {name: '2/3 · 2.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Close'}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', {name: 'Remove page 2'}));
  expect(names()).toEqual(['1.png', '10.png']);
});

it('keeps folder import available, rejects bad files and revokes thumbnails on unmount', async () => {
  const {unmount} = await load(['valid.png', 'broken.png']);
  expect(screen.getByText('Could not read this image')).not.toBeNull();
  expect(screen.getByText('1 · Unreadable files are excluded from the archive.')).not.toBeNull();
  const folder = screen.getByLabelText('Add folder'); expect(folder.getAttribute('webkitdirectory')).toBe('');
  fireEvent.change(folder, {target: {files: [file('page20.png'), file('page3.png')]}});
  await waitFor(() => expect(screen.getByRole('button', {name: 'Download ZIP'}).hasAttribute('disabled')).toBe(false));
  expect(names()).toEqual(['broken.png', 'valid.png', 'page3.png', 'page20.png']);
  expect(screen.getByText('Original image bytes are kept, including any source metadata. This tool does not clean private metadata.').closest('details')?.hasAttribute('open')).toBe(false);
  expect(document.querySelectorAll('select')).toHaveLength(0);
  const created = vi.mocked(URL.createObjectURL).mock.calls.length;
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(created);
});
