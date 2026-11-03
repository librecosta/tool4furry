import { renderHook, act, waitFor } from '@testing-library/react';
import { it, expect } from 'vitest';
import { useJob } from '../src/tools/general/use-job';
it('invalidates late results and keeps the native slot occupied until it actually finishes', async () => {
  let finish!: (n: number) => void;
  const pending = new Promise<number>((resolve) => (finish = resolve));
  const { result, unmount } = renderHook(() => useJob<number>('en'));
  let calls = 0;
  let first!: Promise<void>;
  act(() => {
    first = result.current.run(async () => {
      calls++;
      return pending;
    });
  });
  expect(result.current.busy).toBe(true);
  act(() => result.current.invalidate());
  await act(async () => {
    await result.current.run(async () => {
      calls++;
      return 2;
    });
  });
  expect(calls).toBe(1);
  await act(async () => {
    finish(1);
    await first;
  });
  expect(result.current.result).toBeUndefined();
  expect(result.current.busy).toBe(false);
  await act(async () => {
    await result.current.run(async () => 3);
  });
  expect(result.current.result).toBe(3);
  let released = false;
  act(() => {
    void result.current.run(async (signal) => {
      await new Promise((r) => setTimeout(r, 1));
      released = signal.aborted;
      return 4;
    });
  });
  unmount();
  await waitFor(() => expect(released).toBe(true));
});
