// Kept self-contained: emitted verbatim as the only production site script.
(() => {
  const script = document.currentScript;
  const root = document.documentElement;
  const classes = {
    dark: script.dataset.dark.split(' ').filter(Boolean),
    light: script.dataset.light.split(' ').filter(Boolean),
  };
  const fallback = script.dataset.default === 'light' ? 'light' : 'dark';
  const key = 't4f.appearance';
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
  let initial = fallback;
  try {
    const stored = localStorage.getItem(key);
    if (valid(stored)) initial = stored;
  } catch {}
  apply(initial);
  window.t4fAppearance = {
    get,
    toggle() {
      const next = get() === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(key, next); } catch {}
    },
  };
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-appearance-toggle="static"]'))
      window.t4fAppearance.toggle();
  });
  document.addEventListener('DOMContentLoaded', sync, { once: true });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    apply(valid(event.newValue) ? event.newValue : fallback);
  });
})();
