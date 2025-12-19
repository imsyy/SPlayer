import { PlayModeType, type SongType } from "@/types/main";
import { useAudioManager } from "./AudioManager";
import { useSongManager } from "./SongManager";
import { useLyricManager } from "./LyricManager";
import { useBlobURLManager } from "@/core/resource/BlobURLManager";
import { isElectron } from "@/utils/env";
import { throttle } from "lodash-es";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { calculateProgress, msToS } from "@/utils/time";
import { handleSongQuality, shuffleArray } from "@/utils/helper";
import { getCoverColor } from "@/utils/color";
import { isLogin } from "@/utils/auth";
import { openUserLogin } from "@/utils/modal";
import { heartRateList } from "@/api/playlist";
import { formatSongsList, getPlayerInfoObj, getPlaySongData } from "@/utils/format";
import { calculateLyricIndex } from "@/utils/calc";
import { LyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 播放器 IPC 服务
 * 用于与主进程通信
 */
const ipcService = {
  /**
   * 发送播放状态
   * @param isPlaying 是否播放
   */
  sendPlayStatus: (isPlaying: boolean) => {
    if (isElectron) window.electron.ipcRenderer.send("play-status-change", isPlaying);
  },
  /**
   * 发送歌曲信息
   * @param title 歌曲标题
   * @param artist 歌手
   * @param name 歌曲名称
   */
  sendSongChange: (title: string, artist: string, name: string) => {
    if (!isElectron) return;
    window.electron.ipcRenderer.send("play-song-change", `${title} | SPlayer`);
    window.electron.ipcRenderer.send("update-desktop-lyric-data", {
      playName: name,
      artistName: artist,
    });
  },
  /**
   * 发送进度
   * @param progress 进度
   */
  sendProgress: throttle((progress: number | "none") => {
    if (isElectron) window.electron.ipcRenderer.send("set-bar", progress);
  }, 1000),
  /**
   * 发送歌词
   * @param data 歌词数据
   */
  sendLyric: throttle((data: unknown) => {
    if (isElectron) window.electron.ipcRenderer.send("play-lyric-change", data);
  }, 500),
  /**
   * 发送喜欢状态
   * @param isLiked 是否喜欢
   */
  sendLikeStatus: (isLiked: boolean) => {
    if (isElectron) window.electron.ipcRenderer.send("like-status-change", isLiked);
  },
  /**
   * 发送桌面歌词开关
   * @param show 是否显示
   */
  toggleDesktopLyric: (show: boolean) => {
    if (isElectron) window.electron.ipcRenderer.send("toggle-desktop-lyric", show);
  },
  /**
   * 发送播放模式
   * @param mode 播放模式
   */
  sendPlayMode: (mode: string) => {
    if (isElectron) window.electron.ipcRenderer.send("play-mode-change", mode);
  },
};

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

  constructor() {
    this.bindAudioEvents();
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
    try {
      // 停止当前播放
      audioManager.pause();
      musicStore.playSong = playSongData;
      // 重置播放进度
      statusStore.currentTime = 0;
      statusStore.progress = 0;
      statusStore.lyricIndex = -1;
      // 重置重试计数
      const sid = playSongData.type === "radio" ? playSongData.dj?.id : playSongData.id;
      if (this.retryInfo.songId !== sid) {
        this.retryInfo = { songId: sid || 0, count: 0 };
      }
      // 设置加载状态
      statusStore.playLoading = true;
      // 获取音频源
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
      // 执行底层播放
      await this.loadAndPlay(audioSource.url, autoPlay, seek);
      if (requestToken !== this.currentRequestToken) return;
      // 后置处理
      await this.afterPlaySetup(playSongData);
    } catch (error: any) {
      if (requestToken === this.currentRequestToken) {
        console.error("❌ 播放初始化失败:", error);
        await this.handlePlaybackError(error?.code || 0, options.seek || 0);
      }
    } finally {
      if (requestToken === this.currentRequestToken) {
        statusStore.playLoading = false;
      }
    }
  }

  /**
   * 加载音频流并播放
   */
  private async loadAndPlay(url: string, autoPlay: boolean, seek: number) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 停止当前播放并清理
    // audioManager.stop();

    // 设置基础参数
    audioManager.setVolume(statusStore.playVolume);
    audioManager.setRate(statusStore.playRate);

    // 切换输出设备
    if (!settingStore.showSpectrums) this.toggleOutputDevice();

    // 播放新音频
    try {
      // 计算渐入时间
      const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
      await audioManager.play(url, { fadeIn: !!fadeTime, fadeDuration: fadeTime, autoPlay });
      // 恢复进度
      if (seek > 0) audioManager.seek(seek / 1000);
    } catch (error) {
      console.error("❌ 音频播放失败:", error);
      throw error;
    }
  }

  /**
   * 播放成功后的后续设置
   * @param song 歌曲
   * @param url 音频源
   */
  private async afterPlaySetup(song: SongType) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const songManager = useSongManager();
    const lyricManager = useLyricManager();

    // 获取歌词
    lyricManager.handleLyric(song.id, song.path);
    // 记录播放历史 (非电台)
    if (song.type !== "radio") dataStore.setHistory(song);
    // 更新歌曲数据
    if (!song.path) {
      this.updateMediaSession();
      getCoverColor(musicStore.songCover);
    }
    // 本地文件额外处理
    else {
      await this.parseLocalMusicInfo(song.path);
    }

    // 预载下一首
    if (settingStore.useNextPrefetch) songManager.getNextSongUrl();
  }

  /**
   * 解析本地歌曲元信息
   * @param path 歌曲路径
   */
  private async parseLocalMusicInfo(path: string) {
    try {
      const musicStore = useMusicStore();
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
        musicStore.playSong.cover = "/images/song.jpg?assest";
      }

      // 获取元数据
      const infoData = await window.electron.ipcRenderer.invoke("get-music-metadata", path);
      statusStore.songQuality = handleSongQuality(infoData.format?.bitrate ?? 0, "local");
      // 获取主色
      getCoverColor(musicStore.playSong.cover);
      // 更新媒体会话
      this.updateMediaSession();
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

    // 清理旧事件
    audioManager.offAll();

    // 加载状态
    audioManager.on("loadstart", () => {
      statusStore.playLoading = true;
    });

    // 加载完成
    audioManager.on("canplay", () => {
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
        ipcService.sendLikeStatus(dataStore.isLikeSong(playSongData?.id || 0));
        // 更新信息
        const { name, artist } = getPlayerInfoObj() || {};
        const playTitle = `${name} - ${artist}`;
        ipcService.sendSongChange(playTitle, artist || "", name || "");
      }
    });

    // 播放开始
    audioManager.on("play", () => {
      const { name, artist } = getPlayerInfoObj() || {};
      const playTitle = `${name} - ${artist}`;
      // 更新状态
      statusStore.playStatus = true;
      window.document.title = `${playTitle} | SPlayer`;
      // 只有真正播放了才重置重试计数
      if (this.retryInfo.count > 0) this.retryInfo.count = 0;
      this.failSkipCount = 0;
      // IPC 通知
      ipcService.sendPlayStatus(true);
      ipcService.sendSongChange(playTitle, artist || "", name || "");
      console.log(`▶️ [${musicStore.playSong?.id}] 歌曲播放:`, name);
    });

    // 暂停
    audioManager.on("pause", () => {
      statusStore.playStatus = false;
      if (!isElectron) window.document.title = "SPlayer";
      ipcService.sendPlayStatus(false);
      console.log(`⏸️ [${musicStore.playSong?.id}] 歌曲暂停`);
    });

    // 播放结束
    audioManager.on("ended", () => {
      console.log(`⏹️ [${musicStore.playSong?.id}] 歌曲结束`);
      // 检查定时关闭
      if (this.checkAutoClose()) return;
      // 自动播放下一首
      this.nextOrPrev("next", true, true);
    });

    // 进度更新
    const handleTimeUpdate = throttle(() => {
      const currentTime = Math.floor(audioManager.currentTime * 1000);
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
      // 更新系统 MediaSession
      this.updateMediaSessionState(duration, currentTime);
      // 更新桌面歌词
      ipcService.sendLyric({
        lyricIndex: statusStore.lyricIndex,
        currentTime,
        songId: musicStore.playSong?.id,
        songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
      });
      // 进度条
      if (settingStore.showTaskbarProgress) {
        ipcService.sendProgress(statusStore.progress);
      }
    }, 200);
    audioManager.on("timeupdate", handleTimeUpdate);

    // 错误处理
    audioManager.on("error", (e: any) => {
      // 从 Event 中提取错误码
      let errCode: number | undefined;
      if ("detail" in e && e.detail) {
        errCode = (e.detail as { errorCode?: number }).errorCode;
      }
      this.handlePlaybackError(errCode, this.getSeek());
    });
  }

  /**
   * 统一错误处理策略
   * @param errCode 错误码
   * @param currentSeek 当前播放位置 (用于恢复)
   */
  private async handlePlaybackError(errCode: number | undefined, currentSeek: number = 0) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();

    // 清除预加载缓存
    songManager.clearPrefetch();

    // 是否为本地歌曲
    const isLocalSong = musicStore.playSong.path;
    if (isLocalSong) {
      console.error("❌ 本地文件加载失败，停止重试");
      window.$message.error("本地文件无法播放");
      this.retryInfo.count = 0;
      await this.nextOrPrev("next");
      return;
    }

    this.retryInfo.count++;
    console.warn(
      `⚠️ 播放出错 (Code: ${errCode}), 重试: ${this.retryInfo.count}/${this.MAX_RETRY_COUNT}`,
    );

    // 用户主动中止 (Code 1) 或 AbortError (Code 20) - 不重试
    if (errCode === 1 || errCode === 20) {
      this.retryInfo.count = 0;
      return;
    }

    // 达到最大重试次数 -> 切歌
    if (this.retryInfo.count > this.MAX_RETRY_COUNT) {
      console.error("❌ 超过最大重试次数，跳过当前歌曲");

      this.retryInfo.count = 0;
      this.failSkipCount++;

      // 列表只有一首，或连续跳过所有歌曲
      if (dataStore.playList.length <= 1 || this.failSkipCount >= dataStore.playList.length) {
        window.$message.error("当前已无可播放歌曲");
        this.cleanPlayList();
        this.failSkipCount = 0;
        return;
      }
      window.$message.error("播放失败，已自动跳过");
      await this.nextOrPrev("next");
      return;
    }

    // 尝试重试
    setTimeout(async () => {
      // 只有第一次重试时提示用户
      if (this.retryInfo.count === 1) {
        statusStore.playLoading = true;
        window.$message.warning("播放异常，正在尝试恢复...");
      }
      // 重新调用 playSong，尝试恢复进度
      await this.playSong({ autoPlay: true, seek: currentSeek });
    }, 1000);
  }

  /** 播放 */
  async play() {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 如果没有源，尝试重新初始化当前歌曲
    if (!audioManager.src) {
      await this.playSong({ autoPlay: true });
      return;
    }

    // 如果已经在播放，直接返回
    if (!audioManager.paused) {
      statusStore.playStatus = true;
      return;
    }

    const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
    try {
      await audioManager.play(undefined, { fadeIn: !!fadeTime, fadeDuration: fadeTime });
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
    if (!audioManager.src) return;
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
    audioManager.pause();

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
    if (statusStore.playSongMode === "repeat-once" && autoEnd && !statusStore.playHeartbeatMode) {
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
    const audioManager = useAudioManager();
    return Math.floor(audioManager.duration * 1000);
  }

  /** 获取当前播放位置 (ms) */
  public getSeek(): number {
    const audioManager = useAudioManager();
    return Math.floor(audioManager.currentTime * 1000);
  }

  /**
   * 设置进度
   * @param time 时间 (ms)
   */
  public setSeek(time: number) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // 边界检查
    const safeTime = Math.max(0, Math.min(time, this.getDuration()));
    audioManager.seek(safeTime / 1000);
    statusStore.currentTime = safeTime;
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
      statusStore.playVolumeMute = audioManager.getVolume();
      statusStore.playVolume = 0;
    }
    audioManager.setVolume(statusStore.playVolume);
  }

  /**
   * 设置播放速率
   * @param rate 速率 (0.5 - 2.0)
   */
  public setRate(rate: number) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    statusStore.playRate = rate;
    audioManager.setRate(rate);
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
    if (statusStore.playSongMode === "shuffle") {
      await dataStore.setOriginalPlayList([...data]);
      processedData = shuffleArray(processedData);
    }
    // 更新列表
    await dataStore.setPlayList(processedData);
    // 关闭特殊模式
    if (!options.keepHeartbeatMode && statusStore.playHeartbeatMode) {
      this.toggleHeartMode(false);
    }
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;
    // 确定播放索引
    if (song && song.id) {
      if (musicStore.playSong.id === song.id && options.play) {
        await this.play();
      } else {
        // 在开始请求之前就设置加载状态
        statusStore.playLoading = true;
        statusStore.playIndex = processedData.findIndex((s) => s.id === song.id);
        await this.playSong();
      }
    } else {
      // 默认播放第一首
      statusStore.playLoading = true;
      statusStore.playIndex = 0;
      await this.playSong();
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
    ipcService.sendProgress("none");
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

  /** MediaSession: 初始化 */
  public initMediaSession() {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen || !("mediaSession" in navigator)) return;
    const nav = navigator.mediaSession;
    nav.setActionHandler("play", () => this.play());
    nav.setActionHandler("pause", () => this.pause());
    nav.setActionHandler("previoustrack", () => this.nextOrPrev("prev"));
    nav.setActionHandler("nexttrack", () => this.nextOrPrev("next"));
    nav.setActionHandler("seekto", (e) => {
      if (e.seekTime) this.setSeek(e.seekTime * 1000);
    });
  }

  /** MediaSession: 更新元数据 */
  private updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const musicStore = useMusicStore();

    // 获取播放数据
    const song = getPlaySongData();
    if (!song) return;
    const isRadio = song.type === "radio";
    // 更新元数据
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: song.name,
      artist: isRadio
        ? "播客电台"
        : Array.isArray(song.artists)
          ? song.artists.map((a) => a.name).join("/")
          : String(song.artists),
      album: isRadio
        ? "播客电台"
        : typeof song.album === "object"
          ? song.album.name
          : String(song.album),
      artwork: [
        { src: musicStore.getSongCover("s"), sizes: "100x100", type: "image/jpeg" },
        { src: musicStore.getSongCover("m"), sizes: "300x300", type: "image/jpeg" },
        { src: musicStore.getSongCover("cover"), sizes: "512x512", type: "image/jpeg" },
        { src: musicStore.getSongCover("l"), sizes: "1024x1024", type: "image/jpeg" },
        { src: musicStore.getSongCover("xl"), sizes: "1920x1920", type: "image/jpeg" },
      ],
    });
  }

  /** MediaSession: 更新状态 */
  private updateMediaSessionState(duration: number, position: number) {
    const settingStore = useSettingStore();
    if (!settingStore.smtcOpen || !("mediaSession" in navigator)) return;
    navigator.mediaSession.setPositionState({
      duration: msToS(duration),
      position: msToS(position),
    });
  }

  /**
   * 开启定时关闭
   * @param time 自动关闭时间（分钟）
   * @param remainTime 剩余时间（秒）
   */
  public startAutoCloseTimer(time: number, remainTime: number) {
    const statusStore = useStatusStore();
    if (!time || !remainTime) return;

    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
    }

    statusStore.autoClose.enable = true;
    statusStore.autoClose.time = time;
    statusStore.autoClose.remainTime = remainTime;

    this.autoCloseInterval = setInterval(() => {
      if (statusStore.autoClose.remainTime <= 0) {
        clearInterval(this.autoCloseInterval);
        if (!statusStore.autoClose.waitSongEnd) {
          this.pause();
          statusStore.autoClose.enable = false;
          statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
        }
        return;
      }
      statusStore.autoClose.remainTime--;
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
   * 切换播放模式
   * @param mode 播放模式
   */
  public async togglePlayMode(mode: PlayModeType | false) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 退出心动模式
    if (statusStore.playHeartbeatMode) this.toggleHeartMode(false);
    // 计算目标模式
    let targetMode: PlayModeType;
    if (mode) {
      targetMode = mode;
    } else {
      const modes: PlayModeType[] = ["repeat", "repeat-once", "shuffle"];
      const nextIdx = (modes.indexOf(statusStore.playSongMode) + 1) % modes.length;
      targetMode = modes[nextIdx];
    }
    // 随机模式逻辑
    if (targetMode === "shuffle" && statusStore.playSongMode !== "shuffle") {
      const currentList = dataStore.playList;
      if (currentList.length > 1) {
        await dataStore.setOriginalPlayList([...currentList]);
        const shuffled = shuffleArray([...currentList]);
        await dataStore.setPlayList(shuffled);
        // 修正当前索引
        const idx = shuffled.findIndex((s) => s.id === musicStore.playSong?.id);
        if (idx !== -1) statusStore.playIndex = idx;
      }
    }
    // 离开随机模式：恢复到原顺序
    else if (statusStore.playSongMode === "shuffle" && targetMode !== "shuffle") {
      // 恢复列表
      const original = await dataStore.getOriginalPlayList();
      if (original?.length) {
        await dataStore.setPlayList(original);
        const idx = original.findIndex((s) => s.id === musicStore.playSong?.id);
        statusStore.playIndex = idx !== -1 ? idx : 0;
        await dataStore.clearOriginalPlayList();
      }
    }
    statusStore.playSongMode = targetMode;
    ipcService.sendPlayMode(targetMode);
  }

  /**
   * 切换心动模式
   * @param open 是否开启
   */
  public async toggleHeartMode(open: boolean = true) {
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const dataStore = useDataStore();

    if (!open && statusStore.playHeartbeatMode) {
      statusStore.playHeartbeatMode = false;
      window.$message.success("已退出心动模式");
      return;
    }

    if (isLogin() !== 1) {
      if (isLogin() === 0) {
        openUserLogin(true);
      } else {
        window.$message.warning("该登录模式暂不支持该操作");
      }
      return;
    }

    if (statusStore.playHeartbeatMode) {
      await this.play();
      statusStore.showFullPlayer = true;
      return;
    }

    window.$message.loading("心动模式开启中...");

    try {
      const pid =
        musicStore.playPlaylistId || (await dataStore.getUserLikePlaylist())?.detail?.id || 0;
      const res = await heartRateList(musicStore.playSong?.id || 0, pid);

      if (res.code === 200) {
        const list = formatSongsList(res.data);
        statusStore.playIndex = 0;
        await this.updatePlayList(list, list[0], undefined, { keepHeartbeatMode: true });
        statusStore.playHeartbeatMode = true;
      }
    } catch (e) {
      console.error(e);
      window.$message.error("心动模式开启失败");
    }
  }

  /**
   * 获取频谱数据
   */
  public getSpectrumData(): Uint8Array | null {
    const audioManager = useAudioManager();
    return audioManager.getFrequencyData();
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
    ipcService.toggleDesktopLyric(show);
    window.$message.success(`${show ? "已开启" : "已关闭"}桌面歌词`);
  }

  /**
   * 播放模式同步 ipc
   */
  public playModeSyncIpc() {
    const statusStore = useStatusStore();
    if (isElectron) {
      ipcService.sendPlayMode(statusStore.playSongMode);
    }
  }
}

let instance: PlayerController | null = null;

/**
 * 获取 PlayerController 实例
 * @returns PlayerController
 */
export const usePlayerController = (): PlayerController => {
  if (!instance) instance = new PlayerController();
  return instance;
};
