// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
const { encode, factory } = vi.hoisted(() => {
  const encode = vi.fn(() => new Uint8Array([1, 2, 3]));
  return { encode, factory: vi.fn(async () => ({ encode, HEAPU8: new Uint8Array(16) })) };
});
vi.mock('@jsquash/avif/codec/enc/avif_enc.js', () => ({ default: factory }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('actual Worker entry uses the shared AVIF budget before initialization', () => {
  it('accepts wide 4MP, refuses 8MP/long edges, and retains fixed S6/Alpha100 settings', async () => {
    vi.resetModules();
    const postMessage = vi.fn(), scope: { postMessage: typeof postMessage; onmessage?: (event: { data: unknown }) => Promise<void> } = { postMessage };
    vi.stubGlobal('self', scope);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/wasm' }), arrayBuffer: async () => new ArrayBuffer(3485872) })));
    vi.stubGlobal('crypto', { subtle: { digest: async () => Uint8Array.from('d9f2a95164362af48558d176e619becfd49dd97b50b86c679b47100860522b3d'.match(/../g)!, h => parseInt(h, 16)).buffer } });
    await import('../src/tools/image/avif.worker');
    for (const [width, height] of [[4097, 1], [3840, 2160], [2048, 2049]]) {
      await scope.onmessage!({ data: { id: 1, rgba: new ArrayBuffer(width * height * 4), width, height, quality: 55, avif444: false } });
      expect(postMessage.mock.lastCall![0]).toMatchObject({ error: 'avifLoad' });
    }
    expect(factory).not.toHaveBeenCalled();
    for (const [width, height, avif444] of [[4096, 1024, false], [3840, 1080, true], [2048, 2048, false], [3000, 1000, false]] as const) {
      await scope.onmessage!({ data: { id: 2, rgba: new ArrayBuffer(width * height * 4), width, height, quality: 55, avif444 } });
      expect(encode.mock.lastCall).toEqual([expect.any(Uint8Array), width, height, expect.objectContaining({ quality: 55, speed: 6, qualityAlpha: 100, subsample: avif444 ? 3 : 1, bitDepth: 8 })]);
      expect(postMessage.mock.lastCall![0]).toMatchObject({ id: 2, buffer: expect.any(ArrayBuffer) });
    }
    expect(factory).toHaveBeenCalledOnce();
  });
});
