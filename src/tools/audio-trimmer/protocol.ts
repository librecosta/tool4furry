import type { AudioInfo, CutPlan, Encoding, Format } from './core';
import type { AudioError, OutputBlock, Peaks } from './media';

export type AudioRequest =
  | { type: 'analyze'; file: File }
  | { type: 'detail'; file: File; info: AudioInfo; from: number; to: number; bins: number }
  | { type: 'play'; file: File; info: AudioInfo; plan: CutPlan; from: number; loop: boolean }
  | { type: 'export'; file: File; info: AudioInfo; plan: CutPlan; encoding: Encoding; stream: boolean };

export type Capabilities = Partial<Record<Format, Record<number, number>>>;
export type AudioTaskResults = {
  analyze: { info: AudioInfo; peaks: Peaks; capabilities: Capabilities };
  detail: Peaks;
  play: undefined;
  export: Blob | undefined;
};

export type AudioResponse =
  | { type: 'progress'; value: number }
  | { type: 'samples'; block: OutputBlock }
  | { type: 'write'; position: number; data: Uint8Array<ArrayBuffer> }
  | { type: 'result'; value: AudioTaskResults[keyof AudioTaskResults] }
  | { type: 'error'; code: AudioError };
