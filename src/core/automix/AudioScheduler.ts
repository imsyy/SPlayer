import type { IExtendedAudioContext } from "@/types/audio/context";
import SchedulerWorker from "./scheduler.worker?worker";

/**
 * 音频调度器时钟源
 */
export type AudioSchedulerClockSource = "worker" | "main";

/**
 * 音频调度器选项
 */
export type AudioSchedulerOptions = {
  intervalMs?: number;
  scheduleHorizonSec?: number;
};

/**
 * 调度任务类型
 */
type ScheduledJobKind = "schedule" | "run";

/**
 * 调度任务
 */
type ScheduledJob = {
  /** 任务ID */
  id: string;
  /** 任务组ID */
  groupId: string;
  /** 任务时间 */
  time: number;
  /** 任务类型 */
  kind: ScheduledJobKind;
  /** 任务是否已取消 */
  cancelled: boolean;
  action: (when: number) => void;
  cleanup?: () => void;
};

/**
 * 音频调度器
 */
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

  /**
   * 获取时钟源
   * @returns 时钟源
   */
  public getClockSource(): AudioSchedulerClockSource {
    return this.clockSource;
  }

  /**
   * 设置 tick 处理程序
   * @param handler tick 处理程序
   */
  public setTickHandler(handler: (() => void) | null): void {
    this.tickHandler = handler;
  }

  /**
   * 启动调度器
   */
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

  /**
   * 停止调度器
   */
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

  /**
   * 创建任务组ID
   * @param prefix 任务组ID前缀
   * @returns 任务组ID
   */
  public createGroupId(prefix = "g"): string {
    this.groupCounter += 1;
    return `${prefix}-${this.groupCounter}`;
  }

  /**
   * 调度任务
   * @param groupId 任务组ID
   * @param time 任务时间
   * @param action 任务动作
   * @param cleanup 任务清理
   * @returns 任务ID
   */
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

  /**
   * 立即执行任务
   * @param groupId 任务组ID
   * @param time 任务时间
   * @param action 任务动作
   * @param cleanup 任务清理
   * @returns 任务ID
   */
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

  /**
   * 取消任务
   * @param id 任务ID
   */
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

  /**
   * 清除任务组
   * @param groupId 任务组ID
   */
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

  /**
   * 清除所有任务
   */
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

  /**
   * tick 处理
   */
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
