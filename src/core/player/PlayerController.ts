import { AudioErrorCode } from "@/core/audio-player/BaseAudioPlayer";
import { useBlobURLManager } from "@/core/resource/BlobURLManager";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { type SongType } from "@/types/main";
import { RepeatModeType, ShuffleModeType } from "@/types/shared";
import { calculateLyricIndex } from "@/utils/calc";
import { getCoverColor } from "@/utils/color";
import { isElectron } from "@/utils/env";
import { getPlayerInfoObj, getPlaySongData } from "@/utils/format";
import { handleSongQuality, shuffleArray, sleep } from "@/utils/helper";
import lastfmScrobbler from "@/utils/lastfmScrobbler";
import { DJ_MODE_KEYWORDS } from "@/utils/meta";
import { calculateProgress } from "@/utils/time";
import { LyricLine } from "@applemusic-like-lyrics/lyric";
import { DebouncedFunc, throttle } from "lodash-es";
import { useAudioManager } from "./AudioManager";
import { useLyricManager } from "./LyricManager";
import { mediaSessionManager } from "./MediaSessionManager";
import * as playerIpc from "./PlayerIpc";
import { PlayModeManager } from "./PlayModeManager";
import { useSongManager } from "./SongManager";

/**
 * 播放器核心类
 * 职责：负责音频生命周期管理、与 AudioManager 交互、调度 Store
 */
class PlayerController {
  /** 自动关闭定时器 */
  private autoCloseInterval: ReturnType<typeof setInterval> | undefined;
  /** 最大重试次数 */
  private readonly MAX_RETRY_COUNT = 3;
  /** 当前曲目重试信息（按歌曲维度） */
  private retryInfo: { songId: number | string; count: number } = { songId: 0, count: 0 };
  /** 当前播放请求标识 */
  private currentRequestToken = 0;
  /** 连续跳过计数 */
  private failSkipCount = 0;
  /** 负责管理播放模式相关的逻辑 */
  private playModeManager = new PlayModeManager();

  private onTimeUpdate: DebouncedFunc<() => void> | null = null;
  /** 上次错误处理时间 */
  private lastErrorTime = 0;

  constructor() {
    // 初始化 AudioManager（会根据设置自动选择引擎）
    const audioManager = useAudioManager();
    const settingStore = useSettingStore();

    // 应用已保存的输出设备
    if (settingStore.playDevice) {
      audioManager.setSinkId(settingStore.playDevice).catch(console.warn);
    }

    // 监听设置变化以更新 ReplayGain
    settingStore.$subscribe((mutation) => {
      if (
        mutation.events &&
        (mutation.events as any).key &&
        ["enableReplayGain", "replayGainMode"].includes((mutation.events as any).key)
      ) {
        this.applyReplayGain();
      }
    });

    this.bindAudioEvents();
  }

  /**
   * 应用 ReplayGain (音量平衡)
   */
  private applyReplayGain() {
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    if (!settingStore.enableReplayGain) {
      audioManager.setReplayGain(1);
      return;
    }

    const song = musicStore.playSong;
    if (!song || !song.replayGain) {
      audioManager.setReplayGain(1);
      return;
    }

    const { trackGain, albumGain, trackPeak, albumPeak } = song.replayGain;
    let targetGain = 1;

    // 优先使用指定模式的增益，如果不存在则回退到另一种
    // 注意：music-metadata 提取的 gain 通常是 dB 值，需要转换，但我们在 ipc-file.ts 中使用了 .ratio
    // 如果 .ratio 存在，则直接使用线性值
    if (settingStore.replayGainMode === "album") {
      targetGain = albumGain ?? trackGain ?? 1;
    } else {
      targetGain = trackGain ?? albumGain ?? 1;
    }

    // 简单的防削波保护 (如果有峰值信息)
    // 目标: gain * peak <= 1.0
    const peak = settingStore.replayGainMode === "album" ? (albumPeak ?? trackPeak) : (trackPeak ?? albumPeak);
    if (peak && peak > 0) {
      if (targetGain * peak > 1.0) {
        targetGain = 1.0 / peak;
      }
    }

    console.log(`🔊 [ReplayGain] Applied: ${targetGain.toFixed(4)} (Mode: ${settingStore.replayGainMode})`);
    audioManager.setReplayGain(targetGain);
  }

  /**
   * 初始化并播放歌曲
   * @param options 配置
   * @param options.autoPlay 是否自动播放
   * @param options.seek 初始播放进度（毫秒）
   */
  public async playSong(
    options: { autoPlay?: boolean; seek?: number } = { autoPlay: true, seek: 0 },
  ) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    const audioManager = useAudioManager();
    const lyricManager = useLyricManager();

    // 生成新的请求标识
    this.currentRequestToken++;
    const requestToken = this.currentRequestToken;

    const { autoPlay = true, seek = 0 } = options;
    // 要播放的歌曲对象
    const playSongData = getPlaySongData();
    if (!playSongData) {
      statusStore.playLoading = false;
      // 初始化或无歌曲时
      if (!statusStore.playStatus && !autoPlay) return;
      throw new Error("SONG_NOT_FOUND");
    }

    // Fuck DJ Mode
    if (this.shouldSkipSong(playSongData)) {
      console.log(`[Fuck DJ] Skipping: ${playSongData.name}`);
      window.$message.warning(`已跳过 DJ/抖音 歌曲: ${playSongData.name}`);
      this.nextOrPrev("next");
      return;
    }

    try {
      // 停止当前播放
      audioManager.stop();
      musicStore.playSong = playSongData;

      statusStore.currentTime = options.seek ?? 0;
      const duration = this.getDuration() || statusStore.duration;
      if (duration > 0) {
        statusStore.progress = calculateProgress(statusStore.currentTime, duration);
      } else {
        statusStore.progress = 0;
      }
      statusStore.lyricIndex = -1;
      // 重置重试计数
      const sid = playSongData.type === "radio" ? playSongData.dj?.id : playSongData.id;
      if (this.retryInfo.songId !== sid) {
        this.retryInfo = { songId: sid || 0, count: 0 };
      }
      // 设置加载状态
      statusStore.playLoading = true;
      statusStore.lyricLoading = true;
      // 通知桌面歌词
      if (isElectron) {
        window.electron.ipcRenderer.send("update-desktop-lyric-data", {
          lyricLoading: true,
        });
      }
      // 获取歌词
      lyricManager.handleLyric(playSongData);
      // 获取音频
      const audioSource = await songManager.getAudioSource(playSongData);
      if (requestToken !== this.currentRequestToken) {
        console.log(`🚫 [${playSongData.id}] 请求已过期，舍弃`);
        return;
      }
      if (!audioSource.url) throw new Error("AUDIO_SOURCE_EMPTY");
      console.log(`🎧 [${playSongData.id}] 最终播放信息:`, audioSource);
      // 更新音质和解锁状态
      statusStore.songQuality = audioSource.quality;
      statusStore.playUblock = audioSource.isUnlocked ?? false;
      statusStore.audioSource = audioSource.source;
      // 执行底层播放
      await this.loadAndPlay(audioSource.url, autoPlay, seek);
      if (requestToken !== this.currentRequestToken) return;
      // 后置处理
      await this.afterPlaySetup(playSongData);
    } catch (error) {
      if (requestToken === this.currentRequestToken) {
        console.error("❌ 播放初始化失败:", error);
        this.handlePlaybackError(undefined);
      }
    }
  }

  /**
   * 切换音质（仅切换音频源，不重新加载歌词）
   * @param seek 当前播放进度（毫秒）
   * @param autoPlay 是否自动播放（默认保持当前状态）
   */
  async switchQuality(seek: number = 0, autoPlay?: boolean) {
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    const audioManager = useAudioManager();

    const playSongData = getPlaySongData();
    if (!playSongData || playSongData.path) return;

    // 如果未指定 autoPlay，则保持当前播放状态
    const shouldAutoPlay = autoPlay ?? statusStore.playStatus;

    try {
      statusStore.playLoading = true;
      // 清除预取缓存，强制重新获取
      songManager.clearPrefetch();
      // 获取新音频源
      const audioSource = await songManager.getAudioSource(playSongData);
      if (!audioSource.url) {
        window.$message.error("切换音质失败");
        statusStore.playLoading = false;
        return;
      }
      console.log(`🔄 [${playSongData.id}] 切换音质:`, audioSource);
      // 更新音质和解锁状态
      statusStore.songQuality = audioSource.quality;
      statusStore.playUblock = audioSource.isUnlocked ?? false;
      statusStore.audioSource = audioSource.source;
      // 停止当前播放
      audioManager.stop();
      // 执行底层播放，保持进度，保持原播放状态
      await this.loadAndPlay(audioSource.url, shouldAutoPlay, seek);
    } catch (error) {
      console.error("❌ 切换音质失败:", error);
      statusStore.playLoading = false;
      window.$message.error("切换音质失败");
    }
  }

  /**
   * 加载音频流并播放
   */
  private async loadAndPlay(url: string, autoPlay: boolean, seek: number) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 设置基础参数
    audioManager.setVolume(statusStore.playVolume);
    // 仅当引擎支持倍速时设置
    if (audioManager.capabilities.supportsRate) {
      audioManager.setRate(statusStore.playRate);
    }

    // 应用 ReplayGain
    this.applyReplayGain();

    // 切换输出设备（非 MPV 引擎且未开启频谱时）
    if (audioManager.engineType !== "mpv" && !settingStore.showSpectrums) {
      this.toggleOutputDevice();
    }

    // 播放新音频
    try {
      // 设置期望的 seek 位置（MPV 引擎特有）
      if (seek > 0) {
        audioManager.setPendingSeek(seek / 1000);
      }

      // 计算渐入时间
      const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
      await audioManager.play(url, {
        fadeIn: !!fadeTime,
        fadeDuration: fadeTime,
        autoPlay,
        seek: seek / 1000,
      });

      // 更新进度到状态
      statusStore.currentTime = seek;
      const duration = this.getDuration() || statusStore.duration;
      if (duration > 0) {
        statusStore.progress = calculateProgress(seek, duration);
      } else {
        statusStore.progress = 0;
      }

      // 如果不自动播放，设置任务栏暂停状态
      if (!autoPlay) {
        // 立即将 UI 置为暂停，防止事件竞态导致短暂显示为播放
        statusStore.playStatus = false;
        playerIpc.sendPlayStatus(false);
        playerIpc.sendTaskbarMode("paused");
        if (seek > 0) {
          const progress = calculateProgress(seek, duration);
          playerIpc.sendTaskbarProgress(progress);
        }
      }
    } catch (error) {
      console.error("❌ 音频播放失败:", error);
      throw error;
    }
  }

  /**
   * 播放成功后的后续设置
   * @param song 歌曲
   */
  private async afterPlaySetup(song: SongType) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const songManager = useSongManager();
    // 记录播放历史 (非电台)
    if (song.type !== "radio") dataStore.setHistory(song);
    // 更新歌曲数据
    if (!song.path || song.type === "streaming") {
      mediaSessionManager.updateMetadata();
      getCoverColor(musicStore.songCover);
    }
    // 本地文件额外处理
    else {
      await this.parseLocalMusicInfo(song.path);
    }

    // 预载下一首
    if (settingStore.useNextPrefetch) songManager.getNextSongUrl();

    // Last.fm Scrobbler
    if (settingStore.lastfm.enabled && settingStore.isLastfmConfigured) {
      const { name, artist, album } = getPlayerInfoObj() || {};
      const durationInSeconds = song.duration > 0 ? Math.floor(song.duration / 1000) : undefined;
      lastfmScrobbler.startPlaying(name || "", artist || "", album, durationInSeconds);
    }
  }

  /**
   * 解析本地歌曲元信息
   * @param path 歌曲路径
   */
  private async parseLocalMusicInfo(path: string) {
    try {
      const musicStore = useMusicStore();
      if (musicStore.playSong.type === "streaming") return;
      const statusStore = useStatusStore();
      const blobURLManager = useBlobURLManager();

      // Blob URL 清理
      const oldCover = musicStore.playSong.cover;
      if (oldCover && oldCover.startsWith("blob:")) {
        blobURLManager.revokeBlobURL(musicStore.playSong.path || "");
      }

      // 获取封面数据
      const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", path);
      if (coverData) {
        const blobURL = blobURLManager.createBlobURL(coverData.data, coverData.format, path);
        if (blobURL) musicStore.playSong.cover = blobURL;
      } else {
        musicStore.playSong.cover = "/images/song.jpg?asset";
      }

      // 获取元数据
      const infoData = await window.electron.ipcRenderer.invoke("get-music-metadata", path);
      statusStore.songQuality = handleSongQuality(infoData.format?.bitrate ?? 0, "local");
      // 获取主色
      getCoverColor(musicStore.playSong.cover);
      // 更新媒体会话
      mediaSessionManager.updateMetadata();
    } catch (error) {
      console.error("❌ 解析本地歌曲元信息失败:", error);
    }
  }

  /**
   * 统一音频事件绑定
   */
  private bindAudioEvents() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();

    const audioManager = useAudioManager();

    // 加载状态
    audioManager.addEventListener("loadstart", () => {
      statusStore.playLoading = true;
    });

    // 加载完成
    audioManager.addEventListener("canplay", () => {
      const playSongData = getPlaySongData();

      // 结束加载
      statusStore.playLoading = false;

      // 恢复 EQ
      if (isElectron && statusStore.eqEnabled) {
        const bands = statusStore.eqBands;
        if (bands && bands.length === 10) {
          bands.forEach((val, idx) => audioManager.setFilterGain(idx, val));
        }
      }
      if (isElectron) {
        // 更新喜欢状态
        playerIpc.sendLikeStatus(dataStore.isLikeSong(playSongData?.id || 0));
        // 更新信息
        const { name, artist, album } = getPlayerInfoObj() || {};
        const playTitle = `${name} - ${artist}`;
        playerIpc.sendSongChange(playTitle, name || "", artist || "", album || "");
      }
    });

    // 播放开始
    audioManager.addEventListener("play", () => {
      const { name, artist } = getPlayerInfoObj() || {};
      const playTitle = `${name} - ${artist}`;
      // 更新状态
      statusStore.playStatus = true;
      playerIpc.sendMediaPlayState("Playing");
      mediaSessionManager.updatePlaybackStatus(true);
      window.document.title = `${playTitle} | SPlayer`;
      // 只有真正播放了才重置重试计数
      if (this.retryInfo.count > 0) this.retryInfo.count = 0;
      // 注意：failSkipCount 的重置移至 onTimeUpdate，确保有实际进度
      // Last.fm Scrobbler
      lastfmScrobbler.resume();
      // IPC 通知
      playerIpc.sendPlayStatus(true);
      playerIpc.sendTaskbarMode("normal");
      playerIpc.sendTaskbarProgress(statusStore.progress);
      console.log(`▶️ [${musicStore.playSong?.id}] 歌曲播放:`, name);
    });

    // 暂停
    audioManager.addEventListener("pause", () => {
      statusStore.playStatus = false;
      playerIpc.sendMediaPlayState("Paused");
      mediaSessionManager.updatePlaybackStatus(false);
      if (!isElectron) window.document.title = "SPlayer";
      playerIpc.sendPlayStatus(false);
      playerIpc.sendTaskbarMode("paused");
      playerIpc.sendTaskbarProgress(statusStore.progress);
      lastfmScrobbler.pause();
      console.log(`⏸️ [${musicStore.playSong?.id}] 歌曲暂停`);
    });

    // 播放结束
    audioManager.addEventListener("ended", () => {
      console.log(`⏹️ [${musicStore.playSong?.id}] 歌曲结束`);
      lastfmScrobbler.stop();
      // 检查定时关闭
      if (this.checkAutoClose()) return;
      // 自动播放下一首
      this.nextOrPrev("next", true, true);
    });

    // 进度更新
    this.onTimeUpdate = throttle(() => {
      const rawTime = audioManager.currentTime;
      const currentTime = Math.floor(rawTime * 1000);
      const duration = Math.floor(audioManager.duration * 1000) || statusStore.duration;
      // 计算歌词索引
      const songId = musicStore.playSong?.id;
      const offset = statusStore.getSongOffset(songId);
      const useYrc = !!(settingStore.showYrc && musicStore.songLyric.yrcData?.length);
      let rawLyrics: LyricLine[] = [];
      if (useYrc) {
        rawLyrics = toRaw(musicStore.songLyric.yrcData);
      } else {
        rawLyrics = toRaw(musicStore.songLyric.lrcData);
      }
      const lyricIndex = calculateLyricIndex(currentTime, rawLyrics, offset);
      // 更新状态
      statusStore.$patch({
        currentTime,
        duration,
        progress: calculateProgress(currentTime, duration),
        lyricIndex,
      });
      // 成功播放一段距离后，重置失败跳过计数
      if (currentTime > 500 && this.failSkipCount > 0) {
        this.failSkipCount = 0;
      }
      // 更新系统 MediaSession
      mediaSessionManager.updateState(duration, currentTime);
      // 更新桌面歌词
      playerIpc.sendLyric({
        lyricIndex: statusStore.lyricIndex,
        currentTime,
        songId: musicStore.playSong?.id,
        songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
      });
      // 任务栏进度
      if (settingStore.showTaskbarProgress) {
        playerIpc.sendTaskbarProgress(statusStore.progress);
      } else {
        playerIpc.sendTaskbarProgress("none");
      }
      // Socket 进度
      playerIpc.sendSocketProgress(currentTime, duration);
    }, 200);
    audioManager.addEventListener("timeupdate", this.onTimeUpdate);

    // 错误处理
    audioManager.addEventListener("error", (e) => {
      const errCode = e.detail.errorCode;
      this.handlePlaybackError(errCode, this.getSeek());
    });
  }

  /**
   * 统一错误处理策略
   * @param errCode 错误码
   * @param currentSeek 当前播放位置 (用于恢复)
   */
  private async handlePlaybackError(errCode: number | undefined, currentSeek: number = 0) {
    // 错误防抖
    const now = Date.now();
    if (now - this.lastErrorTime < 200) return;
    this.lastErrorTime = now;
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    // 清除预加载缓存
    songManager.clearPrefetch();
    // 当前歌曲 ID
    const currentSongId = musicStore.playSong?.id || 0;
    // 检查是否为同一首歌
    if (this.retryInfo.songId !== currentSongId) {
      // 新歌曲，重置重试计数
      this.retryInfo = { songId: currentSongId, count: 0 };
    }
    // 防止无限重试
    const ABSOLUTE_MAX_RETRY = 3;
    if (this.retryInfo.count >= ABSOLUTE_MAX_RETRY) {
      console.error(`❌ 歌曲 ${currentSongId} 已重试 ${this.retryInfo.count} 次，强制跳过`);
      window.$message.error("播放失败，已自动跳过");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 用户主动中止
    if (errCode === AudioErrorCode.ABORTED || errCode === AudioErrorCode.DOM_ABORT) {
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      return;
    }
    // 格式不支持
    if (errCode === AudioErrorCode.SRC_NOT_SUPPORTED || errCode === 9) {
      console.warn(`⚠️ 音频格式不支持 (Code: ${errCode}), 跳过`);
      window.$message.error("该歌曲无法播放，已自动跳过");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 本地文件错误
    if (musicStore.playSong.path && musicStore.playSong.type !== "streaming") {
      console.error("❌ 本地文件加载失败");
      window.$message.error("本地文件无法播放");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 在线/流媒体错误处理
    this.retryInfo.count++;
    console.warn(
      `⚠️ 播放出错 (Code: ${errCode}), 重试: ${this.retryInfo.count}/${this.MAX_RETRY_COUNT}`,
    );
    // 未超过重试次数 -> 尝试重新获取 URL（可能是过期）
    if (this.retryInfo.count <= this.MAX_RETRY_COUNT) {
      await sleep(1000);
      if (this.retryInfo.count === 1) {
        statusStore.playLoading = true;
        window.$message.warning("播放异常，正在尝试恢复...");
      }
      await this.playSong({ autoPlay: true, seek: currentSeek });
      return;
    }
    // 超过重试次数 -> 跳下一首
    console.error("❌ 超过最大重试次数，跳过当前歌曲");
    this.retryInfo.count = 0;
    window.$message.error("播放失败，已自动跳过");
    await this.skipToNextWithDelay();
  }

  /**
   * 带延迟的跳转下一首
   */
  private async skipToNextWithDelay() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    this.failSkipCount++;
    // 连续跳过 3 首 -> 停止播放
    if (this.failSkipCount >= 3) {
      window.$message.error("播放失败次数过多，已停止播放");
      statusStore.playLoading = false;
      this.pause(true);
      this.failSkipCount = 0;
      return;
    }
    // 列表只有一首 -> 停止播放
    if (dataStore.playList.length <= 1) {
      window.$message.error("当前已无可播放歌曲");
      this.cleanPlayList();
      this.failSkipCount = 0;
      return;
    }
    // 添加延迟，避免快速切歌导致卡死
    await sleep(500);
    await this.nextOrPrev("next");
  }

  /** 播放 */
  async play() {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 如果已经在播放，直接返回
    if (statusStore.playStatus) return;

    // 清除 MPV 强制暂停状态（如果是 MPV 引擎）
    audioManager.clearForcePaused();

    // 如果没有源，尝试重新初始化当前歌曲
    if (!audioManager.src) {
      await this.playSong({
        autoPlay: true,
        seek: statusStore.currentTime,
      });
      return;
    }

    // 如果已经在播放，直接返回
    if (!audioManager.paused) {
      statusStore.playStatus = true;
      return;
    }

    const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
    try {
      await audioManager.resume({ fadeIn: !!fadeTime, fadeDuration: fadeTime });
      statusStore.playStatus = true;
    } catch (error) {
      console.error("❌ 播放失败:", error);
      // 如果是 AbortError，尝试重新加载
      if (error instanceof Error && error.name === "AbortError") {
        await this.playSong({ autoPlay: true });
      }
    }
  }

  /** 暂停 */
  async pause(changeStatus: boolean = true) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 计算渐出时间
    const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
    audioManager.pause({ fadeOut: !!fadeTime, fadeDuration: fadeTime });

    if (changeStatus) statusStore.playStatus = false;
  }

  /** 播放/暂停切换 */
  async playOrPause() {
    const statusStore = useStatusStore();
    if (statusStore.playStatus) await this.pause();
    else await this.play();
  }

  /**
   * 切歌：上一首/下一首
   * @param type 方向
   * @param play 是否立即播放
   * @param autoEnd 是否是自动结束触发的
   */
  public async nextOrPrev(
    type: "next" | "prev" = "next",
    play: boolean = true,
    autoEnd: boolean = false,
  ) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();

    // 先暂停当前播放
    const audioManager = useAudioManager();
    audioManager.stop();

    // 私人FM
    if (statusStore.personalFmMode) {
      await songManager.initPersonalFM(true);
      await this.playSong({ autoPlay: play });
      return;
    }

    // 播放列表是否为空
    const playListLength = dataStore.playList.length;
    if (playListLength === 0) {
      window.$message.error("播放列表为空，请添加歌曲");
      return;
    }

    // 单曲循环
    // 如果是自动结束触发的单曲循环，则重播当前歌曲
    if (statusStore.repeatMode === "one" && autoEnd) {
      await this.playSong({ autoPlay: play, seek: 0 });
      return;
    }

    // 计算索引
    let nextIndex = statusStore.playIndex;
    nextIndex += type === "next" ? 1 : -1;

    // 边界处理 (索引越界)
    if (nextIndex >= playListLength) nextIndex = 0;
    if (nextIndex < 0) nextIndex = playListLength - 1;

    // 更新状态并播放
    statusStore.playIndex = nextIndex;
    await this.playSong({ autoPlay: play });
  }

  /** 获取总时长 (ms) */
  public getDuration(): number {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // MPV 引擎 duration 在 statusStore 中（通过事件更新），Web Audio 从 audioManager 获取
    const duration = audioManager.duration;
    return duration > 0 ? Math.floor(duration * 1000) : statusStore.duration;
  }

  /** 获取当前播放位置 (ms) */
  public getSeek(): number {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // MPV 引擎 currentTime 在 statusStore 中（通过事件更新），Web Audio 从 audioManager 获取
    const currentTime = audioManager.currentTime;
    return currentTime > 0 ? Math.floor(currentTime * 1000) : statusStore.currentTime;
  }

  /**
   * 设置进度
   * @param time 时间 (ms)
   */
  public setSeek(time: number) {
    if (this.onTimeUpdate) {
      this.onTimeUpdate.cancel();
    }
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    const safeTime = Math.max(0, Math.min(time, this.getDuration()));
    audioManager.seek(safeTime / 1000);
    statusStore.currentTime = safeTime;
    mediaSessionManager.updateState(this.getDuration(), safeTime, true);
  }

  /**
   * 设置音量
   * @param actions 音量值或滚动事件
   */
  public setVolume(actions: number | "up" | "down" | WheelEvent) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // 增量
    const increment = 0.05;
    // 直接设置音量
    if (typeof actions === "number") {
      actions = Math.max(0, Math.min(actions, 1));
      statusStore.playVolume = actions;
    }
    // 音量加减
    else if (actions === "up" || actions === "down") {
      statusStore.playVolume = Math.max(
        0,
        Math.min(statusStore.playVolume + (actions === "up" ? increment : -increment), 1),
      );
    }
    // 滚动事件
    else {
      const deltaY = actions.deltaY;
      const volumeChange = deltaY > 0 ? -increment : increment;
      statusStore.playVolume = Math.max(0, Math.min(statusStore.playVolume + volumeChange, 1));
    }

    // 统一调用 audioManager
    audioManager.setVolume(statusStore.playVolume);
  }

  /** 切换静音 */
  public toggleMute() {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    // 是否静音
    const isMuted = statusStore.playVolume === 0;

    if (isMuted) {
      statusStore.playVolume = statusStore.playVolumeMute;
    } else {
      statusStore.playVolumeMute = statusStore.playVolume;
      statusStore.playVolume = 0;
    }

    // 统一调用 audioManager
    audioManager.setVolume(statusStore.playVolume);
  }

  /**
   * 设置播放速率
   * @param rate 速率 (0.25 - 2.0)
   */
  public setRate(rate: number) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    statusStore.playRate = rate;

    // 统一调用 audioManager
    audioManager.setRate(rate);
  }

  /**
   * 检查是否需要跳过歌曲 (Fuck DJ Mode)
   * @param song 歌曲信息
   */
  private shouldSkipSong(song: SongType): boolean {
    const settingStore = useSettingStore();
    if (!settingStore.disableDjMode) return false;
    // 是否包含 DJ 关键词
    const name = (song.name || "").toUpperCase();
    const alia = song.alia;
    const aliaStr = (Array.isArray(alia) ? alia.join("") : alia || "").toUpperCase();
    const fullText = name + aliaStr;
    return DJ_MODE_KEYWORDS.some((k) => fullText.includes(k.toUpperCase()));
  }

  /**
   * 更新播放列表并播放
   * @param data 歌曲列表
   * @param song 指定播放的歌曲
   * @param pid 歌单 ID
   * @param options 配置项
   * @param options.showTip 是否显示提示
   * @param options.play 是否播放
   * @param options.keepHeartbeatMode 是否保持心动模式
   */
  public async updatePlayList(
    data: SongType[],
    song?: SongType,
    pid?: number,
    options: {
      showTip?: boolean;
      play?: boolean;
      keepHeartbeatMode?: boolean;
    } = { showTip: true, play: true },
  ) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    if (!data || !data.length) return;

    // 处理随机模式
    let processedData = [...data]; // 浅拷贝
    if (statusStore.shuffleMode === "on") {
      await dataStore.setOriginalPlayList([...data]);
      processedData = shuffleArray(processedData);
    }
    // 更新列表
    await dataStore.setPlayList(processedData);
    // 关闭心动模式
    if (!options.keepHeartbeatMode && statusStore.shuffleMode === "heartbeat") {
      statusStore.shuffleMode = "off";
    }
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;
    // 确定播放索引
    if (song && song.id) {
      const newIndex = processedData.findIndex((s) => s.id === song.id);
      if (musicStore.playSong.id === song.id) {
        // 如果是同一首歌，仅更新索引
        if (newIndex !== -1) statusStore.playIndex = newIndex;
        // 如果需要播放
        if (options.play) await this.play();
      } else {
        // 在开始请求之前就设置加载状态
        statusStore.playLoading = true;
        statusStore.playIndex = newIndex;
        await this.playSong({ autoPlay: options.play });
      }
    } else {
      // 默认播放第一首
      statusStore.playLoading = true;
      statusStore.playIndex = 0;
      await this.playSong({ autoPlay: options.play });
    }
    musicStore.playPlaylistId = pid ?? 0;
    if (options.showTip) window.$message.success("已开始播放");
  }

  /**
   * 清空播放列表
   */
  public async cleanPlayList() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const audioManager = useAudioManager();
    // 重置状态
    audioManager.stop();
    statusStore.resetPlayStatus();
    musicStore.resetMusicData();
    // 清空播放列表
    await dataStore.setPlayList([]);
    await dataStore.clearOriginalPlayList();
    playerIpc.sendTaskbarProgress("none");
  }

  /**
   * 添加下一首歌曲
   * @param song 歌曲
   * @param play 是否立即播放
   */
  public async addNextSong(song: SongType, play: boolean = false) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();

    // 关闭特殊模式
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;

    if (musicStore.playSong.id === song.id) {
      await this.play();
      window.$message.success("已开始播放");
      return;
    }

    // 尝试添加
    const currentSongId = musicStore.playSong.id;
    const songIndex = await dataStore.setNextPlaySong(song, statusStore.playIndex);

    // 修正当前播放索引
    const newCurrentIndex = dataStore.playList.findIndex((s) => s.id === currentSongId);
    if (newCurrentIndex !== -1 && newCurrentIndex !== statusStore.playIndex) {
      statusStore.playIndex = newCurrentIndex;
    }

    // 播放歌曲
    if (songIndex < 0) return;
    if (play) {
      await this.togglePlayIndex(songIndex, true);
    } else {
      window.$message.success("已添加至下一首播放");
    }
  }

  /**
   * 切换播放索引
   * @param index 播放索引
   * @param play 是否立即播放
   */
  public async togglePlayIndex(index: number, play: boolean = false) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    try {
      // 获取数据
      const { playList } = dataStore;

      // 若超出播放列表
      if (index >= playList.length) return;

      // 先停止当前播放
      audioManager.stop();

      // 相同歌曲且需要播放
      if (statusStore.playIndex === index) {
        if (play) await this.play();
        return;
      }

      // 更改状态
      statusStore.playIndex = index;
      // 重置播放进度（切换歌曲时必须重置）
      statusStore.currentTime = 0;
      statusStore.progress = 0;
      statusStore.lyricIndex = -1;

      await this.playSong({ autoPlay: play });
    } catch (error) {
      console.error("Error in togglePlayIndex:", error);
      statusStore.playLoading = false;
      throw error;
    }
  }

  /**
   * 移除指定歌曲
   * @param index 歌曲索引
   */
  public removeSongIndex(index: number) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();

    // 获取数据
    const { playList } = dataStore;

    // 若超出播放列表
    if (index >= playList.length) return;

    // 仅剩一首
    if (playList.length === 1) {
      this.cleanPlayList();
      return;
    }

    // 是否为当前播放歌曲
    const isCurrentPlay = statusStore.playIndex === index;

    // 若将移除最后一首
    if (index === playList.length - 1) {
      statusStore.playIndex = 0;
    }
    // 若为当前播放之后
    else if (statusStore.playIndex > index) {
      statusStore.playIndex--;
    }

    // 移除指定歌曲
    const newPlaylist = [...playList];
    newPlaylist.splice(index, 1);
    dataStore.setPlayList(newPlaylist);

    // 若为当前播放
    if (isCurrentPlay) {
      this.playSong({ autoPlay: statusStore.playStatus });
    }
  }

  /**
   * 开启定时关闭
   * @param time 自动关闭时间（分钟）
   * @param remainTime 剩余时间（秒）
   */
  public startAutoCloseTimer(time: number, remainTime: number) {
    const statusStore = useStatusStore();
    if (!time || !remainTime) return;
    // 清除已有定时器
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
    }
    // 计算目标结束时间戳
    const endTime = Date.now() + remainTime * 1000;
    statusStore.autoClose.enable = true;
    statusStore.autoClose.time = time;
    statusStore.autoClose.endTime = endTime;
    statusStore.autoClose.remainTime = remainTime;
    // 定时器仅用于 UI 更新，实际计时基于系统时间
    this.autoCloseInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((statusStore.autoClose.endTime - now) / 1000));
      statusStore.autoClose.remainTime = remaining;
      // 到达时间
      if (remaining <= 0) {
        clearInterval(this.autoCloseInterval);
        if (!statusStore.autoClose.waitSongEnd) {
          this.pause();
          statusStore.autoClose.enable = false;
          statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
          statusStore.autoClose.endTime = 0;
        }
      }
    }, 1000);
  }

  /** 检查并执行自动关闭 */
  private checkAutoClose(): boolean {
    const statusStore = useStatusStore();
    const { enable, waitSongEnd, remainTime } = statusStore.autoClose;

    if (enable && waitSongEnd && remainTime <= 0) {
      console.log("🔄 执行自动关闭");
      this.pause();
      statusStore.autoClose.enable = false;
      // 重置时间
      statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
      statusStore.autoClose.endTime = 0;
      return true;
    }
    return false;
  }

  /**
   * 切换输出设备
   * @param deviceId 设备 ID
   */
  public toggleOutputDevice(deviceId?: string) {
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();
    const device = deviceId ?? settingStore.playDevice;
    try {
      audioManager.setSinkId(deviceId ?? device);
    } catch (error) {
      console.error("AudioManager: 设置输出设备失败", error);
    }
  }

  /**
   * 切换循环模式
   * @param mode 可选，直接设置目标模式。如果不传，则按 List -> One -> Off 顺序轮转
   */
  public toggleRepeat(mode?: RepeatModeType) {
    this.playModeManager.toggleRepeat(mode);
  }

  /**
   * 切换随机模式
   * @param mode 可选，直接设置目标模式。如果不传则按 Off -> On -> Off 顺序轮转
   * @note 心跳模式只能通过菜单开启（传入 "heartbeat" 参数），点击随机按钮不会进入心跳模式
   * @note 当播放列表包含本地歌曲时，跳过心动模式，只在 Off 和 On 之间切换
   */
  public async toggleShuffle(mode?: ShuffleModeType) {
    const statusStore = useStatusStore();
    const currentMode = statusStore.shuffleMode;
    // 预判下一个模式
    const nextMode = mode ?? this.playModeManager.calculateNextShuffleMode(currentMode);
    // 如果模式确实改变了，才让 Manager 进行繁重的数据处理
    if (currentMode !== nextMode) {
      await this.playModeManager.toggleShuffle(nextMode);
    }
  }

  /**
   * 同步当前的播放模式到媒体控件
   */
  public syncMediaPlayMode() {
    this.playModeManager.syncMediaPlayMode();
  }

  /**
   * 获取频谱数据
   */
  public getSpectrumData(): Uint8Array | null {
    const audioManager = useAudioManager();
    return audioManager.getFrequencyData();
  }

  /**
   * 获取低频音量 [0.0-1.0]
   * 用于驱动背景动画等视觉效果
   */
  public getLowFrequencyVolume(): number {
    const audioManager = useAudioManager();
    return audioManager.getLowFrequencyVolume();
  }

  /**
   * 更新均衡器
   * @param options 均衡器选项
   * @param options.bands 频带增益
   * @param options.preamp 预放大
   * @param options.q Q 值
   * @param options.frequencies 频率
   */
  public updateEq(options?: {
    bands?: number[];
    preamp?: number;
    q?: number;
    frequencies?: number[];
  }) {
    const audioManager = useAudioManager();
    // 暂未完全适配 preamp 和 q 的动态调整，仅处理 bands
    if (options?.bands) {
      options.bands.forEach((val, idx) => audioManager.setFilterGain(idx, val));
    }
  }

  /**
   * 禁用均衡器
   */
  public disableEq() {
    const audioManager = useAudioManager();
    for (let i = 0; i < 10; i++) audioManager.setFilterGain(i, 0);
  }

  /**
   * 切换桌面歌词
   */
  public toggleDesktopLyric() {
    const statusStore = useStatusStore();
    this.setDesktopLyricShow(!statusStore.showDesktopLyric);
  }

  /**
   * 桌面歌词控制
   * @param show 是否显示
   */
  public setDesktopLyricShow(show: boolean) {
    const statusStore = useStatusStore();
    if (statusStore.showDesktopLyric === show) return;
    statusStore.showDesktopLyric = show;
    playerIpc.toggleDesktopLyric(show);
    window.$message.success(`${show ? "已开启" : "已关闭"}桌面歌词`);
  }

  /**
   * 同步播放模式给托盘
   */
  public playModeSyncIpc() {
    this.playModeManager.playModeSyncIpc();
  }
}

const PLAYER_CONTROLLER_KEY = "__SPLAYER_PLAYER_CONTROLLER__";

/**
 * 获取 PlayerController 实例
 * @returns PlayerController
 */
export const usePlayerController = (): PlayerController => {
  const win = window as Window & { [PLAYER_CONTROLLER_KEY]?: PlayerController };
  if (!win[PLAYER_CONTROLLER_KEY]) {
    win[PLAYER_CONTROLLER_KEY] = new PlayerController();
    console.log("[PlayerController] 创建新实例");
  }
  return win[PLAYER_CONTROLLER_KEY];
};
