(() => {
  const root = document.querySelector('[data-home-pillars]');
  if (!root || root.dataset.pillarsEnhanced) return;
  root.dataset.pillarsEnhanced = 'true';
  let observer, motion;
  const cleanup = () => {
    observer?.disconnect();
    motion?.removeEventListener?.('change', preference);
    root.removeEventListener('focusin', finish);
    window.removeEventListener('pagehide', finish);
  };
  const finish = () => {
    root.dataset.pillarReveal = 'done';
    cleanup();
  };
  const preference = () => { if (motion.matches) finish(); };
  try {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || typeof IntersectionObserver !== 'function') return;
    // Restored/anchored content is already readable; only future natural entry animates.
    const anchor = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (root.contains(anchor) || root.getBoundingClientRect().top < window.innerHeight) return;
    observer = new IntersectionObserver(entries => {
      if (root.dataset.pillarReveal !== 'pending') return;
      if (!entries.some(entry => entry.target === root && entry.isIntersecting)) return;
      root.dataset.pillarReveal = 'visible';
      cleanup();
    }, { threshold: 0, rootMargin: '0px 0px -64px 0px' });
    observer.observe(root);
    root.dataset.pillarReveal = 'pending';
    motion.addEventListener('change', preference);
    root.addEventListener('focusin', finish);
    window.addEventListener('pagehide', finish, { once: true });
  } catch {
    // Never leave content concealed after partial initialization or a missing browser API.
    finish();
  }
})();
