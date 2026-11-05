import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '@base-ui/react/tooltip';
import { beforeEach, expect, it, vi } from 'vitest';
import FileHash from '../src/tools/file-hash/FileHash';
import { algorithms } from '../src/tools/file-hash/core';
import type { HashWorker } from '../src/tools/file-hash/queue';
import type { HashRequest, HashResponse } from '../src/tools/file-hash/protocol';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';
vi.mock('../src/tools/general/ui', async original=>({...await original<typeof import('../src/tools/general/ui')>(),saveBlob:vi.fn()}));
class FakeWorker implements HashWorker {
  static instances:FakeWorker[]=[];onmessage:HashWorker['onmessage']=null;onerror:HashWorker['onerror']=null;onmessageerror:HashWorker['onmessageerror']=null;
  requests:HashRequest[]=[];terminated=false;
  constructor(){FakeWorker.instances.push(this);}
  postMessage(request:HashRequest){this.requests.push(request);}terminate(){this.terminated=true;}
  finish(character='a'){const task=this.requests.at(-1)!;this.onmessage?.({data:{id:task.id,algorithm:task.algorithm,type:'result',digest:character.repeat(algorithms[task.algorithm].length)}} as MessageEvent<HashResponse>);}
}
const clipboard=vi.fn().mockResolvedValue(undefined);
beforeEach(()=>{setViewport();vi.clearAllMocks();FakeWorker.instances=[];vi.stubGlobal('Worker',FakeWorker);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:clipboard}});});
const setup=(locale:'en'|'zh'='en')=>render(<Tooltip.Provider><FileHash locale={locale} region="cn"/></Tooltip.Provider>);
const actions=()=>within(document.querySelector('[data-hash-actions]') as HTMLElement);
const rows=()=>[...document.querySelectorAll('[data-task-id]')];
const add=(names=['中文.txt','photo.part.bin','same.txt'])=>fireEvent.change(document.querySelector('input[type=file]')!,{target:{files:names.map((name,i)=>new File([String(i)],name))}});
it.each(['en','zh'] as const)('has a compact empty MD5 workspace without a manual calculation button: %s',locale=>{
  setup(locale);
  const group=screen.getByRole('group',{name:locale==='en'?'Algorithm':'算法'}), radios=within(group).getAllByRole('radio') as HTMLInputElement[];
  expect(radios.map(r=>r.type)).toEqual(Array(5).fill('radio'));
  expect(radios.map(r=>r.value)).toEqual(Object.keys(algorithms));expect(new Set(radios.map(r=>r.name)).size).toBe(1);
  expect(screen.getByRole('radio',{name:'MD5'})).toHaveProperty('checked',true);
  expect(screen.queryByRole('combobox')).toBeNull();expect(screen.queryByRole('listbox')).toBeNull();
  expect(rows()).toHaveLength(0);expect(FakeWorker.instances).toHaveLength(0);expect(document.querySelector('[data-file-hash]')?.getAttribute('data-form-layout')).toBe('stack');
  expect(actions().getAllByRole('button').every(b=>(b as HTMLButtonElement).disabled)).toBe(true);
  expect(screen.queryByText(/Calculate|计算 SHA|32 MiB|0 files|0 个文件/)).toBeNull();
  expect(screen.queryByText(/安全性要求|security-sensitive|仅导出已完成|Exports include/)).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});
it('supports native radio keyboard navigation without starting work in an empty workspace',async()=>{
  setup();const user=userEvent.setup();screen.getByRole('radio',{name:'MD5'}).focus();
  await user.keyboard('{ArrowRight}');expect(screen.getByRole('radio',{name:'SHA-1'})).toHaveProperty('checked',true);
  expect(FakeWorker.instances).toHaveLength(0);
});
it('automatically queues three files, appends a fourth, selects with a button and preserves all file owners on resize',()=>{
  setup();add();const worker=FakeWorker.instances[0];expect(rows()).toHaveLength(3);expect(worker.requests).toHaveLength(1);
  act(()=>{worker.finish('a');worker.finish('b');worker.finish('c');});expect(rows().every(r=>r.getAttribute('data-task-status')==='ready')).toBe(true);
  add(['fourth.txt']);expect(worker.requests).toHaveLength(4);expect(FakeWorker.instances).toHaveLength(1);
  fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:'photo.part.bin'}));expect(screen.getByRole('region',{name:'Verification details'}).textContent).toContain('b'.repeat(32));
  const elements=[document.querySelector('[data-file-workspace]'),document.querySelector('[data-form-settings]')];setViewport(true);expect(elements.every(e=>e?.isConnected)).toBe(true);
  expect(document.querySelector('[data-file-hash]')?.getAttribute('data-form-layout')).toBe('split');
});
it('recalculates with the native algorithm radios without losing files or selection and rejects old results',()=>{
  setup();add();const old=FakeWorker.instances[0],late=old.onmessage!;act(()=>{old.finish('a');old.finish('b');old.finish('c');});
  fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:'photo.part.bin'}));
  fireEvent.click(screen.getByRole('radio',{name:'SHA-256'}));expect(old.terminated).toBe(true);
  expect(rows()).toHaveLength(3);expect(rows()[1].getAttribute('data-selected')).toBe('true');
  expect(FakeWorker.instances[1].requests[0].algorithm).toBe('sha256');
  act(()=>late({data:{id:'hash-2',algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>));
  expect(document.querySelector('[data-hash-digest]')?.textContent).toBe('');
  const panel=screen.getByRole('complementary',{name:'Settings and actions'});
  expect(panel.textContent).not.toMatch(/SHA-256 ·|Completed|completed|security-sensitive|Exports include/);
});
it.each(['en','zh'] as const)('uses inline comparison icons with accessible hidden status, not visible result paragraphs: %s',locale=>{
  setup(locale);add();const worker=FakeWorker.instances[0];
  const input=screen.getByRole('textbox',{name:locale==='en'?'Compare hash (optional)':'哈希比对（可选）'});
  const indicator=()=>document.querySelector('[data-hash-indicator]');
  const status=()=>document.querySelector('[data-hash-comparison]')!;
  expect(indicator()).toBeNull();
  // Valid expected value while hashing is pending is not a mismatch.
  fireEvent.change(input,{target:{value:'a'.repeat(32)}});expect(indicator()).toBeNull();expect(status().textContent).toBe('');
  act(()=>worker.finish('a'));expect(indicator()?.getAttribute('data-hash-indicator')).toBe('match');
  expect(indicator()?.getAttribute('aria-hidden')).toBe('true');expect(status().textContent).toBe(locale==='en'?'Match':'一致');
  expect(status().getAttribute('aria-live')).toBe('polite');expect(status().getAttribute('aria-atomic')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe(status().id);
  fireEvent.change(input,{target:{value:'b'.repeat(32)}});expect(indicator()?.getAttribute('data-hash-indicator')).toBe('mismatch');
  expect(status().textContent).toBe(locale==='en'?'Mismatch':'不一致');
  fireEvent.change(input,{target:{value:'bb'}});expect(indicator()).toBeNull();expect(status().textContent).toBe('');
  expect(input.getAttribute('aria-invalid')).toBeNull();
  for(const value of ['xyz','a'.repeat(33)]){
    fireEvent.change(input,{target:{value}});expect(indicator()).toBeNull();expect(input.getAttribute('aria-invalid')).toBe('true');
  }
  fireEvent.change(input,{target:{value:''}});expect(indicator()).toBeNull();expect(input.getAttribute('aria-invalid')).toBeNull();
  expect(screen.queryByText(/hexadecimal characters|required\.|位十六进制|等待计算完成|Waiting for the result/)).toBeNull();
});
it('keeps comparison values by file and clears them on algorithm change',()=>{
  setup();add();const worker=FakeWorker.instances[0];act(()=>{worker.finish('a');worker.finish('b');worker.finish('c');});
  const expected=()=>screen.getByRole('textbox',{name:'Compare hash (optional)'});
  fireEvent.change(expected(),{target:{value:'aa'}});expect(document.querySelector('[data-hash-comparison]')?.textContent).toBe('');
  fireEvent.change(expected(),{target:{value:' A'.trim().repeat(32)+' '}});expect(screen.getByText('Match')).toBeTruthy();
  fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:'photo.part.bin'}));expect(expected()).toHaveProperty('value','');
  fireEvent.change(expected(),{target:{value:'c'.repeat(32)}});expect(screen.getByText('Mismatch')).toBeTruthy();
  fireEvent.change(expected(),{target:{value:'xyz'}});expect(expected().getAttribute('aria-invalid')).toBe('true');
  fireEvent.click(within(rows()[0] as HTMLElement).getByRole('button',{name:'中文.txt'}));expect(expected()).toHaveProperty('value','A'.repeat(32)+' ');
  fireEvent.click(screen.getByRole('radio',{name:'SHA-512'}));
  expect(worker.terminated).toBe(true);expect(expected()).toHaveProperty('value','');expect(document.querySelector('[data-hash-digest]')?.textContent).toBe('');
  expect(document.querySelector('[data-hash-indicator]')).toBeNull();
});
it('keeps the filename separate from the full SHA-512 digest and its copy button',async()=>{
  setup();add();fireEvent.click(screen.getByRole('radio',{name:'SHA-512'}));const worker=FakeWorker.instances.at(-1)!;
  const details=screen.getByRole('region',{name:'Verification details'});
  const copy=within(details).getByRole('button',{name:'Copy hash'});expect(copy).toHaveProperty('disabled',true);
  act(()=>{worker.finish('a');worker.finish('b');worker.finish('c');});
  const filename=within(details).getByText('中文.txt');expect(filename.closest('[data-hash-value]')).toBeNull();expect(filename.querySelector('button')).toBeNull();
  const value=details.querySelector('[data-hash-value]')!;expect(value.contains(copy)).toBe(true);expect(value.querySelector('code')?.textContent).toBe('a'.repeat(128));
  fireEvent.click(copy);await act(async()=>{});expect(clipboard).toHaveBeenLastCalledWith('a'.repeat(128));expect(worker.requests).toHaveLength(3);
});
it('copies full digests without selecting the row and exports only completed entries without rehashing',async()=>{
  setup();add(['中文.txt','new\nline.bin','waiting.bin']);const worker=FakeWorker.instances[0];act(()=>{worker.finish('a');worker.finish('b');});
  const selected=rows()[0].getAttribute('data-selected');fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:/Copy hash:/}));await act(async()=>{});
  expect(clipboard).toHaveBeenLastCalledWith('b'.repeat(32));expect(rows()[0].getAttribute('data-selected')).toBe(selected);
  fireEvent.click(actions().getByRole('button',{name:'Copy results'}));await act(async()=>{});const text=clipboard.mock.calls.at(-1)![0];expect(text.split('\n')).toHaveLength(4);expect(text).toContain('中文.txt');expect(text).toContain('"new\\nline.bin"');expect(text).not.toContain('waiting.bin');expect(screen.getByText('Copied 2 completed results')).toBeTruthy();
  fireEvent.click(actions().getByRole('button',{name:'Download TXT'}));fireEvent.click(actions().getByRole('button',{name:'Download TXT'}));
  const calls=vi.mocked(saveBlob).mock.calls;expect(calls[0][1]).toMatch(/^checksums-md5-\d{8}-\d{6}-\d{3}(?:-\d+)?\.txt$/);expect(calls[0][1]).not.toBe(calls[1][1]);expect(calls[0][0].type).toBe('text/plain;charset=utf-8');
  expect(screen.getByText('Exported 2 completed results')).toBeTruthy();
  const content=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsText(calls[0][0]);});expect(content).toBe(text);expect(worker.requests).toHaveLength(3);
});
it('removes and cancels active work, retries unfinished and terminates on clear/unmount',()=>{
  const view=setup();add();const old=FakeWorker.instances[0],late=old.onmessage!;fireEvent.click(within(rows()[0] as HTMLElement).getByRole('button',{name:'Remove: 中文.txt'}));expect(old.terminated).toBe(true);
  act(()=>late({data:{id:'hash-1',algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>));expect(rows()).toHaveLength(2);
  fireEvent.click(screen.getByRole('button',{name:'Cancel hashing'}));expect(rows().every(r=>r.getAttribute('data-task-status')==='cancelled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Retry unfinished'}));expect(rows()[0].getAttribute('data-task-status')).toBe('processing');
  fireEvent.click(actions().getByRole('button',{name:'Clear'}));expect(rows()).toHaveLength(0);expect(screen.getByRole('radio',{name:'MD5'})).toHaveProperty('checked',true);
  add();const current=FakeWorker.instances.at(-1)!;view.unmount();expect(current.terminated).toBe(true);
});
it('shows unsupported Worker errors and still allows removal and clear',async()=>{
  vi.stubGlobal('Worker',undefined);setup();add();await act(async()=>{});expect(rows().every(r=>r.getAttribute('data-task-status')==='error')).toBe(true);
  expect(screen.getAllByText('This browser does not support Workers or WebAssembly.')).toHaveLength(3);
  fireEvent.click(actions().getByRole('button',{name:'Clear'}));expect(rows()).toHaveLength(0);
});
