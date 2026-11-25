import { useEffect, useMemo, useState } from 'react';
import type { WorkRequest, WorkResponse } from './protocol';
import type { Conversion, Source, SourcePreview, TableResult } from './settings';

type Request = { source: Source; conversion: Conversion };
type Stage = {
  request: Request;
  input?: SourcePreview;
  percent: number;
  finished?: { worker: Worker; result: TableResult };
  error?: { zh: string; en: string };
};

export function useConversion(source: Source, conversion: Conversion) {
  const [retry, setRetry] = useState(0);
  const request = useMemo(() => ({ source, conversion }), [source, conversion, retry]);
  const [stage, setStage] = useState<Stage>();
  const [cancelled, setCancelled] = useState<Request>();
  const [filePreview, setFilePreview] = useState<{ source: File; preview: SourcePreview }>();
  const stopped = cancelled === request;
  const current = stage?.request === request ? stage : undefined;
  const activeSource = typeof source === 'string' ? !!source : true;

  useEffect(() => {
    setStage(previous => previous?.request === request && !stopped ? previous : undefined);
    if (stopped || !activeSource) return;
    let worker: Worker | undefined;
    let active = true;
    const update = (change: Partial<Stage>) => {
      if (!active) return;
      setStage(previous => previous?.request === request ? { ...previous, ...change } : { request, percent: 0, ...change });
    };
    const error = () => {
      worker?.terminate();
      update({ finished: undefined, error: {
        zh: '无法启动或继续转换任务。请重试。',
        en: 'Could not start or continue conversion. Try again.',
      } });
    };
    const timer = setTimeout(() => {
      try {
        const session = new Worker(new URL('./tabular-conversion.worker.ts', import.meta.url), { type: 'module' });
        worker = session;
        session.onerror = error;
        session.onmessageerror = error;
        session.onmessage = ({ data }: MessageEvent<WorkResponse>) => {
          if (!active) return;
          if (data.type === 'input') {
            if (typeof request.source !== 'string') setFilePreview({ source: request.source, preview: data.preview });
            update({ input: data.preview });
          } else if (data.type === 'progress') update({ percent: data.percent });
          else if (data.type === 'result') update({ finished: { worker: session, result: data.result } });
          else if (data.type === 'error' && data.id === undefined) {
            session.terminate();
            update({ error: data });
          }
        };
        session.postMessage({ type: 'convert', ...request } satisfies WorkRequest);
      } catch {
        error();
      }
    }, typeof source === 'string' ? 180 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [request, stopped, activeSource, source]);

  return {
    finished: stopped ? undefined : current?.finished,
    input: current?.input ?? (filePreview?.source === source ? filePreview?.preview : undefined),
    error: stopped ? undefined : current?.error,
    percent: current?.percent ?? 0,
    busy: activeSource && !stopped && !current?.finished && !current?.error,
    stopped,
    cancel: () => setCancelled(request),
    retry: () => setRetry(value => value + 1),
  };
}
