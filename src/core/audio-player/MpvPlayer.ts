import { getPlayerInfoObj } from "@/utils/format";
import type {
  EngineCapabilities,
  IPlaybackEngine,
  PauseOptions,
  PlayOptions,
} from "./IPlaybackEngine";

/**
 * MPV 播放器事件类型
 */
export const MPV_EVENTS = {
  PLAY: "play",
  PAUSE: "pause",
  ENDED: "ended",
  TIME_UPDATE: "timeupdate",
  ERROR: "error",
  CAN_PLAY: "canplay",
  LOAD_START: "loadstart",
} as const;

/**
 * MPV 播放器实现
 *
 * 通过 IPC 与主进程中的 MPV 播放器通信，实现统一的 IPlaybackEngine 接口
 */
export class MpvPlayer extends EventTarget implements IPlaybackEngine {
  // ========== 内部状态 ==========
  private _duration: number = 0;
  private _currentTime: number = 0;
  private _paused: boolean = true;
  private _src: string = "";
  private _volume: number = 1;
  private _rate: number = 1;
  private _errorCode: number = 0;

  /** 当前 loadfile 请求期望自动播放 */
  private autoPlayPending: boolean | null = null;
  /** 当前 loadfile 请求期望 seek（秒） */
  private seekPendingSeconds: number | null = null;
  /** 当前曲目是否已开始播放（playback-restart 后才响应 pause 变化） */
  private playbackStarted: boolean = false;
  /** 在期望暂停的场景下，强制保持 UI 暂停，直到用户主动播放 */
  private forcePaused: boolean = false;
  /** 是否已初始化 IPC 监听 */
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  // ========== IPlaybackEngine 实现 ==========

  public readonly capabilities: EngineCapabilities = {
    supportsRate: true,
    supportsSinkId: true,
    supportsEqualizer: false,
    supportsSpectrum: false,
  };

  public init(): void {
    if (this.isInitialized) return;
    if (!window?.electron?.ipcRenderer) return;

    // 防止重复注册
    window.electron.ipcRenderer.removeAllListeners("mpv-property-change");
    window.electron.ipcRenderer.removeAllListeners("mpv-file-loaded");
    window.electron.ipcRenderer.removeAllListeners("mpv-playback-restart");
    window.electron.ipcRenderer.removeAllListeners("mpv-ended");

    // 监听 MPV 属性变化
    window.electron.ipcRenderer.on(
      "mpv-property-change",
      (_: unknown, { name, value }: { name: string; value: unknown }) => {
        if (value === null || value === undefined) return;

        switch (name) {
          case "time-pos":
            if (typeof value === "number") {
              this._currentTime = value;
              this.dispatchEvent(new Event(MPV_EVENTS.TIME_UPDATE));
            }
            break;

          case "pause": {
            if (!this.playbackStarted) break;
            const isPaused = !!value;
            if (this.forcePaused) {
              this._paused = true;
              this.dispatchEvent(new Event(MPV_EVENTS.PAUSE));
              break;
            }
            this._paused = isPaused;
            this.dispatchEvent(new Event(isPaused ? MPV_EVENTS.PAUSE : MPV_EVENTS.PLAY));
            break;
          }

          case "duration":
            if (typeof value === "number") {
              this._duration = value;
            }
            break;

          case "volume":
            if (typeof value === "number") {
              this._volume = value / 100;
            }
            break;
        }
      },
    );

    // 文件加载完成
    window.electron.ipcRenderer.on("mpv-file-loaded", () => {
      this.dispatchEvent(new Event(MPV_EVENTS.CAN_PLAY));

      // file-loaded 之后处理 seek 和暂停命令
      if (this.seekPendingSeconds && this.seekPendingSeconds > 0) {
        window.electron.ipcRenderer.send("mpv-seek", this.seekPendingSeconds);
      }
      if (this.autoPlayPending === false) {
        window.electron.ipcRenderer.send("mpv-pause");
        this.forcePaused = true;
        this._paused = true;
        this.dispatchEvent(new Event(MPV_EVENTS.PAUSE));
      }
      // 清理 seek，autoPlayPending 保留到 playback-restart 决定最终状态
      this.seekPendingSeconds = null;
    });

    // 播放重启（真正开始播放）
    window.electron.ipcRenderer.on("mpv-playback-restart", () => {
      this.playbackStarted = true;

      // 决定最终状态
      if (this.forcePaused || this.autoPlayPending === false) {
        this._paused = true;
        this.dispatchEvent(new Event(MPV_EVENTS.PAUSE));
        window.electron.ipcRenderer.send("mpv-pause");
        this.forcePaused = true;
      } else {
        this._paused = false;
        this.dispatchEvent(new Event(MPV_EVENTS.PLAY));
        // 确保播放状态
        window.electron.ipcRenderer.send("mpv-resume");
        this.forcePaused = false;
      }

      // 清理 pending 标志
      this.autoPlayPending = null;
    });

    // 播放结束
    window.electron.ipcRenderer.on("mpv-ended", (_: unknown, reason: string) => {
      this.playbackStarted = false;

      if (reason === "error") {
        this._errorCode = 4; // SRC_NOT_SUPPORTED
        this.dispatchEvent(
          new CustomEvent(MPV_EVENTS.ERROR, {
            detail: { errorCode: this._errorCode, message: "MPV 播放出错" },
          }),
        );
      } else if (reason === "eof") {
        this.dispatchEvent(new Event(MPV_EVENTS.ENDED));
      }
    });

    this.isInitialized = true;
  }

  public destroy(): void {
    if (!window?.electron?.ipcRenderer) return;
    window.electron.ipcRenderer.removeAllListeners("mpv-property-change");
    window.electron.ipcRenderer.removeAllListeners("mpv-file-loaded");
    window.electron.ipcRenderer.removeAllListeners("mpv-playback-restart");
    window.electron.ipcRenderer.removeAllListeners("mpv-ended");
    this.isInitialized = false;
  }

  public async play(url?: string, options?: PlayOptions): Promise<void> {
    if (!this.isInitialized) this.init();

    const autoPlay = options?.autoPlay ?? true;

    if (url) {
      this.dispatchEvent(new Event(MPV_EVENTS.LOAD_START));

      this.autoPlayPending = autoPlay;
      // 重置播放状态
      if (autoPlay) {
        this.forcePaused = false;
      }
      this._src = url;

      // 设置期望的 seek 位置
      if (options?.seek && options.seek > 0) {
        this.seekPendingSeconds = options.seek;
      }

      const { name, artist } = getPlayerInfoObj() || {};
      const playTitle = `${name || ""} - ${artist || ""}`;

      const res = await window.electron.ipcRenderer.invoke("mpv-play", url, playTitle, autoPlay);
      if (!res?.success) {
        this._errorCode = 4;
        throw new Error(res?.error || "MPV 播放失败");
      }
    } else if (!this._paused) {
      // 如果没有 URL 且已经在播放，不做任何事
      return;
    } else {
      // 恢复播放
      await this.resume(options);
    }
  }

  public async resume(options?: { fadeIn?: boolean; fadeDuration?: number }): Promise<void> {
    // MPV 不支持渐入渐出，忽略 options
    void options;

    this.forcePaused = false;
    window.electron.ipcRenderer.send("mpv-resume");
  }

  public pause(options?: PauseOptions): void {
    // MPV 不支持渐入渐出，忽略 options
    void options;

    window.electron.ipcRenderer.send("mpv-pause");
  }

  public stop(): void {
    window.electron.ipcRenderer.send("mpv-stop");
    this._src = "";
    this._currentTime = 0;
    this._duration = 0;
    this._paused = true;
    this.playbackStarted = false;
  }

  public seek(time: number): void {
    window.electron.ipcRenderer.send("mpv-seek", time);
  }

  public setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1, value));
    window.electron.ipcRenderer.send("mpv-set-volume", this._volume * 100);
  }

  public getVolume(): number {
    return this._volume;
  }

  public setRate(rate: number): void {
    this._rate = rate;
    window.electron.ipcRenderer.send("mpv-set-rate", rate);
  }

  public getRate(): number {
    return this._rate;
  }

  public async setSinkId(deviceId: string): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke("mpv-set-audio-device", deviceId);
    if (!result?.success) {
      console.warn("MPV 设置音频设备失败:", result?.error);
    }
  }

  public getErrorCode(): number {
    return this._errorCode;
  }

  // ========== 状态属性 ==========

  public get duration(): number {
    return this._duration;
  }

  public get currentTime(): number {
    return this._currentTime;
  }

  public get paused(): boolean {
    return this._paused;
  }

  public get src(): string {
    return this._src;
  }

  // ========== MPV 特有方法 ==========

  /** 用户主动播放：解除强制暂停 */
  public clearForcePaused(): void {
    this.forcePaused = false;
  }

  /** 设置期望 Seek（秒），在 file-loaded 后执行 */
  public setPendingSeek(seconds: number | null): void {
    this.seekPendingSeconds = seconds;
  }
}

// ========== 单例管理 ==========
let instance: MpvPlayer | null = null;

export const useMpvPlayer = (): MpvPlayer => {
  if (!instance) {
    instance = new MpvPlayer();
  }
  return instance;
};
