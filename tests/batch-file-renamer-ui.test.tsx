import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '@base-ui/react/tooltip';
import { beforeEach, expect, it, vi } from 'vitest';
import BatchFileRenamer from '../src/tools/batch-file-renamer/BatchFileRenamer';
import { packZip } from '../src/tools/image-converter/zip';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';

vi.mock('../src/tools/image-converter/zip', async original => ({...await original<typeof import('../src/tools/image-converter/zip')>(), packZip:vi.fn()}));
vi.mock('../src/tools/general/ui', async original => ({...await original<typeof import('../src/tools/general/ui')>(), saveBlob:vi.fn()}));
const result = new Blob(['Actual ZIP bytes are checked in batch-file-renamer-core.test.ts'], {type:'application/zip'});
beforeEach(() => {setViewport(); vi.clearAllMocks(); vi.mocked(packZip).mockResolvedValue(result);});
const actions = () => within(document.querySelector('[data-renamer-actions]') as HTMLElement);
const download = () => actions().getByRole('button', {name:'Download'});
const setup = (locale:'en'|'zh' = 'en') => render(<Tooltip.Provider><BatchFileRenamer locale={locale} region="cn" /></Tooltip.Provider>);
function add(names: string[]) {
  const files = names.map(name => new File([`Original ${name}`], name));
  fireEvent.change(document.querySelector('input[type=file]')!, {target:{files}});
  return files;
}
function change(label:string, value:string) {fireEvent.change(screen.getByRole('textbox', {name:label}), {target:{value}});}
const previews = () => [...document.querySelectorAll('[data-rename-row]')].map(row => row.querySelectorAll('[title]')[1].getAttribute('title'));
const sequence = () => fireEvent.click(screen.getByRole('checkbox', {name:'Add sequence'}));
const mode = (name:'Quick'|'Advanced') => fireEvent.click(within(screen.getByRole('group',{name:'Naming mode'})).getByRole('button',{name}));
async function generate() {fireEvent.click(actions().getByRole('button', {name:'Create ZIP'})); await waitFor(() => expect(download()).toHaveProperty('disabled', false));}

it.each(['en','zh'] as const)('starts in Quick with one optional inline input, no fake files and a real sequence token: %s', locale => {
  setup(locale);
  const template=screen.getByRole('group',{name:locale==='zh'?'文件名模板':'Filename template'});
  const input=within(template).getByRole('textbox',{name:locale==='zh'?'统一名称':'Name'});
  expect(input).toHaveProperty('value','');
  expect(input.getAttribute('placeholder')).toBe(locale==='zh'?'输入名称（可留空）':'Name (optional)');
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  expect(template.querySelector('[data-filename-extension]')?.textContent).toBe('.ext');
  expect(template.querySelector('[data-filename-number]')?.textContent).toBe('001');
  expect(template.querySelector('[data-filename-separator]')).toBeNull();
  expect(screen.queryByRole('list')).toBeNull();
  expect(screen.getByRole('button',{name:locale==='zh'?'快速':'Quick'}).getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[data-renamer-actions] button')).toHaveProperty('disabled',true);
  expect(screen.queryByText(/Prefix|Suffix|Find|Replace with|Keep extensions|保留扩展名/)).toBeNull();
});

it('keeps the inline composer and left/right owners mounted as files expand and viewport changes', () => {
  const resize = setViewport(); setup();
  const left=screen.getByRole('region',{name:'File workspace'}), right=screen.getByRole('complementary',{name:'Settings and actions'});
  const name=screen.getByRole('textbox',{name:'Name'}), intake=document.querySelector('input[type=file]'), root=document.querySelector('[data-batch-renamer]')!;
  expect(root.getAttribute('data-form-layout')).toBe('stack');
  expect(right.contains(name)).toBe(true); expect(right.contains(document.querySelector('[data-renamer-actions]'))).toBe(true);
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  change('Name','art'); add(['picture.png']); expect(root.getAttribute('data-form-layout')).toBe('split');
  expect(left.contains(screen.getByRole('list',{name:'Rename preview'}))).toBe(true); expect(previews()).toEqual(['art-001.png']);
  act(()=>resize(true)); act(()=>resize(false));
  expect(screen.getByRole('textbox',{name:'Name'})).toBe(name); expect(document.querySelector('input[type=file]')).toBe(intake);
  expect(screen.getByRole('region',{name:'File workspace'})).toBe(left); expect(screen.getByRole('complementary',{name:'Settings and actions'})).toBe(right);
});

it('updates all four naming combinations and removes number/separator nodes when disabled', () => {
  setup(); add(['原图.png','notes.v2.txt','README']);
  expect(previews()).toEqual(['001.png','002.txt','003']);
  change('Name','作品'); expect(previews()).toEqual(['作品-001.png','作品-002.txt','作品-003']);
  expect(document.querySelector('[data-filename-separator]')?.textContent).toBe('-');
  sequence(); expect(previews()).toEqual(['作品.png','作品.txt','作品']);
  expect(document.querySelector('[data-filename-number]')).toBeNull(); expect(document.querySelector('[data-filename-separator]')).toBeNull();
  change('Name',''); expect(previews()).toEqual(['原图.png','notes.v2.txt','README']);
  sequence(); expect(previews()).toEqual(['001.png','002.txt','003']);
});

it('shares advanced rules with Quick, preserves disabled values, and does not invalidate a ZIP for display-only mode changes', async () => {
  setup(); const user=userEvent.setup(); add(['a.png','b.jpg']); change('Name','作品');
  const input=screen.getByRole('textbox',{name:'Name'}); mode('Advanced'); change('Start number','7'); change('Number padding','4');
  await user.click(screen.getByRole('combobox',{name:'Separator'})); await user.click(await screen.findByRole('option',{name:'_'}));
  expect(previews()).toEqual(['作品_0007.png','作品_0008.jpg']);
  sequence(); expect(screen.getByRole('textbox',{name:'Start number'})).toHaveProperty('disabled',true);
  expect(screen.getByRole('textbox',{name:'Number padding'})).toHaveProperty('value','4');
  expect(screen.getByRole('combobox',{name:'Separator'})).toHaveProperty('disabled',true);
  sequence(); expect(previews()).toEqual(['作品_0007.png','作品_0008.jpg']);
  mode('Quick'); expect(screen.queryByRole('textbox',{name:'Start number'})).toBeNull();
  expect(screen.getByRole('textbox',{name:'Name'})).toBe(input); expect(previews()).toEqual(['作品_0007.png','作品_0008.jpg']);
  await generate(); mode('Advanced'); mode('Quick'); expect(download()).toHaveProperty('disabled',false); expect(packZip).toHaveBeenCalledOnce();
  mode('Advanced'); await user.click(screen.getByRole('combobox',{name:'Separator'})); await user.click(await screen.findByRole('option',{name:'Space'}));
  expect(download()).toHaveProperty('disabled',true); expect(previews()).toEqual(['作品 0007.png','作品 0008.jpg']);
});

it('keeps composing text intact and rejects conflicts on the affected rows without clearing proposed names', () => {
  setup(); add(['one.PNG','two.png','notes.txt']);
  const input=screen.getByRole('textbox',{name:'Name'});
  fireEvent.compositionStart(input); fireEvent.change(input,{target:{value:'作品'}}); fireEvent.compositionEnd(input,{data:'作品'});
  expect(input).toHaveProperty('value','作品'); sequence();
  expect(previews()).toEqual(['作品.PNG','作品.png','作品.txt']);
  expect([...document.querySelectorAll('[data-rename-row]')].map(row=>row.hasAttribute('data-invalid'))).toEqual([true,true,false]);
  expect(screen.getAllByText('Name conflict')).toHaveLength(2); expect(screen.getByRole('alert').textContent).toContain('Enable numbering');
  expect(actions().getByRole('button',{name:'Create ZIP'})).toHaveProperty('disabled',true);
  change('Name','../'); expect(input).toHaveProperty('value','../'); expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('alert').textContent).toContain('invalid characters');
  change('Name','作品'); sequence(); expect(screen.queryByRole('alert')).toBeNull();
});

it('uses the exact live plan and File references for ZIP output; repeated timestamped downloads reuse the Blob', async () => {
  setup(); expect(actions().getAllByRole('button').map(button=>button.textContent)).toEqual(['Create ZIP','Download','Clear']); expect(download()).toHaveProperty('disabled',true);
  const files=add(['原图.png','notes.v2.txt']); change('Name','作品'); mode('Advanced'); change('Start number','7'); change('Number padding','2');
  const names=['作品-07.png','作品-08.txt']; expect(previews()).toEqual(names); await generate();
  expect(vi.mocked(packZip).mock.calls[0][0]).toEqual(files.map((blob,i)=>({name:names[i],blob})));
  expect(vi.mocked(packZip).mock.calls[0][0][0].blob).toBe(files[0]);
  fireEvent.click(download()); fireEvent.click(download()); const calls=vi.mocked(saveBlob).mock.calls;
  expect(calls[0][0]).toBe(result); expect(calls[1][0]).toBe(result); expect(calls[0][1]).toMatch(/^renamed-files-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
  expect(calls[1][1]).not.toBe(calls[0][1]); expect(packZip).toHaveBeenCalledOnce();
  change('Name','new'); expect(download()).toHaveProperty('disabled',true);
  await generate(); fireEvent.click(screen.getByRole('button',{name:'Remove: 原图.png'})); expect(previews()).toEqual(['new-07.txt']); expect(download()).toHaveProperty('disabled',true);
  await generate(); add(['extra.txt']); expect(previews()).toEqual(['new-07.txt','new-08.txt']); expect(download()).toHaveProperty('disabled',true);
  await generate(); change('Start number','8'); expect(download()).toHaveProperty('disabled',true);
  await generate(); change('Number padding','3'); expect(download()).toHaveProperty('disabled',true);
  await generate(); sequence(); expect(download()).toHaveProperty('disabled',true);
  fireEvent.click(actions().getByRole('button',{name:'Clear'})); expect(screen.queryByRole('list')).toBeNull(); expect(download()).toHaveProperty('disabled',true);
  expect(screen.getByRole('textbox',{name:'Name'})).toHaveProperty('value',''); expect(screen.getByRole('button',{name:'Quick'}).getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[data-filename-number]')?.textContent).toBe('001');
});

it('prevents reentry, aborts on clear/unmount, and never delivers a late ZIP', async () => {
  const view=setup(); add(['one.bin']); let finish!:(blob:Blob)=>void;
  vi.mocked(packZip).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  fireEvent.click(actions().getByRole('button',{name:'Create ZIP'})); const signal=vi.mocked(packZip).mock.calls[0][1];
  expect(screen.getByRole('textbox',{name:'Name'})).toHaveProperty('disabled',true); expect(screen.getByRole('button',{name:'Advanced'})).toHaveProperty('disabled',true);
  fireEvent.click(actions().getByRole('button',{name:'Create ZIP'})); expect(packZip).toHaveBeenCalledOnce();
  fireEvent.click(actions().getByRole('button',{name:'Clear'})); expect(signal.aborted).toBe(true);
  await act(async()=>finish(result)); expect(download()).toHaveProperty('disabled',true);
  add(['two.bin']); fireEvent.click(actions().getByRole('button',{name:'Create ZIP'})); const lastSignal=vi.mocked(packZip).mock.calls.at(-1)![1];
  view.unmount(); expect(lastSignal.aborted).toBe(true); await act(async()=>finish(result)); expect(saveBlob).not.toHaveBeenCalled();
});

it('retains files and composed rules when ZIP creation fails', async () => {
  setup(); add(['one.bin']); change('Name','retry'); vi.mocked(packZip).mockRejectedValue(new Error('failed'));
  fireEvent.click(actions().getByRole('button',{name:'Create ZIP'})); await screen.findByRole('alert');
  expect(previews()).toEqual(['retry-001.bin']); expect(screen.getByRole('textbox',{name:'Name'})).toHaveProperty('value','retry'); expect(download()).toHaveProperty('disabled',true);
});
