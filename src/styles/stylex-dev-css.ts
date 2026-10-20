// StyleX 0.19.1's css-only shim changes the active link's href, briefly
// detaching ALL rules even when the response is identical. Keep the old sheet
// until its replacement loads. Remove when upstream provides an atomic refresh.
export function createStylexCssRefresh(initial: HTMLLinkElement) {
  let current = initial;
  let pending: HTMLLinkElement | undefined;
  const dispose = () => {
    pending?.remove();
    pending = undefined;
  };
  const refresh = () => {
    dispose();
    const next = current.cloneNode() as HTMLLinkElement;
    const url = new URL(current.href);
    url.searchParams.set('t', String(Date.now()));
    next.href = url.href;
    pending = next;
    next.onload = () => {
      if (pending !== next) return;
      current.remove();
      current = next;
      pending = undefined;
    };
    next.onerror = () => {
      if (pending === next) dispose();
    };
    current.after(next);
  };
  return { refresh, dispose };
}

if (import.meta.hot) {
  // This DEV-only module runs after parsing; the blocking SSR sheet is present.
  const link = document.querySelector<HTMLLinkElement>('link[href="/virtual:stylex.css"]');
  if (link) {
    const { refresh, dispose } = createStylexCssRefresh(link);
    refresh();
    import.meta.hot.on('stylex:css-update', refresh);
    import.meta.hot.dispose(() => {
      import.meta.hot!.off('stylex:css-update', refresh);
      dispose();
    });
  }
}
