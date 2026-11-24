import { type AudioInfo, type CutPlan } from './core';
import { audioTask } from './task';

type Scheduled = { node: AudioBufferSourceNode; start: number; end: number; frame: number };

export class Audition {
  private context?: AudioContext;
  private gain?: GainNode;
  private run?: AbortController;
  private readonly queued: Scheduled[] = [];
  private animation = 0;
  private volume = 0.8;

  setVolume(volume: number) {
    this.volume = volume;
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.01);
  }

  stop() {
    this.run?.abort();
    this.run = undefined;
    cancelAnimationFrame(this.animation);
    for (const { node } of this.queued.splice(0)) {
      node.stop();
      node.disconnect();
    }
  }

  dispose() {
    this.stop();
    this.gain?.disconnect();
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.gain = undefined;
  }

  async play(file: File, info: AudioInfo, plan: CutPlan, from: number, loop: boolean,
    update: (position: number) => void, finished: () => void, failed: () => void) {
    this.stop();
    const run = this.run = new AbortController();
    const { signal } = run;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.context.destination);
      }
      const context = this.context, gain = this.gain!;
      await context.resume();
      if (signal.aborted) return;
      let done = false;
      let nextTime = 0;
      let lastUpdate = -Infinity;
      const tick = () => {
        const now = context.currentTime;
        while (this.queued[0]?.end <= now) this.queued.shift()!.node.disconnect();
        const current = this.queued[0];
        if (current && now >= current.start && now - lastUpdate >= 0.04) {
          lastUpdate = now;
          update(current.frame + Math.floor((now - current.start) * info.sampleRate));
        }
        if (done && !this.queued.length) {
          this.run = undefined;
          update(plan.frames);
          finished();
          return;
        }
        this.animation = requestAnimationFrame(tick);
      };
      this.animation = requestAnimationFrame(tick);
      await audioTask({ type: 'play', file, info, plan, from, loop }, signal, {
        samples: async (block) => {
          signal.throwIfAborted();
          const buffer = context.createBuffer(info.channels, block.size, info.sampleRate);
          block.data.forEach((channel, index) => buffer.copyToChannel(channel, index));
          const node = context.createBufferSource();
          node.buffer = buffer;
          node.connect(gain);
          const start = Math.max(nextTime, context.currentTime + 0.045);
          nextTime = start + buffer.duration;
          node.start(start);
          this.queued.push({ node, start, end: nextTime, frame: block.output });
          while (!signal.aborted && (nextTime - context.currentTime > 0.9 || this.queued.length >= 30)) {
            // Keep enough decoded audio to span ordinary scheduling delays. The worker waits for this ACK.
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        },
      });
      done = true;
    } catch {
      if (!signal.aborted) {
        this.stop();
        failed();
      }
    }
  }
}
