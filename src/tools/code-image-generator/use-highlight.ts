import { useEffect, useRef, useState } from 'react';
import { highlightBudget, plainHighlight, type HighlightRequest, type HighlightResponse } from './highlight-data';
import type { Language, SyntaxTheme } from './settings';

export function useHighlight(source: string, language: Language, theme: SyntaxTheme) {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const [resolved, setResolved] = useState<(HighlightResponse & Omit<HighlightRequest, 'id'>)>();
  useEffect(() => () => {
    worker.current?.terminate();
    worker.current = null;
  }, []);
  useEffect(() => {
    if (!source || source.length > highlightBudget) return;
    const id = ++sequence.current;
    let running = false;
    let timeout: ReturnType<typeof setTimeout>;
    const publish = (result: HighlightResponse['result']) => {
      if (!running) return;
      running = false;
      clearTimeout(timeout);
      if (worker.current) {
        worker.current.onmessage = null;
        worker.current.onerror = null;
      }
      setResolved({ id, source, language, theme, result });
    };
    const fallback = () => {
      worker.current?.terminate();
      worker.current = null;
      publish(plainHighlight(source));
    };
    const schedule = setTimeout(() => {
      running = true;
      try {
        const target = worker.current ??= new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' });
        target.onmessage = ({ data }: MessageEvent<HighlightResponse>) => {
          if (data.id === id) publish(data.result);
        };
        target.onerror = fallback;
        timeout = setTimeout(fallback, 12_000);
        target.postMessage({ id, source, language, theme } satisfies HighlightRequest);
      } catch {
        fallback();
      }
    }, 140);
    return () => {
      clearTimeout(schedule);
      clearTimeout(timeout);
      if (!running) return;
      running = false;
      worker.current?.terminate();
      worker.current = null;
    };
  }, [source, language, theme]);
  const currentTheme = resolved?.theme === theme ? resolved : undefined;
  const editorResult = source && source.length <= highlightBudget && currentTheme?.language === language ? currentTheme : undefined;
  return {
    tokens: editorResult?.source === source ? editorResult.result : undefined,
    editorResult,
    surface: currentTheme?.result.surface,
    foreground: currentTheme?.result.foreground,
  };
}
