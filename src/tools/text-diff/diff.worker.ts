import { compareLines } from './core';
import { LocalError } from '../general/bounds';
import type { DiffRequest, DiffResponse } from './comparison';

self.onmessage = ({ data }: MessageEvent<DiffRequest>) => {
  let response: DiffResponse;
  try { response = { result: compareLines(data.left, data.right, data.ignore) }; }
  catch (error) { response = { error: error instanceof LocalError ? 'timeout' : 'resource' }; }
  self.postMessage(response);
};
