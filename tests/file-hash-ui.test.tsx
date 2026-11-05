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
  setup(locale);expect(screen.getByRole('combobox',{name:locale==='en'?'Algorithm':'算法'}).textContent).toContain('MD5');
  expect(rows()).toHaveLength(0);expect(FakeWorker.instances).toHaveLength(0);expect(document.querySelector('[data-file-hash]')?.getAttribute('data-form-layout')).toBe('stack');
  expect(actions().getAllByRole('button').every(b=>(b as HTMLButtonElement).disabled)).toBe(true);
  expect(screen.queryByText(/Calculate|计算 SHA|32 MiB|0 files|0 个文件/)).toBeNull();
});
it('automatically queues three files, appends a fourth, selects with a button and preserves all file owners on resize',()=>{
  setup();add();const worker=FakeWorker.instances[0];expect(rows()).toHaveLength(3);expect(worker.requests).toHaveLength(1);
  act(()=>{worker.finish('a');worker.finish('b');worker.finish('c');});expect(rows().every(r=>r.getAttribute('data-task-status')==='ready')).toBe(true);
  add(['fourth.txt']);expect(worker.requests).toHaveLength(4);expect(FakeWorker.instances).toHaveLength(1);
  fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:'photo.part.bin'}));expect(screen.getByRole('region',{name:'Verification details'}).textContent).toContain('b'.repeat(32));
  const elements=[document.querySelector('[data-file-workspace]'),document.querySelector('[data-form-settings]')];setViewport(true);expect(elements.every(e=>e?.isConnected)).toBe(true);
  expect(document.querySelector('[data-file-hash]')?.getAttribute('data-form-layout')).toBe('split');
});
it('compares expected hashes only when complete and keeps values by file, then clears them on algorithm change',async()=>{
  setup();add();const worker=FakeWorker.instances[0];act(()=>{worker.finish('a');worker.finish('b');worker.finish('c');});
  const expected=()=>screen.getByRole('textbox',{name:'Expected hash (optional)'});
  fireEvent.change(expected(),{target:{value:'aa'}});expect(document.querySelector('[data-hash-comparison]')?.textContent).toBe('');
  fireEvent.change(expected(),{target:{value:' A'.trim().repeat(32)+' '}});expect(screen.getByText('Match')).toBeTruthy();
  fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:'photo.part.bin'}));expect(expected()).toHaveProperty('value','');
  fireEvent.change(expected(),{target:{value:'c'.repeat(32)}});expect(screen.getByText('Mismatch')).toBeTruthy();
  fireEvent.change(expected(),{target:{value:'xyz'}});expect(screen.getByText('Enter 32 hexadecimal characters.')).toBeTruthy();
  fireEvent.click(within(rows()[0] as HTMLElement).getByRole('button',{name:'中文.txt'}));expect(expected()).toHaveProperty('value','A'.repeat(32)+' ');
  await userEvent.setup().click(screen.getByRole('combobox',{name:'Algorithm'}));await userEvent.setup().click(screen.getByRole('option',{name:'SHA-512'}));
  expect(worker.terminated).toBe(true);expect(expected()).toHaveProperty('value','');expect(document.querySelector('[data-hash-digest]')).toBeNull();
});
it('copies full digests without selecting the row and exports only completed entries without rehashing',async()=>{
  setup();add(['中文.txt','new\nline.bin','waiting.bin']);const worker=FakeWorker.instances[0];act(()=>{worker.finish('a');worker.finish('b');});
  const selected=rows()[0].getAttribute('data-selected');fireEvent.click(within(rows()[1] as HTMLElement).getByRole('button',{name:/Copy hash:/}));await act(async()=>{});
  expect(clipboard).toHaveBeenLastCalledWith('b'.repeat(32));expect(rows()[0].getAttribute('data-selected')).toBe(selected);
  fireEvent.click(actions().getByRole('button',{name:'Copy results'}));await act(async()=>{});const text=clipboard.mock.calls.at(-1)![0];expect(text.split('\n')).toHaveLength(4);expect(text).toContain('中文.txt');expect(text).toContain('"new\\nline.bin"');expect(text).not.toContain('waiting.bin');expect(screen.getByText('Copied 2 completed results')).toBeTruthy();
  fireEvent.click(actions().getByRole('button',{name:'Download TXT'}));fireEvent.click(actions().getByRole('button',{name:'Download TXT'}));
  const calls=vi.mocked(saveBlob).mock.calls;expect(calls[0][1]).toMatch(/^checksums-md5-\d{8}-\d{6}-\d{3}(?:-\d+)?\.txt$/);expect(calls[0][1]).not.toBe(calls[1][1]);expect(calls[0][0].type).toBe('text/plain;charset=utf-8');
  const content=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsText(calls[0][0]);});expect(content).toBe(text);expect(worker.requests).toHaveLength(3);
});
it('removes and cancels active work, retries unfinished and terminates on clear/unmount',()=>{
  const view=setup();add();const old=FakeWorker.instances[0],late=old.onmessage!;fireEvent.click(within(rows()[0] as HTMLElement).getByRole('button',{name:'Remove: 中文.txt'}));expect(old.terminated).toBe(true);
  act(()=>late({data:{id:'hash-1',algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>));expect(rows()).toHaveLength(2);
  fireEvent.click(screen.getByRole('button',{name:'Cancel hashing'}));expect(rows().every(r=>r.getAttribute('data-task-status')==='cancelled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Retry unfinished'}));expect(rows()[0].getAttribute('data-task-status')).toBe('processing');
  fireEvent.click(actions().getByRole('button',{name:'Clear'}));expect(rows()).toHaveLength(0);expect(screen.getByRole('combobox',{name:'Algorithm'}).textContent).toContain('MD5');
  add();const current=FakeWorker.instances.at(-1)!;view.unmount();expect(current.terminated).toBe(true);
});
it('shows unsupported Worker errors and still allows removal and clear',async()=>{
  vi.stubGlobal('Worker',undefined);setup();add();await act(async()=>{});expect(rows().every(r=>r.getAttribute('data-task-status')==='error')).toBe(true);
  expect(screen.getAllByText('This browser does not support Workers or WebAssembly.')).toHaveLength(3);
  fireEvent.click(actions().getByRole('button',{name:'Clear'}));expect(rows()).toHaveLength(0);
});
