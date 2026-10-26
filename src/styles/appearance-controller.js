// Audited head script: theme state owns the DOM; snapshots only present a click.
// Reveal lifecycle adapted from Gopher Atlas 1f730584, apps/web/src/lib/theme.ts.
// Copyright (c) 2026 DeepFurry, BSD-3-Clause; full notice: /licenses/gopher-atlas.txt.
(() => {
  const script = document.currentScript;
  const root = document.documentElement;
  const classes = {
    dark: script.dataset.dark.split(' ').filter(Boolean),
    light: script.dataset.light.split(' ').filter(Boolean),
  };
  const fallback = script.dataset.default === 'light' ? 'light' : 'dark';
  const key = 't4f.appearance';
  const origins = JSON.parse(script.dataset.regionOrigins || '[]');
  const valid = value => value === 'light' || value === 'dark';
  const get = () => root.dataset.appearance === 'light' ? 'light' : 'dark';
  const sync = () => {
    document.querySelectorAll('[data-appearance-toggle="static"]').forEach(button => {
      const label = get() === 'dark' ? button.dataset.lightLabel : button.dataset.darkLabel;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(get() === 'light'));
      button.disabled = false;
    });
  };
  const apply = value => {
    root.classList.remove(...classes.dark, ...classes.light);
    root.classList.add(...classes[value]);
    root.dataset.appearance = value;
    root.style.colorScheme = value;
    sync();
    window.dispatchEvent(new Event('t4f:appearance'));
  };
  const persist = value => { try { localStorage.setItem(key, value); } catch {} };
  let initial = fallback;
  try {
    const stored = localStorage.getItem(key);
    if (valid(stored)) initial = stored;
  } catch {}
  // Explicit region navigation relays once; arbitrary hashes stay untouched.
  const relay = /^#t4f-theme=(light|dark)$/.exec(location.hash);
  if (relay && origins.includes(location.origin)) {
    initial = relay[1];
    persist(initial);
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch {}
  }
  apply(initial);
  const preference = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  let active;
  const finish = (job, skip = false) => {
    if (active !== job) return;
    active = undefined;
    job.apply();
    if (skip) job.transition?.skipTransition();
    job.animation?.cancel();
    delete root.dataset.themeTransition;
    job.button.removeAttribute('aria-busy');
  };
  const stop = (commit = true) => {
    if (!active) return;
    if (!commit) active.cancel();
    finish(active, true);
  };
  window.t4fAppearance = {
    get,
    toggle(button) {
      if (active) return;
      const next = get() === 'dark' ? 'light' : 'dark';
      let applied = false;
      const commit = () => {
        if (applied) return;
        applied = true;
        apply(next);
        persist(next);
      };
      if (!button || !document.startViewTransition || !root.animate || !preference || preference.matches || document.hidden) {
        commit();
        return;
      }
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const job = { apply: commit, cancel: () => { applied = true; }, button };
      active = job;
      root.dataset.themeTransition = 'reveal';
      button.setAttribute('aria-busy', 'true');
      try {
        const transition = document.startViewTransition(commit);
        job.transition = transition;
        void transition.ready.then(() => {
          if (active !== job) return;
          if (document.hidden || preference.matches) { finish(job, true); return; }
          job.animation = root.animate({ clipPath: [
            `circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`,
          ] }, { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)', fill: 'both' });
          void job.animation.finished.catch(() => finish(job, true));
        }).catch(() => finish(job, true));
        void transition.updateCallbackDone.catch(() => finish(job, true));
        void transition.finished.then(() => finish(job), () => finish(job, true));
      } catch { finish(job, true); }
    },
  };
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.defaultPrevented) return;
    const button = event.target.closest('[data-appearance-toggle="static"]');
    if (button) window.t4fAppearance.toggle(button);
    const link = event.target.closest('a[data-region-link]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const target = new URL(link.href);
    if (!origins.includes(location.origin) || !origins.includes(target.origin) || target.username || target.password || target.hash) return;
    stop();
    target.hash = `t4f-theme=${get()}`;
    event.preventDefault();
    location.assign(target.href);
  });
  document.addEventListener('DOMContentLoaded', sync, { once: true });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    stop(false);
    apply(valid(event.newValue) ? event.newValue : fallback);
  });
  preference?.addEventListener('change', () => { if (preference.matches) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('resize', () => stop());
  window.addEventListener('pagehide', () => stop());
  window.addEventListener('pageswap', () => stop());
})();
