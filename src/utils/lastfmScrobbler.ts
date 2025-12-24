/**
 * Last.fm Scrobbler
 * 处理 Last.fm 播放记录上报
 */

import { updateNowPlaying, scrobbleTrack } from "@/api/lastfm";
import { useSettingStore } from "@/stores";

interface ScrobbleTrack {
  name: string;
  artist: string;
  album?: string;
  duration?: number;
  timestamp: number;
}

class LastfmScrobbler {
  /** 当前播放的歌曲信息 */
  private currentTrack: ScrobbleTrack | null = null;
  /** 播放开始时间戳 */
  private playStartTime: number = 0;
  /** 是否已经 scrobble */
  private hasScrobbled: boolean = false;
  /** Scrobble 定时器 */
  private scrobbleTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 开始播放新歌曲
   * @param name 歌曲名
   * @param artist 艺术家
   * @param album 专辑名
   * @param duration 时长（秒）
   */
  public startPlaying(name: string, artist: string, album?: string, duration?: number) {
    const settingStore = useSettingStore();

    // 检查 Last.fm 是否启用
    if (!this.isEnabled()) return;

    // 清除之前的定时器
    this.clearScrobbleTimer();

    // 记录新歌曲信息
    this.currentTrack = {
      name,
      artist,
      album,
      duration,
      timestamp: Math.floor(Date.now() / 1000),
    };
    this.playStartTime = Date.now();
    this.hasScrobbled = false;

    console.log("Last.fm: 开始播放", this.currentTrack);

    // 更新正在播放状态
    if (settingStore.lastfm.nowPlayingEnabled) {
      this.updateNowPlaying();
    }

    // 设置 scrobble 定时器
    if (settingStore.lastfm.scrobbleEnabled) {
      this.scheduleScrobble();
    }
  }

  /**
   * 暂停播放
   */
  public pause() {
    // 清除 scrobble 定时器
    this.clearScrobbleTimer();
  }

  /**
   * 恢复播放
   */
  public resume() {
    const settingStore = useSettingStore();

    if (!this.isEnabled() || !this.currentTrack || this.hasScrobbled) return;

    // 重新设置 scrobble 定时器
    if (settingStore.lastfm.scrobbleEnabled) {
      this.scheduleScrobble();
    }
  }

  /**
   * 停止播放
   */
  public stop() {
    this.clearScrobbleTimer();

    // 如果歌曲播放时间足够但尚未 scrobble，则立即执行
    if (this.currentTrack && !this.hasScrobbled) {
      const settingStore = useSettingStore();
      if (settingStore.lastfm.scrobbleEnabled) {
        const playedTime = (Date.now() - this.playStartTime) / 1000;
        const duration =
          this.currentTrack?.duration && this.currentTrack.duration > 0
            ? this.currentTrack.duration
            : 0;
        // 歌曲必须长于30秒才能 scrobble
        if (duration > 30) {
          const scrobblePoint = Math.min(duration / 2, 240);
          if (playedTime >= scrobblePoint) {
            this.scrobble();
          }
        }
      }
    }

    this.currentTrack = null;
    this.hasScrobbled = false;
  }

  /**
   * 更新正在播放状态
   */
  private async updateNowPlaying() {
    const settingStore = useSettingStore();

    if (!this.currentTrack || !settingStore.lastfm.sessionKey) return;

    try {
      await updateNowPlaying(
        settingStore.lastfm.sessionKey,
        this.currentTrack.name,
        this.currentTrack.artist,
        this.currentTrack.album,
        this.currentTrack.duration,
      );
      console.log("Last.fm: 正在播放状态已更新");
    } catch (error) {
      console.error("Last.fm: 更新正在播放状态失败", error);
    }
  }

  /**
   * 设置 scrobble 定时器
   * Scrobble 条件：播放超过 4 分钟或歌曲长度的 50%（取较小值）
   */
  private scheduleScrobble() {
    if (!this.currentTrack) return;
    // 默认 4 分钟
    const duration =
      this.currentTrack?.duration && this.currentTrack.duration > 0
        ? this.currentTrack.duration
        : 240;
    // 4 分钟或歌曲长度的 50%
    const scrobbleTime = Math.min(240, duration / 2);

    // 计算已播放时间
    const playedTime = (Date.now() - this.playStartTime) / 1000;
    const remainingTime = Math.max(0, scrobbleTime - playedTime);

    console.log(`Last.fm: 将在 ${remainingTime.toFixed(1)} 秒后 scrobble`);

    this.scrobbleTimer = setTimeout(() => {
      this.scrobble();
    }, remainingTime * 1000);
  }

  /**
   * Scrobble 歌曲
   */
  private async scrobble() {
    const settingStore = useSettingStore();

    if (!this.currentTrack || !settingStore.lastfm.sessionKey || this.hasScrobbled) return;

    try {
      await scrobbleTrack(
        settingStore.lastfm.sessionKey,
        this.currentTrack.name,
        this.currentTrack.artist,
        this.currentTrack.timestamp,
        this.currentTrack.album,
        this.currentTrack.duration,
      );
      this.hasScrobbled = true;
      console.log("Last.fm: Scrobble 成功", this.currentTrack);
    } catch (error) {
      console.error("Last.fm: Scrobble 失败", error);
    }
  }

  /**
   * 清除 scrobble 定时器
   */
  private clearScrobbleTimer() {
    if (this.scrobbleTimer) {
      clearTimeout(this.scrobbleTimer);
      this.scrobbleTimer = null;
    }
  }

  /**
   * 检查 Last.fm 是否启用
   */
  private isEnabled(): boolean {
    const settingStore = useSettingStore();
    return settingStore.lastfm.enabled && Boolean(settingStore.lastfm.sessionKey);
  }
}

// 单例
const lastfmScrobbler = new LastfmScrobbler();

export default lastfmScrobbler;
