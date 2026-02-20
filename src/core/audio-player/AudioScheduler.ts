import type { IExtendedAudioContext } from "./BaseAudioPlayer";

import SchedulerWorker from "./scheduler.worker?worker";

export type AudioSchedulerClockSource = "worker" | "main";

export type AudioSchedulerOptions = {
  intervalMs?: number;
  scheduleHorizonSec?: number;
};

type ScheduledJobKind = "schedule" | "run";

type ScheduledJob = {
  id: string;
  groupId: string;
  time: number;
  kind: ScheduledJobKind;
  cancelled: boolean;
  action: (when: number) => void;
  cleanup?: () => void;
};

export class AudioScheduler {
  private readonly intervalMs: number;
  private readonly scheduleHorizonSec: number;

  private tickTimer: number | null = null;
  private worker: Worker | null = null;
  private clockSource: AudioSchedulerClockSource = "main";

  private idCounter = 0;
  private groupCounter = 0;
  private readonly jobs = new Map<string, ScheduledJob>();
  private tickHandler: (() => void) | null = null;

  public constructor(
    private readonly audioContext: IExtendedAudioContext,
    opts: AudioSchedulerOptions = {},
  ) {
    this.intervalMs = opts.intervalMs ?? 75;
    this.scheduleHorizonSec = opts.scheduleHorizonSec ?? 1.5;
  }

  public getClockSource(): AudioSchedulerClockSource {
    return this.clockSource;
  }

  public setTickHandler(handler: (() => void) | null): void {
    this.tickHandler = handler;
  }

  public start(): void {
    this.stop();

    try {
      this.worker = new SchedulerWorker();
      this.worker.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as { type?: string } | undefined;
        if (msg?.type !== "TICK") return;
        this.tick();
      };
      this.worker.postMessage({ type: "START", intervalMs: this.intervalMs });
      this.clockSource = "worker";
      return;
    } catch {
      this.worker = null;
    }

    this.tickTimer = self.setInterval(() => this.tick(), this.intervalMs);
    this.clockSource = "main";
  }

  public stop(): void {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: "STOP" });
      } catch (e) {
        void e;
      }
      this.worker.terminate();
      this.worker = null;
    }
    if (this.tickTimer !== null) {
      self.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.clockSource = "main";
  }

  public createGroupId(prefix = "g"): string {
    this.groupCounter += 1;
    return `${prefix}-${this.groupCounter}`;
  }

  public scheduleAt(
    groupId: string,
    time: number,
    action: (when: number) => void,
    cleanup?: () => void,
  ): string {
    this.idCounter += 1;
    const id = `${groupId}-${this.idCounter}`;
    this.jobs.set(id, {
      id,
      groupId,
      time,
      kind: "schedule",
      action,
      cleanup,
      cancelled: false,
    });
    return id;
  }

  public runAt(
    groupId: string,
    time: number,
    action: (when: number) => void,
    cleanup?: () => void,
  ): string {
    this.idCounter += 1;
    const id = `${groupId}-${this.idCounter}`;
    this.jobs.set(id, {
      id,
      groupId,
      time,
      kind: "run",
      action,
      cleanup,
      cancelled: false,
    });
    return id;
  }

  public cancelJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.cancelled = true;
    try {
      job.cleanup?.();
    } finally {
      this.jobs.delete(id);
    }
  }

  public clearGroup(groupId: string): void {
    for (const job of this.jobs.values()) {
      if (job.groupId !== groupId) continue;
      job.cancelled = true;
      try {
        job.cleanup?.();
      } catch (e) {
        void e;
      }
      this.jobs.delete(job.id);
    }
  }

  public clearAll(): void {
    for (const job of this.jobs.values()) {
      job.cancelled = true;
      try {
        job.cleanup?.();
      } catch (e) {
        void e;
      }
    }
    this.jobs.clear();
  }

  private tick(): void {
    this.tickHandler?.();
    const now = this.audioContext.currentTime;
    const horizon = now + this.scheduleHorizonSec;

    for (const job of this.jobs.values()) {
      if (job.cancelled) continue;
      if (job.kind === "schedule") {
        if (job.time > horizon) continue;
        try {
          job.action(job.time);
        } catch {
          this.cancelJob(job.id);
          continue;
        }
        this.jobs.delete(job.id);
      } else if (job.kind === "run") {
        if (job.time > now) continue;
        try {
          job.action(job.time);
        } catch {
          this.cancelJob(job.id);
          continue;
        }
        this.jobs.delete(job.id);
      }
    }
  }
}
