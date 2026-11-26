import { highlightCode } from './highlight';
import type { HighlightRequest, HighlightResponse } from './highlight-data';

self.onmessage = async ({ data }: MessageEvent<HighlightRequest>) => {
  const result = await highlightCode(data.source, data.language, data.theme);
  const response: HighlightResponse = { id: data.id, result };
  self.postMessage(response);
};
