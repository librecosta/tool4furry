import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { beforeEach, expect, it, vi } from 'vitest';
import BatchFileRenamer from '../src/tools/batch-file-renamer/BatchFileRenamer';
import { packZip } from '../src/tools/image-converter/zip';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';

vi.mock('../src/tools/image-converter/zip', async original => ({...await original<typeof import('../src/tools/image-converter/zip')>(), packZip:vi.fn()}));
vi.mock('../src/tools/general/ui', async original => ({...await original<typeof import('../src/tools/general/ui')>(), saveBlob:vi.fn()}));
const result = new Blob(['Output bytes are checked in batch-file-renamer-core.test.ts'], {type:'application/zip'});
beforeEach(() => {setViewport(); vi.clearAllMocks(); vi.mocked(packZip).mockResolvedValue(result);});
const actions = () => within(document.querySelector('[data-renamer-actions]') as HTMLElement);
const download = () => actions().getByRole('button', {name:'Download'});
const setup = () => render(<Tooltip.Provider><BatchFileRenamer locale="en" region="cn" /></Tooltip.Provider>);
function add(names: string[]) {
  const files = names.map(name => new File([`Original ${name}`], name));
  fireEvent.change(document.querySelector('input[type=file]')!, {target:{files}});
  return files;
}
function change(label:string, value:string) {fireEvent.change(screen.getByRole('textbox', {name:label}), {target:{value}});}
const previews = () => [...document.querySelectorAll('[data-rename-row]')].map(row => row.querySelectorAll('[title]')[1].getAttribute('title'));
async function generate() {fireEvent.click(actions().getByRole('button', {name:'Create ZIP'})); await waitFor(() => expect(download()).toHaveProperty('disabled', false));}

it('keeps a complete left file workspace and stable right settings while input expands or the viewport changes', () => {
  const resize = setViewport(); setup();
  const left = screen.getByRole('region', {name:'File workspace'});
  const right = screen.getByRole('complementary', {name:'Settings and actions'});
  const title = within(right).getByRole('heading', {name:'Rename settings', level:2});
  const prefix = screen.getByRole('textbox', {name:'Prefix'});
  const intake = document.querySelector('input[type=file]');
  const root = document.querySelector('[data-batch-renamer]')!;
  expect(root.getAttribute('data-form-layout')).toBe('stack');
  expect(screen.queryByRole('list')).toBeNull();
  expect(right.contains(prefix)).toBe(true);
  expect(right.contains(document.querySelector('[data-renamer-actions]'))).toBe(true);
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  change('Prefix', 'art-'); add(['picture.png']);
  expect(root.getAttribute('data-form-layout')).toBe('split');
  expect(left.contains(screen.getByRole('list', {name:'Rename preview'}))).toBe(true);
  expect(previews()).toEqual(['art-picture-001.png']);
  act(() => resize(true)); act(() => resize(false));
  expect(screen.getByRole('textbox', {name:'Prefix'})).toBe(prefix);
  expect(document.querySelector('input[type=file]')).toBe(intake);
  expect(screen.getByRole('region', {name:'File workspace'})).toBe(left);
  expect(screen.getByRole('complementary', {name:'Settings and actions'})).toBe(right);
  expect(within(right).getByRole('heading', {name:'Rename settings'})).toBe(title);
});

it('uses the live rename plan and original Files for ZIP output; repeated timestamped downloads reuse the same Blob', async () => {
  setup(); expect(actions().getAllByRole('button').map(button => button.textContent)).toEqual(['Create ZIP', 'Download', 'Clear']);
  expect(download()).toHaveProperty('disabled', true);
  const files = add(['原图.png', 'notes.v2.txt']);
  change('Prefix', '作品-'); change('Suffix', '-final'); change('Find', 'notes'); change('Replace with', 'readme');
  change('Start number', '7'); change('Number padding', '2');
  const names = ['作品-原图-final-07.png', '作品-readme.v2-final-08.txt'];
  expect(previews()).toEqual(names);
  await generate();
  expect(vi.mocked(packZip).mock.calls[0][0]).toEqual(files.map((blob, i) => ({name:names[i], blob})));
  expect(vi.mocked(packZip).mock.calls[0][0][0].blob).toBe(files[0]);
  fireEvent.click(download()); fireEvent.click(download());
  const calls = vi.mocked(saveBlob).mock.calls;
  expect(calls[0][0]).toBe(result); expect(calls[1][0]).toBe(result);
  expect(calls[0][1]).toMatch(/^renamed-files-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
  expect(calls[1][1]).not.toBe(calls[0][1]); expect(packZip).toHaveBeenCalledOnce();
  change('Prefix', 'new-'); expect(download()).toHaveProperty('disabled', true);
  await generate(); fireEvent.click(screen.getByRole('button', {name:'Remove: 原图.png'}));
  expect(previews()).toEqual(['new-readme.v2-final-07.txt']); expect(download()).toHaveProperty('disabled', true);
  await generate(); add(['extra.txt']); expect(download()).toHaveProperty('disabled', true);
  fireEvent.click(actions().getByRole('button', {name:'Clear'}));
  expect(screen.queryByRole('list')).toBeNull(); expect(download()).toHaveProperty('disabled', true);
  expect(screen.getByRole('textbox', {name:'Prefix'})).toHaveProperty('value', '');
});

it('retains invalid input, rejects duplicate names, and disables numbering fields when sequence is off', async () => {
  setup(); add(['same.txt', 'same.txt']);
  fireEvent.click(screen.getByRole('checkbox', {name:'Add sequence'}));
  expect(screen.getByRole('alert').textContent).toContain('Duplicate output filenames');
  expect(actions().getByRole('button', {name:'Create ZIP'})).toHaveProperty('disabled', true);
  expect(screen.getByRole('textbox', {name:'Start number'})).toHaveProperty('disabled', true);
  expect(screen.getByRole('textbox', {name:'Number padding'})).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByRole('checkbox', {name:'Add sequence'})); await generate();
  change('Prefix', '../');
  expect(screen.getByRole('textbox', {name:'Prefix'})).toHaveProperty('value', '../');
  expect(screen.getByRole('alert').textContent).toContain('invalid characters');
  expect(actions().getByRole('button', {name:'Create ZIP'})).toHaveProperty('disabled', true);
  expect(download()).toHaveProperty('disabled', true);
  change('Prefix', ''); fireEvent.click(screen.getByRole('checkbox', {name:'Keep extensions'}));
  expect(previews()).toEqual(['same.txt-001', 'same.txt-002']);
});

it('prevents reentry, aborts on clear/unmount, and never delivers a late ZIP', async () => {
  const view = setup(); add(['one.bin']);
  let finish!:(blob:Blob) => void;
  vi.mocked(packZip).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  fireEvent.click(actions().getByRole('button', {name:'Create ZIP'}));
  const signal = vi.mocked(packZip).mock.calls[0][1];
  expect(screen.getByRole('textbox', {name:'Prefix'})).toHaveProperty('disabled', true);
  fireEvent.click(actions().getByRole('button', {name:'Create ZIP'})); expect(packZip).toHaveBeenCalledOnce();
  fireEvent.click(actions().getByRole('button', {name:'Clear'})); expect(signal.aborted).toBe(true);
  await act(async () => finish(result)); expect(download()).toHaveProperty('disabled', true);
  add(['two.bin']); fireEvent.click(actions().getByRole('button', {name:'Create ZIP'}));
  const lastSignal = vi.mocked(packZip).mock.calls.at(-1)![1];
  view.unmount(); expect(lastSignal.aborted).toBe(true);
  await act(async () => finish(result)); expect(saveBlob).not.toHaveBeenCalled();
});
