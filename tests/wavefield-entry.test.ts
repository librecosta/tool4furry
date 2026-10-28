import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountWavefield } from '../src/visuals/wavefield/runtime';
vi.mock('../src/visuals/wavefield/runtime', () => ({ mountWavefield: vi.fn(() => vi.fn()) }));

describe('lightweight homepage startup', () => {
  afterEach(() => {
    vi.unstubAllGlobals(); document.body.innerHTML = '';
    delete (navigator as unknown as { connection?: unknown }).connection;
    delete (navigator as unknown as { gpu?: unknown }).gpu;
  });
  it.each(['unsupported', 'reduced', 'save-data', 'supported'])('defers the heavy runtime for %s and hands off its observers once', async mode => {
    vi.resetModules(); vi.mocked(mountWavefield).mockClear();
    document.body.innerHTML = '<div data-wavefield="static"><canvas></canvas></div>';
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: mode === 'unsupported' ? undefined : {} });
    Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: mode === 'save-data' }) });
    const media = Object.assign(new EventTarget(), { matches: mode === 'reduced' });
    vi.stubGlobal('matchMedia', () => media);
    let enter!: IntersectionObserverCallback;
    const disconnect = vi.fn(), remove = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { enter = cb; } observe() {} disconnect = disconnect; });
    vi.stubGlobal('MutationObserver', class { observe() {} disconnect = remove; });
    await import('../src/visuals/wavefield/entry');
    expect(mountWavefield).not.toHaveBeenCalled();
    enter([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    if (mode === 'supported') {
      await vi.waitFor(() => expect(mountWavefield).toHaveBeenCalledOnce());
      expect(disconnect).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();
    } else {
      await Promise.resolve(); expect(mountWavefield).not.toHaveBeenCalled();
    }
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
  });
});
