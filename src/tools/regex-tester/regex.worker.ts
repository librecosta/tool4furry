import { evaluateRegex, type RegexRequest } from './core';
self.onmessage = (event: MessageEvent<RegexRequest>) => {
  try {
    self.postMessage({ result: evaluateRegex(event.data) });
  } catch (e) {
    self.postMessage({ error: (e as Error).message });
  }
};
