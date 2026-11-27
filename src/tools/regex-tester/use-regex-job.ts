import { useCallback, useEffect, useRef, useState } from 'react';
import { runRegex } from './client';
import { limits, RegexIssue, type Issue, type RegexRequest, type RegexResult } from './protocol';

type RunState =
  | { status: 'idle' | 'waiting' | 'running' | 'cancelled' }
  | { status: 'error'; issue: Issue }
  | { status: 'result'; result: RegexResult };

export function useRegexJob(request: RegexRequest | undefined, live: boolean) {
  const [record, setRecord] = useState<{ request: RegexRequest; state: RunState }>();
  const active = useRef<{ controller: AbortController; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const stop = useCallback(() => {
    if (!active.current) return;
    clearTimeout(active.current.timer);
    active.current.controller.abort();
    active.current = null;
  }, []);

  const start = useCallback((delay: number, timeout: number) => {
    stop();
    if (!request) return;
    const controller = new AbortController();
    const update = (state: RunState) => setRecord({ request, state });
    const execute = () => {
      update({ status: 'running' });
      void runRegex(request, controller.signal, timeout).then(
        result => { if (!controller.signal.aborted) update({ status: 'result', result }); },
        error => {
          if (!controller.signal.aborted)
            update({ status: 'error', issue: error instanceof RegexIssue ? error.issue : { code: 'worker' } });
        },
      ).finally(() => { if (active.current?.controller === controller) active.current = null; });
    };
    active.current = { controller };
    if (delay) {
      update({ status: 'waiting' });
      active.current.timer = setTimeout(execute, delay);
    } else execute();
  }, [request, stop]);

  useEffect(() => {
    if (live && request) start(240, limits.defaultTimeout);
    return stop;
  }, [request, live, start, stop]);

  const run = useCallback((timeout: number) => start(0, timeout), [start]);
  let state: RunState = { status: request && live ? 'waiting' : 'idle' };
  if (request && record?.request === request) {
    state = record.state;
    if (!live && !active.current && (state.status === 'waiting' || state.status === 'running')) state = { status: 'idle' };
  }
  return {
    state,
    run,
    cancel: () => {
      stop();
      if (request) setRecord({ request, state: { status: 'cancelled' } });
    },
  };
}
