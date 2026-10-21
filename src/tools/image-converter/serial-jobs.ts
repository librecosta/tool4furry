// One workspace, one native operation. Latest waiting job of each kind wins.
// Native Canvas/bitmap promises cannot be forcibly cancelled. A watchdog reports
// failure but NEVER frees the lane early and starts overlapping allocations.
export class SerialJobs {
  private pending = new Map<
    string,
    { run: () => Promise<void>; timeout: () => void }
  >();
  active = false;
  timedOut = false;
  disposed = false;
  maxActive = 0;
  constructor(private deadline = 45000) {}
  schedule(key: string, run: () => Promise<void>, timeout: () => void) {
    if (this.disposed) return;
    this.pending.set(key, { run, timeout });
    void this.pump();
  }
  cancel(key: string) {
    this.pending.delete(key);
  }
  dispose() {
    this.disposed = true;
    this.pending.clear();
  }
  private async pump() {
    if (this.active || this.disposed) return;
    const next = this.pending.entries().next().value;
    if (!next) return;
    const [key, job] = next;
    this.pending.delete(key);
    this.active = true;
    this.maxActive = 1;
    const timer = setTimeout(() => {
      if (this.disposed) return;
      this.timedOut = true;
      // Only this job failed. Waiting files keep their FIFO position and cannot
      // enter the native lane until the timed-out operation actually settles.
      job.timeout();
    }, this.deadline);
    try {
      await job.run();
    } finally {
      clearTimeout(timer);
      this.active = false;
      this.timedOut = false;
      void this.pump();
    }
  }
}
