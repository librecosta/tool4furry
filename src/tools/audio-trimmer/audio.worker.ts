import type { StreamTargetChunk } from 'mediabunny';
import { estimatedBytes, blobBudget } from './core';
import { analyzePeaks, inspect, MediaFailure, readAudio, renderPlan } from './media';
import { encodingOptions, exportPlan } from './encoding';
import type { AudioRequest, AudioResponse, AudioTaskResults } from './protocol';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AudioRequest | 'ack' | 'cancel'>) => void) | null;
  postMessage(message: AudioResponse, transfer?: Transferable[]): void;
};
const controller = new AbortController();
const { signal } = controller;
let busy = false;
let ack: (() => void) | undefined;

const progress = (value: number) => scope.postMessage({ type: 'progress', value });
const transferPeaks = (value: { min: Float32Array<ArrayBuffer>; max: Float32Array<ArrayBuffer> }) =>
  [value.min.buffer, value.max.buffer];

async function send(response: AudioResponse, transfer: Transferable[]) {
  signal.throwIfAborted();
  await new Promise<void>(resolve => {
    ack = resolve;
    scope.postMessage(response, transfer);
  });
  signal.throwIfAborted();
}

async function run(request: AudioRequest): Promise<[AudioTaskResults[keyof AudioTaskResults], Transferable[]?]> {
  // Export failures are distinguished from file/decoder errors where we can identify the stage.
  return readAudio(request.file, async track => {
    if (request.type === 'analyze') {
      const info = await inspect(track);
      const { decodedEnd, ...peaks } = await analyzePeaks(track, info, 0, info.frames, 8192, signal, progress);
      info.frames = Math.min(info.frames, decodedEnd);
      return [{ info, peaks, capabilities: await encodingOptions(info) }, transferPeaks(peaks)];
    }
    if (request.type === 'detail') {
      const { from, to, bins, info } = request;
      const peaks = await analyzePeaks(track, info, from, to, bins, signal);
      return [peaks, transferPeaks(peaks)];
    }
    if (request.type === 'play') {
      let from = request.from;
      do {
        for await (const block of renderPlan(track, request.info, request.plan, from, signal)) {
          await send({ type: 'samples', block }, block.data.map(channel => channel.buffer));
        }
        from = 0;
      } while (request.loop && !signal.aborted);
      return [undefined];
    }
    const { info, plan, encoding, stream } = request;
    if (!stream && estimatedBytes(plan, info, encoding) > blobBudget) throw new MediaFailure('outputSize');
    const write = stream ? ({ data, position }: StreamTargetChunk) => {
      // Mediabunny's writer may continue to own the backing array.
      const owned = data.slice();
      return send({ type: 'write', data: owned, position }, [owned.buffer]);
    } : undefined;
    return [await exportPlan(track, info, plan, encoding, signal, progress, write)];
  });
}

scope.onmessage = ({ data }) => {
  if (data === 'ack' || data === 'cancel') {
    if (data === 'cancel') controller.abort();
    ack?.();
    ack = undefined;
    return;
  }
  if (busy) return;
  busy = true;
  void run(data).then(
    ([value, transfer]) => scope.postMessage({ type: 'result', value, }, transfer),
    error => scope.postMessage({
      type: 'error',
      code: error instanceof MediaFailure ? error.code : data.type === 'export' ? 'encode' : 'decode',
    }),
  );
};
