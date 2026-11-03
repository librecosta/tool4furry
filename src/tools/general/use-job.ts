import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../i18n/locale';
import { errorText } from './ui';
/** One native operation at a time; invalidating never frees its slot early. */
export function useJob<T>(locale: Locale) {
  const [result, setResult] = useState<T>(),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const owner = useRef({
    version: 0,
    alive: true,
    running: false,
    controller: new AbortController(),
  });
  useEffect(() => {
    owner.current.alive = true;
    return () => {
      owner.current.alive = false;
      owner.current.version++;
      owner.current.controller.abort();
    };
  }, []);
  const invalidate = () => {
    const o = owner.current;
    o.version++;
    o.controller.abort();
    setResult(undefined);
    setError(undefined);
  };
  const run = async (work: (signal: AbortSignal) => Promise<T>) => {
    const o = owner.current;
    if (o.running) return;
    invalidate();
    o.controller = new AbortController();
    const version = o.version,
      signal = o.controller.signal;
    o.running = true;
    setBusy(true);
    try {
      const value = await work(signal);
      if (o.alive && o.version === version && !signal.aborted) setResult(value);
    } catch (e) {
      if (o.alive && o.version === version && !signal.aborted)
        setError(errorText(e, locale));
    } finally {
      o.running = false;
      if (o.alive) setBusy(false);
    }
  };
  return { result, error, busy, run, invalidate, setError };
}
