import factory from '@jsquash/avif/codec/enc/avif_enc.js';
import { defaultOptions } from '@jsquash/avif/meta.js';
import wasmURL from '@jsquash/avif/codec/enc/avif_enc.wasm?url';
import notices from './avif.NOTICE.txt?url';

const scope = self as unknown as {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
let engine: ReturnType<typeof factory> | undefined;
function initialize() {
  return engine ??= (async () => {
    const response = await fetch(wasmURL);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('application/wasm')) throw new Error('WASM response');
    const binary = await response.arrayBuffer();
    if (binary.byteLength !== 3485872) throw new Error('WASM size');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', binary))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== 'd9f2a95164362af48558d176e619becfd49dd97b50b86c679b47100860522b3d') throw new Error('WASM integrity');
    // Explicit ST entry: never import the package's threaded auto-selection wrapper.
    return factory({ wasmBinary: binary });
  })();
}
scope.onmessage = async ({ data }) => {
  let loaded = false;
  try {
    const { id, rgba, width, height, quality, avif444 } = data;
    if (!(rgba instanceof ArrayBuffer) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 2048 || height > 2048 || rgba.byteLength !== width * height * 4 || !Number.isInteger(quality) || quality < 1 || quality > 100 || typeof avif444 !== 'boolean') throw new Error('invalid request');
    const module = await initialize(); loaded = true;
    const out = module.encode(new Uint8Array(rgba), width, height, {
      ...defaultOptions, quality, speed: 6, subsample: avif444 ? 3 : 1, qualityAlpha: 100, bitDepth: 8,
    });
    if (!out?.byteLength) throw new Error('empty output');
    const buffer = out.slice().buffer;
    scope.postMessage({ id, buffer, heap: module.HEAPU8.buffer.byteLength, notices }, [buffer]);
  } catch {
    scope.postMessage({ id: data.id, error: loaded ? 'encode' : 'avifLoad' });
  }
};
