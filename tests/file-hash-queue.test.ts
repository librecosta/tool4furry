// @vitest-environment node
import { expect, it } from 'vitest';
import { HashQueue, type HashWorker } from '../src/tools/file-hash/queue';
import { HashError, algorithms } from '../src/tools/file-hash/core';
import type { HashRequest, HashResponse } from '../src/tools/file-hash/protocol';
class WorkerFake implements HashWorker {
  onmessage: HashWorker['onmessage']=null; onerror: HashWorker['onerror']=null;onmessageerror: HashWorker['onmessageerror']=null;
  requests:HashRequest[]=[];terminated=false;
  postMessage(request:HashRequest){this.requests.push(request);}terminate(){this.terminated=true;}
  send(message:Partial<HashResponse>){this.onmessage?.({data:{...this.requests.at(-1),...message}} as MessageEvent<HashResponse>);}
  finish(){this.send({type:'result',digest:'a'.repeat(algorithms[this.requests.at(-1)!.algorithm].length)});}
}
const files=()=>[new File(['a'],'same.txt'),new File(['b'],'same.txt'),new File(['c'],'中文.bin')];
function setup(){const workers:WorkerFake[]=[];const queue=new HashQueue(()=>{const worker=new WorkerFake();workers.push(worker);return worker;});return {queue,workers,snapshot:queue.getSnapshot};}
it('automatically serializes multiple files, reuses one worker and appends without recomputing completed files',()=>{
  const {queue,workers,snapshot}=setup();const input=files();queue.add(input);
  expect(snapshot().items.map(i=>i.status)).toEqual(['processing','queued','queued']);expect(new Set(snapshot().items.map(i=>i.id)).size).toBe(3);
  const w=workers[0];w.send({type:'progress',loaded:1,total:1});expect(snapshot().items[0].progress).toBe(1);
  w.finish();w.finish();w.finish();expect(snapshot().items.every(i=>i.status==='ready')).toBe(true);
  queue.add([input[0]]);expect(w.requests).toHaveLength(4);expect(workers).toHaveLength(1);expect(snapshot().items[0].file).toBe(input[0]);
  queue.dispose();expect(w.terminated).toBe(true);
});
it('drops old algorithms and old worker messages, and clears expected values on algorithm changes',()=>{
  const {queue,workers,snapshot}=setup();queue.add(files());const old=workers[0],late=old.onmessage!;old.finish();
  queue.setExpected(snapshot().items[0].id,'expected');queue.setAlgorithm('sha512');expect(old.terminated).toBe(true);
  expect(snapshot().items.every(i=>i.algorithm==='sha512'&&!i.digest&&!i.expected)).toBe(true);
  late({data:{id:snapshot().items[0].id,algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>);
  expect(snapshot().items[0].status).toBe('processing');workers[1].finish();expect(snapshot().items[0].digest).toHaveLength(128);
});
it('removes queued, active and completed files independently and rejects late results after removal and clear',()=>{
  const {queue,workers,snapshot}=setup();queue.add(files());const [a,b,c]=snapshot().items,late=workers[0].onmessage!;
  queue.remove(b.id);expect(workers[0].requests).toHaveLength(1);queue.remove(a.id);expect(workers[0].terminated).toBe(true);expect(workers[1].requests[0].id).toBe(c.id);
  late({data:{id:a.id,algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>);expect(snapshot().items).toHaveLength(1);
  workers[1].finish();queue.remove(c.id);expect(snapshot().items).toHaveLength(0);
  queue.add(files());const callback=workers[1].onmessage!;queue.setAlgorithm('sha256');queue.clear();callback({data:{id:a.id,algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>);
  expect(snapshot()).toEqual({algorithm:'md5',items:[]});
});
it('continues after an individual error, cancels without deleting files, retries unfinished and keeps expected values per file',()=>{
  const {queue,workers,snapshot}=setup();queue.add(files());const ids=snapshot().items.map(i=>i.id);
  queue.setExpected(ids[0],'aaa');queue.setExpected(ids[1],'bbb');queue.select(ids[1]);expect(snapshot().items[1].expected).toBe('bbb');
  workers[0].send({type:'error',code:'read'});queue.cancel();expect(snapshot().items.map(i=>i.status)).toEqual(['error','cancelled','cancelled']);
  queue.retry();expect(workers[1].requests[0].id).toBe(ids[0]);workers[1].finish();workers[1].send({type:'error',code:'read'});queue.dispose();
});
it('continues the queue after failures and reports unavailable/failed workers',async()=>{
  const {queue,workers,snapshot}=setup();queue.add(files());workers[0].send({type:'error',code:'read'});await Promise.resolve();
  expect(workers[1].requests[0].file.name).toBe('same.txt');workers[1].finish();expect(workers[1].requests).toHaveLength(2);
  const broken=new HashQueue(()=>{throw new HashError('unsupported');});broken.add(files());await Promise.resolve();await Promise.resolve();
  expect(broken.getSnapshot().items.every(i=>i.status==='error'&&i.error==='unsupported')).toBe(true);
  const late=workers[1].onmessage!;queue.dispose();late({data:{id:snapshot().items[2].id,algorithm:'md5',type:'result',digest:'a'.repeat(32)}} as MessageEvent<HashResponse>);expect(snapshot().items[2].digest).toBeUndefined();
  queue.activate();expect(workers[2].requests).toHaveLength(1);queue.dispose();
});
