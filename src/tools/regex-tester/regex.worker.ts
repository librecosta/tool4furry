import { evaluateRegex } from './core';
import { analyzePattern } from './analysis';
import { RegexIssue, type WorkerRequest, type WorkerResponse } from './protocol';

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  let response: WorkerResponse;
  try {
    response = { result: 'kind' in data ? analyzePattern(data.pattern, data.flags) : evaluateRegex(data) };
  } catch (error) {
    response = { error: error instanceof RegexIssue ? error.issue : { code: 'worker' } };
  }
  self.postMessage(response);
};
