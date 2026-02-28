import { getSharedAudioContext } from "../automix/SharedAudioContext";
import { AudioBufferPlayer } from "./AudioBufferPlayer";

/**
 * 无缝播放管理器
 *
 * 管理预解码 → 调度 → 提交 → 清除的完整生命周期
 * 通过预解码下一首歌曲的 AudioBuffer 并精确调度实现无缝衔接
 */
class GaplessManager {
  /** 预载的 AudioBufferPlayer */
  private player: AudioBufferPlayer | null = null;
  /** 当前预载的 URL */
  private _url: string | null = null;
  /** 预载对应的播放列表索引 */
  private _nextIndex: number = -1;
  /** 是否正在预载中 */
  private _isPreloading = false;
  /** 是否已就绪（解码完成） */
  private _isReady = false;
  /** 是否已调度播放 */
  private _isScheduled = false;
  /** 用于取消 fetch 的 AbortController */
  private abortController: AbortController | null = null;

  /** 当前预载的 URL */
  get url() {
    return this._url;
  }

  /** 预载对应的下一首索引 */
  get nextIndex() {
    return this._nextIndex;
  }

  /** 是否正在预载中 */
  get isPreloading() {
    return this._isPreloading;
  }

  /** 是否已就绪 */
  get isReady() {
    return this._isReady;
  }

  /** 是否已调度 */
  get isScheduled() {
    return this._isScheduled;
  }

  /**
   * 预载下一首歌曲
   * fetch 音频数据 → decodeAudioData → 创建 AudioBufferPlayer
   * @param url 音频 URL
   * @param nextIndex 下一首在播放列表中的索引
   */
  async preload(url: string, nextIndex: number, songName?: string) {
    // 如果已经在预载相同 URL，跳过
    if (this._url === url && (this._isReady || this._isPreloading)) {
      return;
    }

    // 清除之前的预载
    this.clear();

    this._url = url;
    this._nextIndex = nextIndex;
    this._isPreloading = true;

    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      const label = songName ? `"${songName}"` : `index=${nextIndex}`;
      console.log(`[GaplessManager] 开始预载: ${label}`);

      const response = await fetch(url, {
        signal: abortController.signal,
      });

      // 检查是否已取消
      if (abortController.signal.aborted) return;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const rawSize = arrayBuffer.byteLength;

      // 再次检查是否已取消
      if (abortController.signal.aborted) return;

      const audioCtx = getSharedAudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // 最后检查是否已取消
      if (abortController.signal.aborted) return;

      // 创建 AudioBufferPlayer
      const player = new AudioBufferPlayer();
      player.init();
      player.setBuffer(audioBuffer);

      this.player = player;
      this._isReady = true;
      this._isPreloading = false;

      // 计算解码后 PCM 内存占用
      const pcmBytes = audioBuffer.length * audioBuffer.numberOfChannels * 4; // Float32 = 4 bytes

      console.log(
        `[GaplessManager] 预载完成: ${label}, duration=${audioBuffer.duration.toFixed(1)}s, raw=${(rawSize / 1024 / 1024).toFixed(1)}MB, pcm=${(pcmBytes / 1024 / 1024).toFixed(1)}MB`,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        console.log("[GaplessManager] 预载已取消");
      } else {
        console.warn("[GaplessManager] 预载失败:", e);
      }
      this._isPreloading = false;
      // 预载失败不影响正常播放，保留 url 和 nextIndex 供外部判断
    }
  }

  /**
   * 调度无缝过渡
   * 在当前歌曲即将结束时，精确调度下一首的 AudioBufferSourceNode
   * @param remaining 当前歌曲剩余时间（秒）
   * @param volume 当前音量（0-1）
   */
  schedule(remaining: number, volume: number) {
    if (!this._isReady || this._isScheduled || !this.player) return;

    const audioCtx = getSharedAudioContext();
    const when = audioCtx.currentTime + remaining;

    // 直接操作 gainNode.gain 设置音量，不调用 setVolume 避免污染 volume 字段
    if (this.player["gainNode"]) {
      const gainNode = this.player["gainNode"] as GainNode;
      gainNode.gain.setValueAtTime(volume, when);
    }

    // 精确调度
    this.player.scheduleStart(0, when);
    this._isScheduled = true;

    console.log(
      `[GaplessManager] 已调度过渡: remaining=${remaining.toFixed(2)}s, when=${when.toFixed(3)}`,
    );
  }

  /**
   * 提交无缝过渡
   * 返回 AudioBufferPlayer，调用方接管其生命周期
   * @returns AudioBufferPlayer 或 null
   */
  commit(): AudioBufferPlayer | null {
    if (!this._isScheduled || !this.player) return null;

    const player = this.player;

    // 重置状态但不 destroy player（由调用方接管）
    this.player = null;
    this._url = null;
    this._nextIndex = -1;
    this._isReady = false;
    this._isScheduled = false;
    this._isPreloading = false;
    this.abortController = null;

    console.log("[GaplessManager] 已提交过渡");
    return player;
  }

  /**
   * 取消已调度的过渡，保留预载数据
   * 用于暂停、拖动进度条等场景
   */
  cancel() {
    if (!this._isScheduled || !this.player) return;

    // 使用 keepContextRunning 暂停，不冻结共享 AudioContext
    this.player.pause({ keepContextRunning: true });
    this._isScheduled = false;

    console.log("[GaplessManager] 已取消调度");
  }

  /**
   * 完全清除：中止 fetch + 销毁 player + 重置所有状态
   * 播放列表变更、手动切歌等场景调用
   */
  clear() {
    // 中止进行中的 fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // 销毁 player
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // 忽略销毁错误
      }
      this.player = null;
    }

    // 重置所有状态
    this._url = null;
    this._nextIndex = -1;
    this._isReady = false;
    this._isScheduled = false;
    this._isPreloading = false;
  }
}

const GAPLESS_MANAGER_KEY = "__SPLAYER_GAPLESS_MANAGER__";

/**
 * 获取 GaplessManager 单例
 */
export const useGaplessManager = (): GaplessManager => {
  const win = window as Window & { [GAPLESS_MANAGER_KEY]?: GaplessManager };
  if (!win[GAPLESS_MANAGER_KEY]) {
    win[GAPLESS_MANAGER_KEY] = new GaplessManager();
  }
  return win[GAPLESS_MANAGER_KEY];
};
