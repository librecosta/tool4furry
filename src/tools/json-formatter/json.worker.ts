import { createJsonWorkerHandler, type JsonRequest } from './protocol';

const handle = createJsonWorkerHandler();
self.onmessage = ({ data }: MessageEvent<JsonRequest>) => {
  try {
    self.postMessage(handle(data));
  } catch {
    self.postMessage({ id: data.id, kind: 'failure' });
  }
};
