(() => {
  const root = document.querySelector('[data-home-section="principles"]');
  if (!root || root.dataset.principlesEnhanced) return;
  root.dataset.principlesEnhanced = 'true';
  let observer, motion;
  const cleanup = () => {
    observer?.disconnect();
    motion?.removeEventListener?.('change', preference);
    root.removeEventListener('focusin', finish);
    window.removeEventListener('pagehide', finish);
  };
  const finish = () => {
    root.dataset.principlesReveal = 'done';
    cleanup();
  };
  const preference = () => { if (motion.matches) finish(); };
  try {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || typeof IntersectionObserver !== 'function') return;
    const anchor = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (root.getBoundingClientRect().top < window.innerHeight || root.contains(document.activeElement)
      || (anchor && (root.contains(anchor) || (root.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)))) return;
    observer = new IntersectionObserver(entries => {
      try {
        if (root.dataset.principlesReveal !== 'pending'
          || !entries.some(entry => entry.target === root && entry.isIntersecting)) return;
        root.dataset.principlesReveal = 'visible';
        observer.disconnect();
        // Keep focus/preference/pagehide safety until navigation, including mid-reveal.
      } catch { finish(); }
    }, { threshold: 0, rootMargin: '0px 0px -48px 0px' });
    observer.observe(root);
    motion.addEventListener('change', preference);
    root.addEventListener('focusin', finish);
    window.addEventListener('pagehide', finish, { once: true });
    root.dataset.principlesReveal = 'pending';
  } catch {
    // Static content stays readable if any enhancement API is unavailable.
    finish();
  }
})();
