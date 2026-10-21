import type { ConverterSession } from './session';

export function deliveryState(session: ConverterSession) {
  const view = session.snapshot;
  const pending = view.tasks.some((task) =>
    ['validating', 'queued', 'processing', 'stale'].includes(task.status),
  );
  const entries = [...view.tasks]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((task) => {
      const result = session.download(task.id);
      const filename = session.filename(task.id);
      return task.status === 'ready' && result && !filename.error
        ? [{ name: filename.name, blob: result.blob }]
        : [];
    });
  return {
    entries,
    failed: view.tasks.filter((task) => task.status === 'error').length,
    pending,
    allowed:
      view.tasks.length > 1 &&
      !pending &&
      entries.length > 0 &&
      !session.filename().error &&
      view.controls.validSettings,
  };
}

export function deliverySnapshot(session: ConverterSession) {
  const view = session.snapshot;
  const state = deliveryState(session);
  if (!state.allowed) return;
  return {
    entries: state.entries,
    filename: `t4f-${view.batch.time}.zip`,
    // Each Session patch publishes a new immutable view, including request versions,
    // Blobs, names and batch identity. Comparing the view also catches change-then-undo.
    current: () => session.snapshot === view,
  };
}
