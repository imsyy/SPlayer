import { AUDIO_EVENTS, AudioErrorCode, BaseAudioPlayer } from "../BaseAudioPlayer";
import type { EngineCapabilities } from "../IPlaybackEngine";
import AudioWorker from "./audio.worker?worker";
import type { AudioMetadata, PlayerState, WorkerResponse } from "./types";

/** 缓冲区高水位标记（秒），超过此值暂停解码 */
const HIGH_WATER_MARK = 30;
/** 缓冲区低水位标记（秒），低于此值恢复解码 */
const LOW_WATER_MARK = 10;

/**
 * 基于 FFmpeg WASM 的音频播放器实现
 *
 * 使用 Web Worker 在后台进行音频解码，支持更多音频格式（如 FLAC、ALAC 等）。
 * 解码后的 PCM 数据通过 AudioBufferSourceNode 播放。
 *
 * @remarks
 * - 不支持播放速率调节
 * - 需要完整下载音频文件后才能播放
 * - 支持 Seek 操作
 */
export class FFmpegAudioPlayer extends BaseAudioPlayer {
  /** 静态消息 ID 计数器，确保唯一性 */
  private static messageIdCounter = 0;
  /** 解码 Worker 实例 */
  private worker: Worker | null = null;
  /** 音频元数据 */
  private metadata: AudioMetadata | null = null;

  /** 当前播放器状态 */
  private playerState: PlayerState = "idle";
  /** 下一个 AudioBufferSourceNode 的开始时间 */
  private nextStartTime = 0;
  /** 时间偏移量，用于计算 currentTime */
  private timeOffset = 0;
  /** Worker 是否暂停（用于缓冲区管理） */
  private isWorkerPaused = false;
  /** 活动的 AudioBufferSourceNode 列表 */
  private activeSources: AudioBufferSourceNode[] = [];
  /** 解码是否完成 */
  private isDecodingFinished = false;
  /** 精确控制 Worker Seek 状态的标志 */
  private isWorkerSeeking = false;
  /** 暂存 Seek 目标时间，用于在 Seek 期间维持 currentTime 稳定 */
  private targetSeekTime = 0;
  /** 错误码 */
  private _errorCode: number = 0;

  /** 元数据加载成功回调 */
  private metadataResolve: (() => void) | null = null;
  /** 元数据加载失败回调 */
  private metadataReject: ((reason?: unknown) => void) | null = null;

  /** 时间更新定时器 ID */
  private timeUpdateIntervalId: ReturnType<typeof setInterval> | null = null;
  /** 当前消息 ID，用于过滤过期的 Worker 消息 */
  private currentMessageId = 0;

  /** 当前音频源地址 */
  private _src: string = "";
  /** 用于取消正在进行的 fetch 请求 */
  private abortController: AbortController | null = null;

  /** 引擎能力描述 */
  public override readonly capabilities: EngineCapabilities = {
    supportsRate: false,
    supportsSinkId: false,
    supportsEqualizer: true,
    supportsSpectrum: true,
  };

  constructor() {
    super();
  }

  /** 获取当前音频源地址 */
  public get src(): string {
    return this._src;
  }

  /** 获取音频总时长（秒） */
  public get duration() {
    return this.metadata?.duration || 0;
  }

  /**
   * 获取当前播放时间（秒）
   * 如果正在 Seek，返回目标时间以避免进度跳回
   */
  public get currentTime() {
    if (this.isWorkerSeeking) {
      return this.targetSeekTime;
    }

    if (!this.audioCtx) return 0;
    const t = this.audioCtx.currentTime - this.timeOffset;
    return Math.max(0, t);
  }

  /** 获取是否暂停状态 */
  public get paused() {
    return this.playerState !== "playing";
  }

  /**
   * 获取错误码
   * @returns 错误码 (0: 无错误, 2: NETWORK, 3: DECODE)
   */
  public getErrorCode() {
    return this._errorCode;
  }

  /** 获取音频元数据信息 */
  public get audioInfo() {
    return this.metadata;
  }

  /**
   * 当音频图谱初始化完成时调用
   * FFmpeg 播放器不需要额外的初始化操作
   */
  protected onGraphInitialized() {}

  /**
   * 加载音频资源
   *
   * 会先完整下载音频文件，然后通过 Worker 进行解码
   *
   * @param url 音频地址
   * @throws 网络错误或解码错误时抛出
   */
  public async load(url: string) {
    this._src = url;
    this.reset();

    this.playerState = "loading";
    this.emit(AUDIO_EVENTS.LOAD_START);

    // 唯一的加载 ID
    const loadId = ++FFmpegAudioPlayer.messageIdCounter;
    this.currentMessageId = loadId;

    // 取消 fetch
    this.abortController = new AbortController();

    return new Promise<void>((resolve, reject) => {
      this.metadataResolve = resolve;
      this.metadataReject = reject;

      const startLoading = async () => {
        try {
          if (!this.isInitialized) {
            this.init();
          }

          const response = await fetch(url, { signal: this.abortController?.signal });
          // 检查是否被新的 load 调用覆盖
          if (this.currentMessageId !== loadId) return;
          if (!response.ok) throw new Error(`Failed to fetch ${url}`);
          const blob = await response.blob();
          // 再次检查
          if (this.currentMessageId !== loadId) return;

          const file = new File([blob], "und", { type: blob.type });

          this.worker = new AudioWorker();
          this.setupWorkerListeners();

          if (this.worker) {
            this.worker.postMessage({
              type: "INIT",
              id: this.currentMessageId,
              file,
              chunkSize: 4096 * 8,
            });
          }
        } catch (e) {
          // 被新的 load 取消了，不需要处理
          if ((e as Error).name === "AbortError") return;
          this.cleanupLoadPromise();
          this.handleError((e as Error).message, AudioErrorCode.NETWORK);
          reject(e);
        }
      };
      startLoading();
    });
  }

  /**
   * 清理加载 Promise 引用
   */
  private cleanupLoadPromise() {
    this.metadataResolve = null;
    this.metadataReject = null;
  }

  /**
   * 执行底层播放
   * 恢复 Worker 解码并开始时间更新
   */
  protected async doPlay() {
    if (this.worker && this.isWorkerPaused) {
      this.worker.postMessage({ type: "RESUME", id: this.currentMessageId });
      this.isWorkerPaused = false;
    }

    this.setState("playing");
    this.startTimeUpdate();
  }

  /**
   * 执行底层暂停
   * 暂停 Worker 解码并停止时间更新
   */
  protected doPause() {
    this.setState("paused");
    this.stopTimeUpdate();

    if (this.worker) {
      this.worker.postMessage({ type: "PAUSE", id: this.currentMessageId });
      this.isWorkerPaused = true;
    }
  }

  /**
   * 跳转到指定时间
   * @param time 目标时间（秒）
   */
  public async seek(time: number) {
    // 如果正在 Seek (无论是等待淡出，还是正在缓冲)，强制返回目标时间以避免进度跳回
    this.isWorkerSeeking = true;
    this.targetSeekTime = time;

    await super.seek(time);
  }

  /**
   * 执行底层 Seek
   * 清空当前缓冲区并通知 Worker 跳转
   * @param time 目标时间（秒）
   */
  protected doSeek(time: number) {
    if (!this.worker || !this.audioCtx || !this.metadata) return;

    this.activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        // 忽略已停止的错误
      }
    });
    this.activeSources = [];
    this.currentMessageId = ++FFmpegAudioPlayer.messageIdCounter;

    this.worker.postMessage({
      type: "SEEK",
      id: this.currentMessageId,
      seekTime: time,
    });
    this.isDecodingFinished = false;

    this.emit(AUDIO_EVENTS.TIME_UPDATE);
  }

  /**
   * 设置播放速率
   * @param _value 速率值（不支持，会输出警告）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setRate(_value: number) {
    console.warn("[FFmpegAudioPlayer] setRate is not supported");
  }

  /**
   * 获取当前播放速率
   * @returns 始终返回 1（不支持速率调节）
   */
  public getRate() {
    console.warn("[FFmpegAudioPlayer] getRate is not supported");
    return 1;
  }

  /**
   * 设置音频输出设备
   * @param _deviceId 设备 ID（不支持，依赖基类的 AudioContext.setSinkId）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async doSetSinkId(_deviceId: string) {
    console.warn("[FFmpegAudioPlayer] doSetSinkId is not supported");
  }

  /**
   * 销毁播放器实例
   * 释放所有资源并关闭 AudioContext
   */
  public destroy() {
    this.reset();

    if (this.audioCtx) {
      this.audioCtx.close().catch(console.error);
      this.audioCtx = null;
    }
  }

  /**
   * 重置播放器状态
   * 停止 Worker、清空缓冲区、释放资源
   */
  private reset() {
    this._errorCode = 0;

    // 取消正在进行的 fetch 请求
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.metadataReject) {
      this.metadataReject(new Error("Aborted by reset"));
      this.cleanupLoadPromise();
    }

    this.stopTimeUpdate();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // 忽略已停止的错误
      }
    });
    this.activeSources = [];

    if (this.metadata && this.metadata.coverUrl) {
      URL.revokeObjectURL(this.metadata.coverUrl);
    }

    this.metadata = null;
    this.isWorkerPaused = false;
    this.isDecodingFinished = false;
    this.timeOffset = this.audioCtx ? this.audioCtx.currentTime : 0;
    this.nextStartTime = this.timeOffset;

    this.setState("idle");
  }

  /**
   * 设置播放器状态并触发相应事件
   * @param newState 新状态
   */
  private setState(newState: PlayerState) {
    if (this.playerState === newState) return;
    this.playerState = newState;

    switch (newState) {
      case "playing":
        this.emit(AUDIO_EVENTS.PLAY);
        break;
      case "paused":
        this.emit(AUDIO_EVENTS.PAUSE);
        break;
      case "loading":
        this.emit(AUDIO_EVENTS.LOAD_START);
        break;
    }
  }

  /**
   * 处理错误
   * @param msg 错误消息
   * @param code 错误码
   */
  private handleError(msg: string, code: number = AudioErrorCode.DECODE) {
    console.error("[FFmpegAudioPlayer]", msg, code);

    this._errorCode = code;

    this.setState("error");

    this.emit(AUDIO_EVENTS.ERROR, {
      originalEvent: new ErrorEvent("error", {
        message: msg,
        error: new Error(msg),
      }),
      errorCode: code,
    });
  }

  /**
   * 设置 Worker 消息监听器
   * 处理 METADATA、CHUNK、EOF、SEEK_DONE、ERROR 消息
   */
  private setupWorkerListeners() {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const resp = event.data;
      if (resp.id !== this.currentMessageId) return;

      switch (resp.type) {
        case "ERROR":
          if (this.metadataReject) {
            this.metadataReject(new Error(resp.error));
            this.cleanupLoadPromise();
          }
          this.handleError(resp.error, AudioErrorCode.DECODE);
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
            this.timeOffset = now;
            this.nextStartTime = now;
          }

          this.setState("ready");
          this.emit(AUDIO_EVENTS.CAN_PLAY);

          if (this.metadataResolve) {
            this.metadataResolve();
            this.cleanupLoadPromise();
          }

          break;
        case "CHUNK":
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
                if (this.worker) {
                  this.worker.postMessage({
                    type: "PAUSE",
                    id: this.currentMessageId,
                  });
                  this.isWorkerPaused = true;
                }
              }
            }
          }
          break;
        case "EOF":
          this.isDecodingFinished = true;
          this.checkIfEnded();
          break;
        case "SEEK_DONE":
          if (this.audioCtx) {
            const now = this.audioCtx.currentTime;
            this.isWorkerPaused = false;
            this.nextStartTime = now;
            this.timeOffset = now - resp.time;
            this.isWorkerSeeking = false;
          }
          break;
      }
    };
  }

  /**
   * 调度音频块播放
   *
   * 将解码后的 PCM 数据创建为 AudioBuffer 并调度播放
   *
   * @param planarData 平面格式的 PCM 数据
   * @param sampleRate 采样率
   * @param channels 声道数
   * @param chunkStartTime 音频块的开始时间
   */
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

    this.timeOffset = this.nextStartTime - chunkStartTime;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.inputNode);

    source.start(this.nextStartTime);

    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);

      if (this.audioCtx && !this.isDecodingFinished) {
        const bufferedDuration = this.nextStartTime - this.audioCtx.currentTime;
        if (bufferedDuration < LOW_WATER_MARK && this.isWorkerPaused) {
          if (this.worker) {
            this.worker.postMessage({ type: "RESUME", id: this.currentMessageId });
            this.isWorkerPaused = false;
          }
        }
      }

      this.checkIfEnded();
    };
  }

  /**
   * 检查是否播放结束
   * 当解码完成且所有 AudioBufferSourceNode 播放完毕时触发 ENDED 事件
   */
  private checkIfEnded() {
    if (this.playerState !== "playing") return;
    if (this.activeSources.length > 0) return;
    if (!this.isDecodingFinished) return;

    this.setState("idle");
    this.emit(AUDIO_EVENTS.ENDED);
  }

  /**
   * 启动时间更新定时器
   */
  private startTimeUpdate() {
    this.stopTimeUpdate();
    this.timeUpdateIntervalId = setInterval(() => {
      if (this.playerState === "playing" && !this.isWorkerSeeking) {
        this.emit(AUDIO_EVENTS.TIME_UPDATE);
      }
    }, 250);
  }

  /**
   * 停止时间更新定时器
   */
  private stopTimeUpdate() {
    if (this.timeUpdateIntervalId !== null) {
      clearInterval(this.timeUpdateIntervalId);
      this.timeUpdateIntervalId = null;
    }
  }
}
