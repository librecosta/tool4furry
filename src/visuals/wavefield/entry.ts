/*! t4f-wavefield-v1: homepage-only lightweight enhancement; no eager shader import. */
const root = document.querySelector<HTMLElement>('[data-wavefield]');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
  let visible = false, loading = false, stopped = false, cleanup: (() => void) | undefined;
  const qaStatic = import.meta.env.DEV && new URLSearchParams(location.search).has('waveStatic');
  const eligible = () => !qaStatic && isSecureContext && !!navigator.gpu && !reduced.matches && !connection?.saveData;
  const start = () => {
    if (stopped || loading || !visible || !eligible()) return;
    loading = true;
    void import('./runtime').then(({ mountWavefield }) => {
      if (!stopped && root.isConnected) {
        cleanup = mountWavefield(root);
        // The mounted session now owns visibility, preference and removal.
        observer.disconnect(); removal.disconnect(); reduced.removeEventListener('change', start);
        connection?.removeEventListener('change', start); window.removeEventListener('pagehide', onHide);
      }
    }).catch(() => { root.dataset.wavefield = 'static'; });
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; start(); }, { rootMargin: '100px' });
  const removal = new MutationObserver(() => { if (!root.isConnected) dispose(); });
  removal.observe(document.body, { childList: true, subtree: true });
  observer.observe(root); reduced.addEventListener('change', start); connection?.addEventListener('change', start);
  const dispose = () => {
    stopped = true; observer.disconnect(); removal.disconnect(); reduced.removeEventListener('change', start);
    connection?.removeEventListener('change', start); cleanup?.();
    window.removeEventListener('pagehide', onHide);
  };
  const onHide = (event: PageTransitionEvent) => { if (!event.persisted) dispose(); };
  window.addEventListener('pagehide', onHide);
  import.meta.hot?.dispose(dispose);
}
