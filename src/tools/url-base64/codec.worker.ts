import { convertText, type CodecRequest } from './core';

self.onmessage = ({ data }: MessageEvent<CodecRequest>) => {
  self.postMessage(convertText(data));
};
