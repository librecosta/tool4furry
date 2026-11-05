import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Tooltip } from '@base-ui/react/tooltip';
import ZipManager from '../src/tools/zip-manager/ZipManager';
import { createZip, inspectZip, extractZip, type ZipItem } from '../src/tools/zip-manager/core';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';
vi.mock('../src/tools/zip-manager/core', async original => ({...await original<typeof import('../src/tools/zip-manager/core')>(), createZip:vi.fn(), inspectZip:vi.fn(), extractZip:vi.fn()}));
vi.mock('../src/tools/general/ui', async original => ({...await original<typeof import('../src/tools/general/ui')>(), saveBlob:vi.fn()}));
const items = ['project/images/a.txt','project/images/b.txt','project/README.md'].map((name, i) => ({name,size:i+1,compressed:i+1,crc:0,offset:0,method:0})) satisfies ZipItem[];
const createBlob = new Blob(['creation verified in core tests'], {type:'application/zip'}), selectedBlob = new Blob(['different selection output'], {type:'application/zip'});
beforeEach(() => {
  setViewport(); vi.clearAllMocks();
  vi.mocked(inspectZip).mockResolvedValue(items);
  vi.mocked(createZip).mockResolvedValue(createBlob);
  vi.mocked(extractZip).mockImplementation(async (_file, _items, selected) => selected.map(name => ({name,blob:new Blob([name])})));
});
const button = (name:string) => screen.getByRole('button',{name});
const mode = (name:string) => within(screen.getByRole('group',{name:'ZIP mode'})).getByRole('button',{name});
const action = () => within(document.querySelector('[data-zip-actions]') as HTMLElement);
const download = () => action().getByRole('button',{name:'Download'});
function setup(locale: 'zh' | 'en' = 'en') {return render(<Tooltip.Provider><ZipManager locale={locale} region="cn" /></Tooltip.Provider>);}
function add(paths:string[]) {
  const files=paths.map(path=>Object.defineProperty(new File([path],path.split('/').at(-1)!), 'webkitRelativePath', {value:path.includes('/')?path:''}));
  fireEvent.change(document.querySelector('input[type=file]')!,{target:{files}});
}
async function generate() {fireEvent.click(action().getAllByRole('button')[0]); await waitFor(()=>expect(download()).toHaveProperty('disabled',false));}
async function open(name='project.zip') {
  fireEvent.click(mode('Open ZIP'));
  fireEvent.change(document.querySelector('input[type=file]')!,{target:{files:[new File(['archive'],name)]}});
  await screen.findByText(name); await waitFor(()=>expect(mode('Open ZIP')).toHaveProperty('disabled',false));
}

it('keeps independent files, selections and outputs and names downloads automatically without regenerating ZIPs', async()=>{
  setup(); expect(mode('Create ZIP').getAttribute('aria-pressed')).toBe('true'); expect(download()).toHaveProperty('disabled',true);
  expect(action().getAllByRole('button').map(e=>e.textContent)).toEqual(['Create ZIP','Download','Clear']);
  add(['素材/a.txt','素材/sub/b.txt']); expect(screen.queryByRole('textbox')).toBeNull(); await generate();
  fireEvent.click(download()); fireEvent.click(download());
  const first=vi.mocked(saveBlob).mock.calls[0]; expect(first[0]).toBe(createBlob); expect(first[1]).toMatch(/^素材-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
  expect(vi.mocked(saveBlob).mock.calls[1][0]).toBe(createBlob); expect(vi.mocked(saveBlob).mock.calls[1][1]).not.toBe(first[1]); expect(createZip).toHaveBeenCalledOnce();
  await open(); expect(download()).toHaveProperty('disabled',true); expect(document.querySelector('[data-zip-path="素材/a.txt"]')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  vi.mocked(createZip).mockResolvedValueOnce(selectedBlob); await generate(); fireEvent.click(download()); fireEvent.click(download());
  expect(vi.mocked(saveBlob).mock.calls.at(-1)![0]).toBe(selectedBlob); expect(vi.mocked(saveBlob).mock.calls.at(-1)![1]).toMatch(/^project-selected-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
  expect(vi.mocked(saveBlob).mock.calls.at(-1)![1]).not.toBe(vi.mocked(saveBlob).mock.calls.at(-2)![1]); expect(createZip).toHaveBeenCalledTimes(2);
  fireEvent.click(mode('Create ZIP')); expect(download()).toHaveProperty('disabled',false); expect(screen.getByText('b.txt')).toBeTruthy();
  fireEvent.click(download()); expect(vi.mocked(saveBlob).mock.calls.at(-1)![0]).toBe(createBlob);
  fireEvent.click(button('Remove：素材/a.txt')); expect(download()).toHaveProperty('disabled',true); expect(screen.queryByText('a.txt')).toBeNull();
  fireEvent.click(mode('Open ZIP')); expect(download()).toHaveProperty('disabled',false);
  fireEvent.click(button('Clear')); expect(download()).toHaveProperty('disabled',true); expect(screen.queryByText('project.zip')).toBeNull();
  fireEvent.click(mode('Create ZIP')); expect(screen.getByText('b.txt')).toBeTruthy();
});

it.each(['zh', 'en'] as const)('omits naming fields, empty statistics and repeated technical guidance in the %s workspace', async locale => {
  const {container} = setup(locale);
  const workspace = () => container.querySelector('[data-zip-manager]')!;
  const checkQuietWorkspace = () => {
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(workspace().textContent).not.toMatch(/下载时自动添加|最多 500 项|所选文件会保留目录路径|读取 ZIP 最大|timestamp and \.zip|Up to 500 files|Selected files keep their folder paths|ZIP input:/);
  };
  checkQuietWorkspace(); expect(workspace().textContent).not.toMatch(/0 (?:个文件|files)|0 B/);
  const modes = within(screen.getByRole('group',{name:locale === 'zh' ? 'ZIP 模式' : 'ZIP mode'}));
  fireEvent.click(modes.getByRole('button',{name:locale === 'zh' ? '打开 ZIP' : 'Open ZIP'}));
  checkQuietWorkspace(); expect(workspace().textContent).not.toMatch(/0 (?:个文件|files)|0 B|已选|Selected/);
  fireEvent.change(document.querySelector('input[type=file]')!, {target:{files:[new File(['archive'],'source.ZIP')]}});
  const source = await screen.findByText('source.ZIP');
  expect(source.closest('p')!.textContent).toBe(`source.ZIP · 3 ${locale === 'zh' ? '个文件' : 'files'} · 7 B`);
  const selected = screen.getByRole('status');
  expect(selected.textContent).toBe(locale === 'zh' ? '已选 3 / 3' : 'Selected 3 / 3');
  expect(selected.closest('aside')).toBe(screen.getByRole('complementary',{name:locale === 'zh' ? '设置与操作' : 'Settings and actions'}));
  checkQuietWorkspace();
});

it('keeps file content before the settings DOM, expands only with input, and preserves both slots across responsive updates', async () => {
  const resize = setViewport();
  setup();
  const root = document.querySelector('[data-zip-manager]')!;
  const left = screen.getByRole('region', {name:'File workspace'});
  const right = screen.getByRole('complementary', {name:'Settings and actions'});
  expect(root.getAttribute('data-form-layout')).toBe('stack');
  expect(screen.queryByRole('region', {name:'File list'})).toBeNull();
  expect(right.contains(screen.getByRole('group', {name:'ZIP mode'}))).toBe(true);
  expect(right.contains(document.querySelector('[data-zip-actions]'))).toBe(true);
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  add(['folder/a.txt']); await generate();
  expect(root.getAttribute('data-form-layout')).toBe('split');
  expect(left.contains(screen.getByRole('region', {name:'File list'}))).toBe(true);
  act(() => resize(true)); act(() => resize(false));
  expect(screen.getByRole('region', {name:'File workspace'})).toBe(left);
  expect(screen.getByRole('complementary', {name:'Settings and actions'})).toBe(right);
  expect(download()).toHaveProperty('disabled', false);
  await open();
  expect(left.contains(screen.getByRole('checkbox', {name:'Select project/'}))).toBe(true);
  expect(right.contains(button('Select all'))).toBe(true);
  fireEvent.click(mode('Create ZIP')); expect(download()).toHaveProperty('disabled', false);
});

it('uses archive for mixed/loose inputs and the source ZIP stem for selected downloads', async()=>{
  setup(); add(['first.txt','目录/second.txt']); await generate(); fireEvent.click(download());
  expect(vi.mocked(saveBlob).mock.calls.at(-1)![1]).toMatch(/^archive-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
  expect(vi.mocked(createZip).mock.calls[0][0].map(entry=>entry.name)).toEqual(['first.txt','目录/second.txt']);
  await open('角色素材.v2.ZIP'); await generate(); fireEvent.click(download());
  expect(vi.mocked(saveBlob).mock.calls.at(-1)![1]).toMatch(/^角色素材\.v2-selected-\d{8}-\d{6}-\d{3}(?:-\d+)?\.zip$/);
});

it('folds folders, selects descendants with a mixed state, and downloads a single checked-CRC extraction without destroying the batch result',async()=>{
  setup(); await open(); await generate();
  const folder=screen.getByRole('checkbox',{name:'Select project/images/'});
  expect(folder.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('checkbox',{name:'Select project/images/a.txt'})); expect(folder.getAttribute('aria-checked')).toBe('mixed'); expect(download()).toHaveProperty('disabled',true);
  fireEvent.click(folder); expect(folder.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(button('Collapse project/images/')); expect(screen.queryByRole('checkbox',{name:'Select project/images/a.txt'})).toBeNull();
  fireEvent.click(button('Expand project/images/')); expect(screen.getByRole('checkbox',{name:'Select project/images/a.txt'})).toBeTruthy();
  fireEvent.click(button('Deselect all')); expect(action().getByRole('button',{name:'Export selected'})).toHaveProperty('disabled',true);
  fireEvent.click(folder); await generate();
  expect(vi.mocked(extractZip).mock.calls.at(-1)![2]).toEqual(['project/images/a.txt','project/images/b.txt']);
  fireEvent.click(button('Download file：project/images/a.txt'));
  await waitFor(()=>expect(saveBlob).toHaveBeenCalledOnce()); expect(vi.mocked(saveBlob).mock.calls[0][1]).toBe('a.txt');
  expect(vi.mocked(extractZip).mock.calls.at(-1)![2]).toEqual(['project/images/a.txt']);
  await waitFor(()=>expect(download()).toHaveProperty('disabled',false));
  fireEvent.click(mode('Create ZIP')); fireEvent.click(mode('Open ZIP')); expect(folder.isConnected).toBe(false);
  expect(screen.getByRole('checkbox',{name:'Select project/images/'}).getAttribute('aria-checked')).toBe('true');
});

it('rejects unsafe/duplicate intake atomically, preserves directory identity and invalidates only changed input',async()=>{
  setup(); add(['p/a.txt','q/a.txt']); expect(screen.getAllByText('a.txt')).toHaveLength(2); await generate();
  add(['p/A.txt']); expect(await screen.findByRole('alert')).toHaveProperty('textContent','Duplicate archive paths.');
  expect(screen.getAllByText('a.txt')).toHaveLength(2); expect(download()).toHaveProperty('disabled',false);
  add(['../bad.txt']); expect(screen.getByRole('alert').textContent).toBe('Unsafe archive path.');
  add(['new.txt']); expect(screen.getByText('new.txt')).toBeTruthy(); expect(download()).toHaveProperty('disabled',true);
});

it('mounts only expanded directory branches and remembers their state across mode switches', async()=>{
  setup(); vi.mocked(inspectZip).mockResolvedValueOnce([{...items[0],name:'a/b/c/file.txt'}]); await open();
  expect(document.querySelector('[data-zip-path="a/b/c/file.txt"]')).toBeNull();
  fireEvent.click(button('Expand a/b/c/')); expect(screen.getByText('file.txt')).toBeTruthy();
  fireEvent.click(mode('Create ZIP')); fireEvent.click(mode('Open ZIP'));
  expect(screen.getByText('file.txt')).toBeTruthy();
  fireEvent.click(button('Collapse a/b/c/')); expect(document.querySelector('[data-zip-path="a/b/c/file.txt"]')).toBeNull();
});

it('replaces archives and invalidates prior selection and export, including failed replacements',async()=>{
  setup(); await open(); await generate();
  vi.mocked(inspectZip).mockResolvedValueOnce([{...items[0],name:'new.txt'}]);
  await open('new.zip'); expect(screen.queryByText('project.zip')).toBeNull(); expect(screen.queryByText('a.txt')).toBeNull();
  expect(screen.getByRole('checkbox',{name:'Select new.txt'}).getAttribute('aria-checked')).toBe('true'); expect(download()).toHaveProperty('disabled',true);
  vi.mocked(inspectZip).mockRejectedValueOnce(new Error('corrupt')); await openFailed();
  async function openFailed(){fireEvent.change(document.querySelector('input[type=file]')!,{target:{files:[new File(['bad'],'bad.zip')]}}); await screen.findByRole('alert');}
  expect(screen.queryByText('new.txt')).toBeNull(); expect(download()).toHaveProperty('disabled',true);
});

it('blocks reentry and mode changes until cancelled native work settles, and rejects late results after clear/unmount',async()=>{
  const view=setup(); add(['a.txt']);
  let finish!:(blob:Blob)=>void;
  vi.mocked(createZip).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  fireEvent.click(action().getAllByRole('button')[0]); expect(mode('Open ZIP')).toHaveProperty('disabled',true);
  fireEvent.click(action().getAllByRole('button')[0]); expect(createZip).toHaveBeenCalledOnce();
  fireEvent.click(button('Cancel')); expect(mode('Open ZIP')).toHaveProperty('disabled',true); expect(screen.getByText('a.txt')).toBeTruthy();
  await act(async()=>finish(createBlob)); expect(download()).toHaveProperty('disabled',true); expect(mode('Open ZIP')).toHaveProperty('disabled',false);
  vi.mocked(createZip).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  fireEvent.click(action().getAllByRole('button')[0]); fireEvent.click(button('Clear'));
  await act(async()=>finish(createBlob)); expect(download()).toHaveProperty('disabled',true); expect(screen.queryByText('a.txt')).toBeNull();
  await open(); let singleFinish!:(entries:{name:string;blob:Blob}[])=>void;
  vi.mocked(extractZip).mockImplementationOnce(()=>new Promise(resolve=>{singleFinish=resolve;}));
  fireEvent.click(button('Download file：project/images/a.txt')); const signal=vi.mocked(extractZip).mock.calls.at(-1)![3]!;
  view.unmount(); expect(signal.aborted).toBe(true);
  await act(async()=>singleFinish([{name:'project/images/a.txt',blob:new Blob(['late'])}])); expect(saveBlob).not.toHaveBeenCalled();
});

it('clears only the current mode and rejects late archive reads and selected exports', async()=>{
  setup(); add(['keep.txt']); await generate();
  await open(); await generate();
  fireEvent.click(mode('Create ZIP')); fireEvent.click(button('Clear')); fireEvent.click(mode('Open ZIP'));
  expect(download()).toHaveProperty('disabled',false); expect(screen.getByText('project.zip')).toBeTruthy();
  let finishRead!:(items:ZipItem[])=>void;
  vi.mocked(inspectZip).mockImplementationOnce(()=>new Promise(resolve=>{finishRead=resolve;}));
  fireEvent.change(document.querySelector('input[type=file]')!,{target:{files:[new File(['new'],'late.zip')]}});
  expect(screen.queryByText('project.zip')).toBeNull(); fireEvent.click(button('Clear'));
  await act(async()=>finishRead(items)); expect(document.querySelectorAll('[data-zip-path]')).toHaveLength(0); expect(download()).toHaveProperty('disabled',true);
  await open(); let finishExport!:(blob:Blob)=>void;
  vi.mocked(createZip).mockImplementationOnce(()=>new Promise(resolve=>{finishExport=resolve;}));
  fireEvent.click(action().getByRole('button',{name:'Export selected'}));
  await waitFor(()=>expect(finishExport).toBeTypeOf('function')); fireEvent.click(button('Cancel'));
  await act(async()=>finishExport(selectedBlob)); expect(download()).toHaveProperty('disabled',true);
  expect(screen.getByRole('checkbox',{name:'Select project/'}).getAttribute('aria-checked')).toBe('true');
});
