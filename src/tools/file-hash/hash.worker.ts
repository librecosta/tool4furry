import { createHashEngine } from './engine';
import { algorithms, HashError } from './core';
import type { HashRequest, HashResponse } from './protocol';
const hash = createHashEngine();
const send = (message: HashResponse) => self.postMessage(message);
self.onmessage = async ({ data }: MessageEvent<HashRequest>) => {
  const { id, algorithm, file } = data;
  if (!Object.hasOwn(algorithms, algorithm)) return;
  let previous = -Infinity;
  try {
    const digest = await hash(file, algorithm, { onProgress: (loaded, total) => {
      const now = performance.now();
      if (loaded === 0 || loaded === total || now - previous >= 50) {
        previous = now; send({ id, algorithm, type: 'progress', loaded, total });
      }
    } });
    send({ id, algorithm, type: 'result', digest });
  } catch (error) {
    send({ id, algorithm, type: 'error', code: error instanceof HashError ? error.code : 'resource' });
  }
};
