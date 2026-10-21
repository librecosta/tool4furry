import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { deliverySnapshot, deliveryState } from './delivery';
import type { ConverterSession, ConverterView } from './session';
import type { converterMessages } from './messages';
import { converterStyles as s } from './converter.styles';

export function BatchDownload({
  session,
  view,
  blocked,
  t,
}: {
  session: ConverterSession;
  view: ConverterView;
  blocked: boolean;
  t: (typeof converterMessages)['cn'];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'budget' | 'changed' | 'failed'>();
  const job = useRef<{ controller: AbortController; current: () => boolean }>(
    undefined,
  );
  const live = useRef(true);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const temporary = useRef<{
    url: string;
    timer: ReturnType<typeof setTimeout>;
  }>(undefined);
  const release = () => {
    if (temporary.current) {
      clearTimeout(temporary.current.timer);
      session.resources.revoke(temporary.current.url);
      temporary.current = undefined;
    }
  };
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      job.current?.controller.abort();
      release();
    };
  }, [session]);
  useEffect(() => {
    if (job.current && (blocked || !job.current.current()))
      job.current.controller.abort();
  }, [view, blocked]);
  useEffect(() => setError(undefined), [view.batch.id]);
  const state = deliveryState(session);
  if (view.tasks.length < 2) return null;
  const start = async () => {
    if (job.current || blockedRef.current) return;
    const snapshot = deliverySnapshot(session);
    if (!snapshot) return;
    const controller = new AbortController();
    job.current = { controller, current: snapshot.current };
    setBusy(true);
    setError(undefined);
    release();
    try {
      // fflate and all ZIP construction code are absent until this explicit action.
      const { packZip } = await import('./zip');
      const blob = await packZip(snapshot.entries, controller.signal);
      if (
        !live.current ||
        controller.signal.aborted ||
        blockedRef.current ||
        !snapshot.current()
      )
        throw new Error('changed');
      const url = session.resources.url(blob);
      temporary.current = { url, timer: setTimeout(release, 1000) };
      const link = document.createElement('a');
      link.href = url;
      link.download = snapshot.filename;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } catch (failure) {
      release();
      if (live.current)
        setError(
          controller.signal.aborted ||
            !snapshot.current() ||
            (failure instanceof Error && failure.message === 'changed')
            ? 'changed'
            : failure instanceof Error && failure.message === 'budget'
              ? 'budget'
              : 'failed',
        );
    } finally {
      job.current = undefined;
      if (live.current) setBusy(false);
    }
  };
  const reason = state.pending
    ? t.zip.wait
    : blocked
      ? t.zip.settings
      : !state.allowed
        ? t.zip.empty
        : `${t.zip.success} ${state.entries.length} · ${t.zip.failedCount} ${state.failed}`;
  return (
    <div {...stylex.props(s.delivery)}>
      <Button
        disabled={busy || blocked || !state.allowed}
        onClick={start}
        aria-busy={busy || undefined}
        aria-describedby="converter-zip-status"
      >
        {busy ? t.zip.packing : error ? t.zip.retry : t.zip.download}
      </Button>
      <p id="converter-zip-status" role="status" {...stylex.props(s.note)}>
        {reason}
      </p>
      {error && (
        <p role="alert" {...stylex.props(s.error)}>
          {t.zip[error]}
        </p>
      )}
    </div>
  );
}
