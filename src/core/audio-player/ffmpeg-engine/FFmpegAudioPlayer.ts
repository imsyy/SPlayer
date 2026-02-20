import { toError } from "@/utils/error";
import { type GetDetail } from "@/utils/TypedEventTarget";
import { AudioErrorCode, BaseAudioPlayer, type AudioEventMap } from "../BaseAudioPlayer";
import { EngineCapabilities } from "../IPlaybackEngine";
import FFmpegWorker from "./ffmpeg.worker?worker";
import { SharedRingBuffer } from "./SharedRingBuffer";
import type { AudioMetadata, PlayerState, WorkerRequest, WorkerResponse } from "./types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const HIGH_WATER_MARK = 30;
const LOW_WATER_MARK = 10;
const IDX_SEEK_GEN = 4;

/**
 * 基于 FFmpeg WASM 的音频播放器实现
 *
 * 使用 Web Worker 在后台进行音频解码，支持更多音频格式（如 FLAC、ALAC 等）。
 * 解码后的 PCM 数据通过 AudioBufferSourceNode 播放。
 */
export class FFmpegAudioPlayer extends BaseAudioPlayer {
  /** 解码 Worker 实例 */
  private worker: Worker | null = null;
  /** 音频元数据 */
  private metadata: AudioMetadata | null = null;

  /** 当前播放器状态 */
  private playerState: PlayerState = "idle";
  /** 下一个 AudioBufferSourceNode 的开始时间 */
  private nextStartTime = 0;
  /** Worker 是否暂停（用于缓冲区管理） */
  private isWorkerPaused = false;
  /** 当前正在播放的 AudioBufferSourceNode 实例 */
  private activeSources: AudioBufferSourceNode[] = [];
  /** 解码是否已完成 */
  private isDecodingFinished = false;
  /** 当前播放速率 */
  private currentTempo = 1.0;

  /** 锚点时刻的 AudioContext 时间 */
  private anchorWallTime = 0;
  /** 锚点时刻的 音频资源 时间（00:00） */
  private anchorSourceTime = 0;

  /** 时间更新定时器 ID */
  private timeUpdateIntervalId: ReturnType<typeof setInterval> | null = null;

  /** 共享环形缓冲区 */
  private ringBuffer: SharedRingBuffer | null = null;
  /** 共享内存的头部（用于同步） */
  private sabHeader: Int32Array | null = null;
  /** Fetch 请求的 AbortController */
  private fetchController: AbortController | null = null;
  /** 是否为流式加载 */
  private isStreaming = false;
  /** 当前加载的 URL */
  private currentUrl: string | null = null;
  /** 文件总大小 */
  private fileSize = 0;

  /** 消息 ID 计数器 */
  private msgIdCounter = 0;

  /**
   * 是否正在等待 Seek 完成，
   * 用于丢弃 Worker 在 Seek 完成前发来的旧数据
   */
  // TODO: 或许应该给 load 方法添加一个开始时间参数
  private isPendingSeek = false;

  private pendingRequests = new Map<
    number,
    {
      resolve: (value?: unknown) => void;
      reject: (reason?: Error) => void;
      timer: number;
    }
  >();

  public readonly capabilities: EngineCapabilities = {
    supportsRate: true,
    supportsSinkId: true,
    supportsEqualizer: true,
    supportsSpectrum: true,
  };

  constructor() {
    super();
  }

  public get state() {
    return this.playerState;
  }
  public get duration() {
    return this.metadata?.duration || 0;
  }
  public get currentTime() {
    if (!this.audioCtx) return 0;
    const wallDelta = this.audioCtx.currentTime - this.anchorWallTime;
    const currentPosition = this.anchorSourceTime + wallDelta * this.currentTempo;
    return Math.max(0, currentPosition);
  }

  public get audioInfo() {
    return this.metadata;
  }

  public get src(): string {
    return this.currentUrl || "";
  }

  public get paused(): boolean {
    return (
      this.playerState === "paused" ||
      this.playerState === "idle" ||
      this.playerState === "error" ||
      this.playerState === "ready"
    );
  }

  public getErrorCode(): number {
    return 0;
  }

  private requestWorker<T = void>(
    msg: DistributiveOmit<WorkerRequest, "id">,
    transfer: Transferable[] = [],
    timeoutMs = 5000,
  ): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker not initialized"));
    }

    const id = ++this.msgIdCounter;
    const requestPayload = { ...msg, id } as WorkerRequest;

    return new Promise<T>((resolve, reject) => {
      const timer = self.setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Worker request timed out (type: ${msg.type}, id: ${id})`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value?: unknown) => void,
        reject: reject as (reason?: Error) => void,
        timer,
      });

      this.worker?.postMessage(requestPayload, transfer);
    });
  }

  public async load(url: string | File) {
    this.reset();
    this.dispatch("loadstart");

    this.init();
    if (this.audioCtx && this.audioCtx.state === "running") {
      await this.audioCtx.suspend().catch(() => undefined);
    }

    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      this.worker = new FFmpegWorker();
      let file: File | null = url instanceof File ? url : null;

      if (typeof url === "string" && url.startsWith("file://")) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load local file: ${response.statusText}`);
        }
        const blob = await response.blob();
        const fileName = url.split("/").pop() || "unknown.audio";
        file = new File([blob], fileName, { type: blob.type });
      }

      if (file) {
        this.currentUrl = `local://${file.name}`;
        this.setupWorkerListeners();
        this.isStreaming = false;
        await this.requestWorker({
          type: "INIT",
          file: file,
          chunkSize: 4096 * 8,
        });
        this.isWorkerPaused = true;
        await this.requestWorker({ type: "PAUSE" }).catch(() => {
          this.isWorkerPaused = false;
        });
      } else {
        await this.loadSrc(url as string);
      }
    } catch (e) {
      const err = toError(e);
      console.error("[Player] Load error:", err);
      this.dispatch("error", {
        originalEvent: new Event("error"),
        errorCode: AudioErrorCode.DECODE,
      });
    }
  }

  private async loadSrc(url: string) {
    this.reset();
    this.dispatch("loadstart");
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      const contentLength = response.headers.get("Content-Length");
      if (!contentLength) {
        throw new Error("Content-Length header is missing");
      }

      this.fileSize = parseInt(contentLength, 10);
      this.currentUrl = url;

      const BUFFER_SIZE = 2 * 1024 * 1024;
      this.ringBuffer = SharedRingBuffer.create(BUFFER_SIZE);

      const sab = this.ringBuffer.sharedArrayBuffer;
      this.sabHeader = new Int32Array(sab, 0, IDX_SEEK_GEN + 1);

      this.setupWorkerListeners();
      this.isStreaming = true;

      const initWorkerPromise = this.requestWorker({
        type: "INIT_STREAM",
        fileSize: this.fileSize,
        sab: sab,
        chunkSize: 4096 * 8,
      });

      this.runFetchLoop(url, 0, this.fileSize);
      await initWorkerPromise;
      this.isWorkerPaused = true;
      await this.requestWorker({ type: "PAUSE" }).catch(() => {
        this.isWorkerPaused = false;
      });
    } catch (e) {
      const err = toError(e);
      console.error("[Player] LoadSrc error:", err);
      this.dispatch("error", { originalEvent: new Event("error"), errorCode: 2 });
    }
  }

  /**
   * 当音频图谱初始化完成时调用
   * FFmpeg 播放器不需要额外的初始化操作
   */
  protected onGraphInitialized(): void {}

  private async runFetchLoop(url: string, startOffset: number, totalSize: number) {
    if (this.fetchController) {
      this.fetchController.abort();
    }
    this.fetchController = new AbortController();
    const signal = this.fetchController.signal;

    if (startOffset >= totalSize) {
      this.ringBuffer?.setEOF();
      this.notifyWorkerSeek();
      return;
    }

    try {
      const safeStartOffset = Math.floor(startOffset);
      const response = await fetch(url, {
        headers: {
          Range: `bytes=${safeStartOffset}-`,
        },
        signal,
      });

      if (response.status === 416) {
        this.ringBuffer?.setEOF();
        this.notifyWorkerSeek();
        return;
      }

      if (!response.ok && response.status !== 206) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) throw new Error("Response body is null");

      const reader = response.body.getReader();

      this.notifyWorkerSeek();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.ringBuffer?.setEOF();
          break;
        }

        if (value && this.ringBuffer) {
          await this.ringBuffer.write(value);
        }

        if (signal.aborted) break;
      }
    } catch (e) {
      const err = toError(e);
      if (err.name === "AbortError") {
        return;
      } else {
        console.error("[Player] Stream error:", err);
        this.dispatch("error", { originalEvent: new Event("error"), errorCode: 2 });
      }
    }
  }

  protected async doPlay(): Promise<void> {
    this.dispatch("play");
    if (this.worker && this.isWorkerPaused) {
      this.isWorkerPaused = false;
      await this.requestWorker({ type: "RESUME" }).catch(() => {
        this.isWorkerPaused = true;
      });
    }
    this.dispatch("playing");
    this.startTimeUpdate();
  }

  protected async doPause(): Promise<void> {
    this.dispatch("pause");
    this.stopTimeUpdate();
    if (this.worker) {
      this.isWorkerPaused = true;
      await this.requestWorker({ type: "PAUSE" }).catch(() => {
        this.isWorkerPaused = false;
      });
    }
  }

  protected async doSeek(time: number): Promise<void> {
    if (!this.worker) return;
    this.dispatch("seeking");
    this.stopActiveSources();
    this.activeSources = [];
    this.isDecodingFinished = false;
    this.isPendingSeek = true;

    await this.requestWorker({
      type: "SEEK",
      seekTime: time,
    });

    this.dispatch("timeupdate");
  }

  public setRate(value: number): void {
    this.setTempo(value).catch((e) => {
      if (e.message !== "Player reset") {
        console.warn("[FFmpegAudioPlayer] setTempo failed:", e);
      }
    });
  }

  public getRate(): number {
    return this.currentTempo;
  }

  public async setTempo(tempo: number) {
    if (!this.worker) return;
    const trueTime = this.currentTime;
    await this.requestWorker({ type: "SET_TEMPO", value: tempo });
    this.currentTempo = tempo;
    await this.seek(trueTime, true);
  }

  protected async doSetSinkId(_deviceId: string): Promise<void> {
    return Promise.resolve();
  }

  private setupWorkerListeners() {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const resp = event.data;
      const msgId = resp.id;

      if (this.pendingRequests.has(msgId)) {
        // biome-ignore lint/style/noNonNullAssertion: 肯定有
        const req = this.pendingRequests.get(msgId)!;
        clearTimeout(req.timer);
        let isHandled = false;

        if (resp.type === "ERROR") {
          req.reject(new Error(resp.error));
          this.pendingRequests.delete(msgId);
          return;
        }

        if (resp.type === "ACK") {
          req.resolve();
          isHandled = true;
        } else if (resp.type === "SEEK_DONE") {
          req.resolve();
          isHandled = true;
        } else if (resp.type === "EXPORT_WAV_DONE") {
          req.resolve(resp.blob);
          isHandled = true;
        }

        if (isHandled) {
          this.pendingRequests.delete(msgId);
          if (resp.type === "ACK" || resp.type === "EXPORT_WAV_DONE") {
            return;
          }
        }
      }

      if (resp.type === "SEEK_NET") {
        if (this.isStreaming && this.ringBuffer && this.currentUrl) {
          if (this.fetchController) {
            this.fetchController.abort();
          }
          this.ringBuffer.reset();
          this.runFetchLoop(this.currentUrl, resp.seekOffset, this.fileSize);
        }
        return;
      }

      switch (resp.type) {
        case "ERROR":
          this.dispatch("error", { originalEvent: new Event("error"), errorCode: 3 });
          break;
        case "METADATA":
          this.metadata = {
            sampleRate: resp.sampleRate,
            channels: resp.channels,
            duration: resp.duration,
            metadata: resp.metadata,
            encoding: resp.encoding,
            coverUrl: resp.coverUrl,
            bitsPerSample: resp.bitsPerSample,
          };
          if (this.audioCtx) {
            const now = this.audioCtx.currentTime;
            this.syncTimeAnchor(now, 0);
            this.nextStartTime = now;
          }
          this.dispatch("canplay");
          break;
        case "CHUNK":
          if (this.isPendingSeek) {
            // console.warn("丢弃了一块过时音频");
            return;
          }
          if (this.metadata) {
            this.scheduleChunk(
              resp.data,
              this.metadata.sampleRate,
              this.metadata.channels,
              resp.startTime,
            );

            if (this.audioCtx) {
              const bufferedDuration = this.nextStartTime - this.audioCtx.currentTime;
              if (bufferedDuration > HIGH_WATER_MARK && !this.isWorkerPaused) {
                this.isWorkerPaused = true;
                this.requestWorker({
                  type: "PAUSE",
                }).catch((e) => {
                  console.error("[Player] Failed to pause worker for high water mark:", e);
                  this.isWorkerPaused = false;
                });
              }
            }
          }
          break;
        case "EOF":
          this.isDecodingFinished = true;
          this.checkIfEnded();
          break;
        case "SEEK_DONE":
          this.isPendingSeek = false;
          if (this.audioCtx) {
            const now = this.audioCtx.currentTime;
            this.isWorkerPaused = false;
            this.nextStartTime = now;
            this.syncTimeAnchor(now, resp.time);
          }
          this.dispatch("seeked");
          break;
      }
    };
  }

  private notifyWorkerSeek() {
    if (this.sabHeader) {
      Atomics.add(this.sabHeader, IDX_SEEK_GEN, 1);
      Atomics.notify(this.sabHeader, IDX_SEEK_GEN, 1);
    }
  }

  private scheduleChunk(
    planarData: Float32Array,
    sampleRate: number,
    channels: number,
    chunkStartTime: number,
  ) {
    if (!this.audioCtx || !this.inputNode) return;
    const ctx = this.audioCtx;

    const safeChannels = channels || 1;
    const frameCount = planarData.length / safeChannels;

    const audioBuffer = ctx.createBuffer(safeChannels, frameCount, sampleRate);

    for (let ch = 0; ch < safeChannels; ch++) {
      const chData = audioBuffer.getChannelData(ch);
      const start = ch * frameCount;
      chData.set(planarData.subarray(start, start + frameCount));
    }

    const now = this.audioCtx.currentTime;

    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }

    this.syncTimeAnchor(this.nextStartTime, chunkStartTime);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.inputNode);

    source.start(this.nextStartTime);

    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);

    source.onended = () => {
      const index = this.activeSources.indexOf(source);
      if (index !== -1) {
        this.activeSources.splice(index, 1);
      }

      if (this.audioCtx && !this.isDecodingFinished) {
        const bufferedDuration = this.nextStartTime - this.audioCtx.currentTime;
        if (bufferedDuration < LOW_WATER_MARK && this.isWorkerPaused) {
          this.isWorkerPaused = false;
          this.requestWorker({ type: "RESUME" }).catch((err) => {
            console.error("[Player] Failed to resume worker for low water mark:", err);
            this.isWorkerPaused = true;
          });
        }
      }

      if (this.activeSources.length === 0) {
        if (this.isDecodingFinished) {
          this.checkIfEnded();
        } else if (this.playerState === "playing") {
          this.dispatch("waiting");
        }
      }

      this.checkIfEnded();
    };
  }

  private checkIfEnded() {
    if (this.state !== "playing") return;
    if (this.activeSources.length > 0) return;
    if (!this.isDecodingFinished) return;

    this.dispatch("ended");
  }

  private syncTimeAnchor(wallTime: number, sourceTime: number) {
    this.anchorWallTime = wallTime;
    this.anchorSourceTime = sourceTime;
  }

  private stopActiveSources() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    this.activeSources = [];
  }

  private startTimeUpdate() {
    this.stopTimeUpdate();
    this.timeUpdateIntervalId = setInterval(() => {
      if (this.state === "playing") {
        this.dispatch("timeupdate");
      }
    }, 250);
  }

  private stopTimeUpdate() {
    if (this.timeUpdateIntervalId !== null) {
      clearInterval(this.timeUpdateIntervalId);
      this.timeUpdateIntervalId = null;
    }
  }

  public override dispatch<K extends keyof AudioEventMap>(
    type: K,
    ...args: GetDetail<AudioEventMap[K]> extends undefined
      ? [detail?: GetDetail<AudioEventMap[K]>]
      : [detail: GetDetail<AudioEventMap[K]>]
  ): boolean {
    switch (type) {
      case "loadstart":
        this.playerState = "loading";
        break;
      case "canplay":
        if (this.playerState !== "playing" && this.playerState !== "error") {
          this.playerState = "ready";
        }
        break;
      case "playing":
        this.playerState = "playing";
        break;
      case "pause":
        this.playerState = "paused";
        break;
      case "ended":
        this.playerState = "idle";
        break;
      case "error":
        this.playerState = "error";
        break;
      case "emptied":
        this.playerState = "idle";
        break;
    }
    return super.dispatch(type, ...args);
  }

  private reset() {
    this.stopTimeUpdate();
    this.audioCtx?.suspend();
    this.stopActiveSources();
    this.activeSources = [];

    for (const req of this.pendingRequests.values()) {
      clearTimeout(req.timer);
      req.reject(new Error("Player reset"));
    }
    this.pendingRequests.clear();

    this.metadata = null;
    this.isWorkerPaused = false;
    this.isDecodingFinished = false;
    this.nextStartTime = this.audioCtx ? this.audioCtx.currentTime : 0;
    this.isPendingSeek = false;

    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = null;
    }
    this.isStreaming = false;
    this.ringBuffer = null;
    this.sabHeader = null;

    this.dispatch("emptied");
  }

  public override destroy() {
    this.reset();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    super.destroy();
  }
}
