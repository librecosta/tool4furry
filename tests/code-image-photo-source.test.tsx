import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { getCreativeAsset } from '../src/assets/creative';
import { readBackground } from '../src/tools/code-image-generator/delivery';
import { useLocalPhoto } from '../src/tools/code-image-generator/use-local-photo';

vi.mock('../src/tools/code-image-generator/delivery', () => ({ readBackground: vi.fn() }));
const decode = vi.mocked(readBackground);
const asset = getCreativeAsset('winter-wolf')!;
const file = new File(['image'], 'local.png', { type: 'image/png' });

function bitmap(width: number, height: number) {
  return { width, height, close: vi.fn() } satisfies ImageBitmap;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it('uses one decoder, preserves the old photo on failure, and closes replaced bitmaps', async () => {
  const local = bitmap(12, 14), builtIn = bitmap(asset.width, asset.height);
  const fetchAsset = vi.fn().mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
    .mockResolvedValueOnce(new Response('AVIF', { headers: { 'content-type': 'image/avif' } }));
  vi.stubGlobal('fetch', fetchAsset);
  decode.mockResolvedValueOnce(local).mockResolvedValueOnce(builtIn);
  const loaded = vi.fn();
  const { result, unmount } = renderHook(() => useLocalPhoto('en', loaded));
  await act(() => result.current.load({ file }));
  expect(decode).toHaveBeenCalledWith(file);
  expect(result.current.photo).toMatchObject({ name: 'local.png', bitmap: local });
  await act(() => result.current.load({ asset }));
  expect(result.current.error).toContain('Could not load');
  expect(result.current.photo?.bitmap).toBe(local);
  expect(local.close).not.toHaveBeenCalled();
  await act(() => result.current.load({ asset }));
  expect(decode.mock.calls[1][0].type).toBe('image/avif');
  expect(result.current.photo).toMatchObject({ name: 'Winter Wolf', assetId: asset.id, bitmap: builtIn });
  expect(local.close).toHaveBeenCalledTimes(1);
  expect(loaded).toHaveBeenCalledTimes(2);
  unmount();
  expect(builtIn.close).toHaveBeenCalledTimes(1);
});

it('aborts superseded requests and discards late decodes after a switch or reset', async () => {
  const stale = bitmap(12, 14);
  const latest = bitmap(20, 24);
  let finishDecode!: (bitmap: ImageBitmap) => void;
  let finishFetch!: (response: Response) => void;
  const fetchAsset = vi.fn(() => new Promise<Response>(resolve => { finishFetch = resolve; }));
  vi.stubGlobal('fetch', fetchAsset);
  decode.mockImplementationOnce(() => new Promise(resolve => { finishDecode = resolve; }))
    .mockResolvedValueOnce(latest);
  const loaded = vi.fn();
  const { result } = renderHook(() => useLocalPhoto('en', loaded));
  let first!: Promise<void>, inFlight!: Promise<void>;
  act(() => { first = result.current.load({ file }); });
  expect(result.current.pending).toBe(true);
  act(() => { inFlight = result.current.load({ asset }); });
  await waitFor(() => expect(fetchAsset).toHaveBeenCalledTimes(1));
  await act(() => result.current.load({ file }));
  expect(fetchAsset).toHaveBeenCalledWith(expect.stringContaining('winter-wolf.avif'), expect.objectContaining({
    signal: expect.objectContaining({ aborted: true }),
  }));
  await act(async () => { finishFetch(new Response('AVIF')); await inFlight; });
  await act(async () => { finishDecode(stale); await first; });
  expect(stale.close).toHaveBeenCalledTimes(1);
  expect(result.current.photo?.bitmap).toBe(latest);
  expect(loaded).toHaveBeenCalledTimes(1);
  let afterReset!: Promise<void>;
  const resetLate = bitmap(11, 17);
  decode.mockImplementationOnce(() => new Promise(resolve => { finishDecode = resolve; }));
  act(() => { afterReset = result.current.load({ file }); });
  act(() => result.current.clear());
  await act(async () => { finishDecode(resetLate); await afterReset; });
  expect(resetLate.close).toHaveBeenCalledTimes(1);
  expect(latest.close).toHaveBeenCalledTimes(1);
  expect(result.current.photo).toBeUndefined();
  expect(loaded).toHaveBeenCalledTimes(1);
});
