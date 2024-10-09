import type { SongType, PlayModeType } from "@/types/main";
import type { MessageReactive } from "naive-ui";
import { Howl, Howler } from "howler";
import { cloneDeep } from "lodash-es";
import { useMusicStore, useStatusStore, useDataStore, useSettingStore } from "@/stores";
import { parsedLyricsData, resetSongLyric, parseLocalLyric } from "./lyric";
import { songUrl, unlockSongUrl, songLyric } from "@/api/song";
import { getCoverColorData } from "@/utils/color";
import { calculateProgress } from "./time";
import { isElectron, isDev, sleep } from "./helper";
import { heartRateList } from "@/api/playlist";
import { formatSongsList } from "./format";
import { isLogin } from "./auth";
import { openUserLogin } from "./modal";
import { scrobble } from "@/api/user";
import { personalFm, personalFmToTrash } from "@/api/rec";
import blob from "./blob";

// 播放器核心
// Howler.js

// 允许播放格式
const allowPlayFormat = ["mp3", "flac", "webm", "ogg", "wav"];

class Player {
  // 播放器
  private player: Howl;
  // 定时器
  private playerInterval: ReturnType<typeof setInterval> | undefined;
  // 频谱数据
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  // 其他数据
  private testNumber: number = 0;
  private message: MessageReactive | null = null;
  constructor() {
    // 创建播放器实例
    this.player = new Howl({ src: [""], format: allowPlayFormat, autoplay: false });
    // 初始化媒体会话
    this.initMediaSession();
  }
  /**
   * 重置状态
   */
  async resetStatus() {
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    // 停止播放
    this.player?.stop();
    // 重置状态
    statusStore.$patch({
      currentTime: 0,
      duration: 0,
      progress: 0,
      currentTimeOffset: 0,
      lyricIndex: -1,
      playStatus: false,
      playLoading: false,
    });
    musicStore.$patch({
      playPlaylistId: 0,
      playSong: {},
    });
    // 延时防止 bug
    await sleep(50);
  }
  /**
   * 清理播放器
   */
  private async cleanPlayer() {
    Howler.unload();
    // this.player?.stop();
    // this.player?.unload();
    // 延时防止 bug
    await sleep(50);
  }
  /**
   * 获取当前播放歌曲
   * @returns 当前播放歌曲
   */
  private getPlaySongData(): SongType | null {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 若为私人FM
    if (statusStore.personalFmMode) {
      return musicStore.personalFMSong;
    }
    // 播放列表
    const playlist = dataStore.playList;
    if (!playlist.length) return null;
    return playlist[statusStore.playIndex];
  }
  /**
   * 获取淡入淡出时间
   * @returns 播放音量
   */
  private getFadeTime(): number {
    const settingStore = useSettingStore();
    const { songVolumeFade, songVolumeFadeTime } = settingStore;
    return songVolumeFade ? songVolumeFadeTime : 0;
  }
  /**
   * 处理播放状态
   */
  private handlePlayStatus() {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 清理定时器
    clearInterval(this.playerInterval);
    // 更新播放状态
    this.playerInterval = setInterval(() => {
      if (!this.player.playing()) return;
      const currentTime = this.getSeek();
      const duration = this.player.duration();
      // 计算进度条距离
      const progress = calculateProgress(currentTime, duration);
      // 计算歌词索引
      const hasYrc = !musicStore.songLyric.yrcData.length || !settingStore.showYrc;
      const lyrics = hasYrc ? musicStore.songLyric.lrcData : musicStore.songLyric.yrcData;
      // 歌词实时偏移量
      const currentTimeOffset = statusStore.currentTimeOffset;
      const index = lyrics?.findIndex((v) => v?.time >= currentTime + currentTimeOffset);
      // 歌词跨界处理
      const lyricIndex = index === -1 ? lyrics.length - 1 : index - 1;
      // 更新状态
      statusStore.$patch({
        currentTime,
        duration,
        progress,
        lyricIndex,
      });
      // 客户端事件
      if (isElectron) {
        // 歌词变化
        window.electron.ipcRenderer.send("play-lyric-change", {
          index: lyricIndex,
          lyric: cloneDeep(
            settingStore.showYrc && musicStore.songLyric.yrcData?.length
              ? musicStore.songLyric.yrcData
              : musicStore.songLyric.lrcData,
          ),
        });
        // 进度条
        if (settingStore.showTaskbarProgress) {
          window.electron.ipcRenderer.send("set-bar", progress);
        }
      }
    }, 500);
  }
  /**
   * 获取在线播放链接
   * @param id 歌曲id
   * @returns 播放链接
   */
  private async getOnlineUrl(id: number): Promise<string | null> {
    const settingStore = useSettingStore();
    const res = await songUrl(id, settingStore.songLevel);
    console.log(`🌐 ${id} music data:`, res);
    const songData = res.data?.[0];
    // 是否有播放地址
    if (!songData || !songData?.url) return null;
    // 是否仅能试听
    if (songData?.freeTrialInfo !== null) {
      if (settingStore.playSongDemo) {
        window.$message.warning("当前歌曲仅可试听，请开通会员后重试");
      } else return null;
    }
    // 返回歌曲地址
    // 客户端直接返回，网页端转 https
    const url = isElectron ? songData.url : songData.url.replace(/^http:/, "https:");
    return url;
  }
  /**
   * 获取解锁播放链接
   * @param songData 歌曲数据
   * @returns
   */
  private async getUnlockSongUrl(songData: SongType): Promise<string | null> {
    try {
      const songId = songData.id;
      const artist = Array.isArray(songData.artists) ? songData.artists[0].name : songData.artists;
      const keyWord = songData.name + "-" + artist;
      if (!songId || !keyWord) return null;
      // 尝试解锁
      const [neteaseUrl, kuwoUrl] = await Promise.all([
        unlockSongUrl(songId, keyWord, "netease"),
        unlockSongUrl(songId, keyWord, "kuwo"),
      ]);
      if (neteaseUrl.code === 200 && neteaseUrl.url !== "") return neteaseUrl.url;
      if (kuwoUrl.code === 200 && kuwoUrl.url !== "") return kuwoUrl.url;
      return null;
    } catch (error) {
      console.error("Error in getUnlockSongUrl", error);
      return null;
    }
  }
  /**
   * 创建播放器
   * @param src 播放地址
   * @param autoPlay 是否自动播放
   */
  private async createPlayer(src: string, autoPlay: boolean = true) {
    // 获取数据
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 播放信息
    const { id, path, type } = musicStore.playSong;
    // 清理播放器
    await this.cleanPlayer();
    // 禁用自动解锁
    Howler.autoUnlock = false;
    // 创建播放器
    this.player = new Howl({
      src,
      format: allowPlayFormat,
      html5: true,
      autoplay: autoPlay,
      preload: "metadata",
      pool: 1,
      volume: statusStore.playVolume,
      rate: statusStore.playRate,
    });
    // 播放器事件
    this.playerEvent();
    // 播放设备
    if (!settingStore.showSpectrums) this.toggleOutputDevice();
    // 自动播放
    if (autoPlay) this.play();
    // 获取歌词数据 - 非电台和本地
    if (type !== "radio" && !path) this.getLyricData(id);
    else resetSongLyric();
    // 定时获取状态
    if (!this.playerInterval) this.handlePlayStatus();
    // 新增播放历史
    if (type !== "radio") dataStore.setHistory(musicStore.playSong);
    // 获取歌曲封面主色
    if (!path) this.getCoverColor(musicStore.songCover);
    // 更新 MediaSession
    if (!path) this.updateMediaSession();
    // 开发模式
    if (isDev) window.player = this.player;
  }
  /**
   * 播放器事件
   */
  private playerEvent() {
    // 获取数据
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const playSongData = this.getPlaySongData();
    // 初次加载
    this.player.once("load", () => {
      // 允许跨域
      const audioDom = this.getAudioDom();
      audioDom.crossOrigin = "anonymous";
      // 恢复进度（ 需距离本曲结束大于 2 秒 ）
      if (settingStore.memoryLastSeek && statusStore.duration - statusStore.currentTime > 2) {
        this.setSeek(statusStore.currentTime);
      } else {
        this.setSeek(0);
      }
      // 更新状态
      statusStore.playLoading = false;
      // ipc
      if (isElectron) {
        window.electron.ipcRenderer.send("play-song-change", this.getPlayerInfo());
        window.electron.ipcRenderer.send(
          "like-status-change",
          dataStore.isLikeSong(playSongData?.id || 0),
        );
      }
    });
    // 播放
    this.player.on("play", () => {
      // ipc
      if (isElectron) {
        window.electron.ipcRenderer.send("play-status-change", true);
        window.electron.ipcRenderer.send("play-song-change", this.getPlayerInfo());
      }
      // 更改标题
      if (!isElectron) window.document.title = this.getPlayerInfo() || "SPlayer";
      console.log("▶️ song play:", playSongData);
    });
    // 暂停
    this.player.on("pause", () => {
      // ipc
      if (isElectron) window.electron.ipcRenderer.send("play-status-change", false);
      // 更改标题
      if (!isElectron) window.document.title = "SPlayer";
      console.log("⏸️ song pause:", playSongData);
    });
    // 结束
    this.player.on("end", () => {
      // statusStore.playStatus = false;
      console.log("⏹️ song end:", playSongData);
      this.nextOrPrev("next");
    });
    // 错误
    this.player.on("loaderror", (sourceid, err: any) => {
      this.errorNext(err);
      console.error("❌ song error:", sourceid, playSongData, err);
    });
  }
  /**
   * 初始化 MediaSession
   */
  private initMediaSession() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => this.nextOrPrev("prev"));
    navigator.mediaSession.setActionHandler("nexttrack", () => this.nextOrPrev("next"));
    // 跳转进度
    navigator.mediaSession.setActionHandler("seekto", (event) => {
      if (event.seekTime) this.setSeek(event.seekTime);
    });
  }
  /**
   * 更新 MediaSession
   */
  private updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    // 获取播放数据
    const playSongData = this.getPlaySongData();
    if (!playSongData) return;
    // 播放状态
    const isRadio = playSongData.type === "radio";
    // 获取数据
    const metaData: MediaMetadataInit = {
      title: playSongData.name,
      artist: isRadio
        ? "播客电台"
        : // 非本地歌曲且歌手列表为数组
          Array.isArray(playSongData.artists)
          ? playSongData.artists.map((item) => item.name).join(" / ")
          : String(playSongData.artists),
      album: isRadio
        ? "播客电台"
        : // 是否为对象
          typeof playSongData.album === "object"
          ? playSongData.album.name
          : String(playSongData.album),
      artwork: settingStore.smtcOutputHighQualityCover
        ? [
            {
              src: musicStore.getSongCover("xl"),
              sizes: "1920x1920",
              type: "image/jpeg",
            },
          ]
        : [
            {
              src: musicStore.getSongCover("cover"),
              sizes: "512x512",
              type: "image/jpeg",
            },
            {
              src: musicStore.getSongCover("s"),
              sizes: "100x100",
              type: "image/jpeg",
            },
            {
              src: musicStore.getSongCover("m"),
              sizes: "300x300",
              type: "image/jpeg",
            },
            {
              src: musicStore.getSongCover("l"),
              sizes: "1024x1024",
              type: "image/jpeg",
            },
            {
              src: musicStore.getSongCover("xl"),
              sizes: "1920x1920",
              type: "image/jpeg",
            },
          ],
    };
    // 更新数据
    navigator.mediaSession.metadata = new window.MediaMetadata(metaData);
  }
  // 生成频谱数据
  private generateSpectrumData() {
    const statusStore = useStatusStore();
    if (!this.analyser || !this.dataArray) {
      this.initSpectrumData();
    }
    // 更新频谱数据
    const updateSpectrumData = () => {
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        // 保存数据
        statusStore.spectrumsData = Array.from(this.dataArray);
      }
      requestAnimationFrame(updateSpectrumData);
    };
    updateSpectrumData();
  }
  /**
   * 获取歌词
   * @param id 歌曲id
   */
  private async getLyricData(id: number) {
    if (!id) {
      resetSongLyric();
      return;
    }
    const lyricRes = await songLyric(id);
    parsedLyricsData(lyricRes);
  }
  /**
   * 播放错误
   * 在播放错误时，播放下一首
   */
  private errorNext(errCode?: number) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    // 错误 2 通常为网络地址过期
    if (errCode === 2) {
      // 替换播放链接
    }
    // 清除进度
    // this.resetStatus();
    // statusStore.playStatus = false;
    // ipc
    // if (isElectron) window.electron.ipcRenderer.send("play-status-change", false);
    // 次数加一
    this.testNumber++;
    if (this.testNumber > 5) {
      this.testNumber = 0;
      statusStore.playLoading = false;
      window.$message.error("当前重试次数过多，请稍后再试");
      return;
    }
    // 播放下一曲
    if (dataStore.playList.length > 1) {
      this.nextOrPrev("next");
    } else {
      statusStore.playStatus = false;
      window.$message.error("当前列表暂无可播放歌曲");
    }
  }
  /**
   * 获取 Audio Dom
   */
  private getAudioDom() {
    const audioDom = (this.player as any)._sounds[0]._node;
    if (!audioDom) {
      throw new Error("Audio Dom is null");
    }
    return audioDom;
  }
  /**
   * 获取本地歌曲元信息
   * @param path 歌曲路径
   */
  private async parseLocalMusicInfo(path: string) {
    try {
      const musicStore = useMusicStore();
      // 获取封面数据
      const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", path);
      if (coverData) {
        const { data, format } = coverData;
        const blobURL = blob.createBlobURL(data, format, path);
        if (blobURL) {
          musicStore.playSong.cover = blobURL;
        }
      } else {
        musicStore.playSong.cover = "/images/song.jpg?assest";
      }
      // 获取主色
      this.getCoverColor(musicStore.playSong.cover);
      // 获取歌词数据
      const lrcData = await window.electron.ipcRenderer.invoke("get-music-lyric", path);
      parseLocalLyric(lrcData);
      // 更新媒体会话
      this.updateMediaSession();
    } catch (error) {
      window.$message.error("获取本地歌曲元信息失败");
      console.error("Failed to parse local music info:", error);
    }
  }
  /**
   * 获取播放信息
   * @param song 歌曲
   * @param sep 分隔符
   * @returns 播放信息
   */
  getPlayerInfo(song?: SongType, sep: string = "/"): string | null {
    const playSongData = song || this.getPlaySongData();
    if (!playSongData) return null;
    // 标题
    const title = `${playSongData.name || "未知歌曲"}`;
    // 歌手
    const artist =
      playSongData.type === "radio"
        ? "播客电台"
        : Array.isArray(playSongData.artists)
          ? playSongData.artists.map((artists: { name: string }) => artists.name).join(sep)
          : String(playSongData?.artists || "未知歌手");
    return `${title} - ${artist}`;
  }
  /**
   * 初始化播放器
   * 核心外部调用
   * @param autoPlay 是否自动播放
   */
  async initPlayer(autoPlay: boolean = true) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    try {
      // 获取播放数据
      const playSongData = this.getPlaySongData();
      if (!playSongData) return;
      const { id, dj, path, type } = playSongData;
      // 清理播放器
      // this.cleanPlayer();
      // 更改当前播放歌曲
      musicStore.playSong = playSongData;
      // 更改状态
      statusStore.playLoading = true;
      // 本地歌曲
      if (path) {
        await this.createPlayer(path, autoPlay);
        // 获取歌曲元信息
        await this.parseLocalMusicInfo(path);
      }
      // 在线歌曲
      else if (id && dataStore.playList.length) {
        const songId = type === "radio" ? dj?.id : id;
        if (!songId) throw new Error("Get song id error");
        const url = await this.getOnlineUrl(songId);
        // 正常播放地址
        if (url) {
          statusStore.playUblock = false;
          await this.createPlayer(url, autoPlay);
        }
        // 尝试解灰
        else if (isElectron && type !== "radio" && settingStore.useSongUnlock) {
          const unlockUrl = await this.getUnlockSongUrl(playSongData);
          if (unlockUrl) {
            statusStore.playUblock = true;
            console.log("🎼 Song unlock successfully:", unlockUrl);
            await this.createPlayer(unlockUrl, autoPlay);
          } else {
            statusStore.playUblock = false;
            // 是否为最后一首
            if (statusStore.playIndex === dataStore.playList.length - 1) {
              statusStore.$patch({ playStatus: false, playLoading: false });
              window.$message.warning("当前列表歌曲无法播放，请更换歌曲");
            } else {
              window.$message.error("该歌曲暂无音源，跳至下一首");
              this.nextOrPrev("next");
            }
          }
        } else {
          if (dataStore.playList.length === 1) {
            // this.cleanPlayer();
            await this.resetStatus();
            window.$message.warning("当前播放列表已无可播放歌曲，请更换");
            return;
          } else {
            window.$message.error("该歌曲无法播放，跳至下一首");
            this.nextOrPrev();
            return;
          }
        }
      }
    } catch (error) {
      console.error("❌ 初始化音乐播放器出错：", error);
      window.$message.error("播放器遇到错误，请尝试软件热重载");
      // this.errorNext();
    }
  }
  /**
   * 播放
   * @param fade 是否淡入
   */
  play(fade: boolean = true) {
    const statusStore = useStatusStore();
    if (this.player.playing()) {
      statusStore.playStatus = true;
      return;
    }
    this.player.play();
    statusStore.playStatus = true;
    this.player.once("play", () => {
      this.player.fade(0, statusStore.playVolume, fade ? this.getFadeTime() : 0);
    });
  }
  /**
   * 暂停
   * @param fade 是否淡出
   */
  pause(fade: boolean = true) {
    const statusStore = useStatusStore();
    this.player.fade(statusStore.playVolume, 0, fade ? this.getFadeTime() : 0);
    this.player.once("fade", () => {
      this.player.pause();
      statusStore.playStatus = false;
    });
  }
  /**
   * 播放或暂停
   */
  playOrPause() {
    const statusStore = useStatusStore();
    if (statusStore.playStatus) this.pause();
    else this.play();
  }
  /**
   * 下一首或上一首
   * @param type 切换类别 next 下一首 prev 上一首
   * @param play 是否立即播放
   */
  async nextOrPrev(type: "next" | "prev" = "next", play: boolean = true) {
    const statusStore = useStatusStore();
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    // 获取数据
    const { playList } = dataStore;
    const { playSong } = musicStore;
    const { playSongMode, playHeartbeatMode } = statusStore;
    // 列表长度
    const playListLength = playList.length;
    // 播放列表是否为空
    if (playListLength === 0) throw new Error("The play list is empty");
    // 打卡
    this.scrobbleSong();
    // 若为私人FM
    if (statusStore.personalFmMode) {
      await this.initPersonalFM(true);
      return;
    }
    // 只有一首歌的特殊处理
    if (playListLength === 1) {
      this.setSeek(0);
      statusStore.lyricIndex = -1;
      const songData = playList[0];
      if (!songData) throw new Error("The song data is not found");
      musicStore.playSong = songData;
      await this.initPlayer(play);
      return;
    }
    // 列表循环或处于心动模式
    if (playSongMode === "repeat" || playHeartbeatMode || playSong.type === "radio") {
      statusStore.playIndex += type === "next" ? 1 : -1;
    }
    // 随机播放
    else if (playSongMode === "shuffle") {
      let newIndex: number;
      // 确保不会随机到同一首
      do {
        newIndex = Math.floor(Math.random() * playListLength);
      } while (newIndex === statusStore.playIndex);
      statusStore.playIndex = newIndex;
    }
    // 单曲循环
    else if (playSongMode === "repeat-once") {
      statusStore.lyricIndex = -1;
      this.setSeek(0);
      this.play();
      return;
    } else {
      throw new Error("The play mode is not supported");
    }
    // 索引是否越界
    if (statusStore.playIndex < 0) {
      statusStore.playIndex = playListLength - 1;
    } else if (statusStore.playIndex >= playListLength) {
      statusStore.playIndex = 0;
    }
    // 停止播放
    await this.resetStatus();
    // 初始化播放器
    this.initPlayer(play);
  }
  /**
   * 切换播放模式
   * @param mode 播放模式 repeat repeat-once shuffle
   */
  togglePlayMode(mode: PlayModeType | false) {
    const statusStore = useStatusStore();
    // 退出心动模式
    if (statusStore.playHeartbeatMode) this.toggleHeartMode(false);
    // 若传入了指定模式
    if (mode) {
      statusStore.playSongMode = mode;
    } else {
      switch (statusStore.playSongMode) {
        case "repeat":
          statusStore.playSongMode = "repeat-once";
          break;
        case "shuffle":
          statusStore.playSongMode = "repeat";
          break;
        case "repeat-once":
          statusStore.playSongMode = "shuffle";
          break;
        default:
          statusStore.playSongMode = "repeat";
      }
    }
    this.playModeSyncIpc();
  }
  /**
   * 播放模式同步 ipc
   */
  playModeSyncIpc() {
    const statusStore = useStatusStore();
    if (isElectron) {
      window.electron.ipcRenderer.send("play-mode-change", statusStore.playSongMode);
    }
  }
  /**
   * 设置播放进度
   * @param time 播放进度
   */
  setSeek(time: number) {
    const statusStore = useStatusStore();
    this.player.seek(time);
    statusStore.currentTime = time;
  }
  /**
   * 获取播放进度
   * @returns 播放进度
   */
  getSeek(): number {
    return this.player.seek();
  }
  /**
   * 设置播放速率
   * @param rate 播放速率
   */
  setRate(rate: number) {
    const statusStore = useStatusStore();
    this.player.rate(rate);
    statusStore.playRate = rate;
  }
  /**
   * 设置播放音量
   * @param volume 音量
   */
  setVolume(volume: number | "up" | "down") {
    const statusStore = useStatusStore();
    // 直接设置
    if (typeof volume === "number") {
      volume = Math.max(0, Math.min(volume, 1));
    } else {
      const increment = 0.05;
      statusStore.playVolume = Math.max(
        0,
        Math.min(statusStore.playVolume + (volume === "up" ? increment : -increment), 1),
      );
    }
    // 调整音量
    this.player.volume(statusStore.playVolume);
  }
  /**
   * 切换静音
   */
  toggleMute() {
    const statusStore = useStatusStore();
    // 是否静音
    const isMuted = statusStore.playVolume === 0;
    // 恢复音量
    if (isMuted) {
      statusStore.playVolume = statusStore.playVolumeMute;
    }
    // 保存当前音量并静音
    else {
      statusStore.playVolumeMute = this.player.volume();
      statusStore.playVolume = 0;
    }
    this.player.volume(statusStore.playVolume);
  }
  /**
   * 获取歌曲封面颜色数据
   * @param coverUrl 歌曲封面地址
   */
  async getCoverColor(coverUrl: string) {
    if (!coverUrl) return;
    const statusStore = useStatusStore();
    // 创建图像元素
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = coverUrl;
    // 图像加载完成
    image.onload = () => {
      // 获取图片数据
      const coverColorData = getCoverColorData(image);
      if (coverColorData) statusStore.songCoverTheme = coverColorData;
      // 移除元素
      image.remove();
    };
  }
  /**
   * 更新播放列表
   * @param data 播放列表
   * @param song 当前播放歌曲
   * @param pid 播放列表id
   * @param options 配置
   * @param options.showTip 是否显示提示
   * @param options.scrobble 是否打卡
   * @param options.play 是否直接播放
   */
  async updatePlayList(
    data: SongType[],
    song?: SongType,
    pid?: number,
    options: {
      showTip?: boolean;
      scrobble?: boolean;
      play?: boolean;
    } = {
      showTip: true,
      scrobble: true,
      play: true,
    },
  ) {
    if (!data || !data.length) return;
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 获取配置
    const { showTip, scrobble, play } = options;
    // 打卡
    if (scrobble) this.scrobbleSong();
    // 更新列表
    await dataStore.setPlayList(cloneDeep(data));
    // 关闭特殊模式
    if (statusStore.playHeartbeatMode) this.toggleHeartMode(false);
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;
    // 是否直接播放
    if (song && typeof song === "object" && "id" in song) {
      // 是否为当前播放歌曲
      if (musicStore.playSong.id === song.id) {
        if (play) this.play();
      } else {
        // 查找索引
        const playIndex = data.findIndex((item) => item.id === song.id);
        statusStore.$patch({ playIndex, lyricIndex: -1 });
        // 清理并播放
        await this.resetStatus();
        await this.initPlayer();
      }
    } else {
      const playIndex =
        statusStore.playSongMode === "shuffle" ? Math.floor(Math.random() * data.length) : 0;
      statusStore.$patch({ playIndex, lyricIndex: -1 });
      // 清理并播放
      await this.resetStatus();
      await this.initPlayer();
    }
    // 更改播放歌单
    musicStore.playPlaylistId = pid ?? 0;
    if (showTip) window.$message.success("已开始播放");
  }
  /**
   * 添加下一首歌曲
   * @param song 歌曲
   * @param play 是否立即播放
   */
  async addNextSong(song: SongType, play: boolean = false) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 关闭特殊模式
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;
    // 是否为当前播放歌曲
    if (musicStore.playSong.id === song.id) {
      this.play();
      window.$message.success("已开始播放");
      return;
    }
    // 尝试添加
    const songIndex = await dataStore.setNextPlaySong(song, statusStore.playIndex);
    // 播放歌曲
    if (!songIndex) return;
    if (play) this.togglePlayIndex(songIndex);
    else window.$message.success("已添加至下一首播放");
  }
  /**
   * 切换播放索引
   * @param index 播放索引
   */
  togglePlayIndex(index: number) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    // 获取数据
    const { playList } = dataStore;
    // 若超出播放列表
    if (index >= playList.length) return;
    // 相同
    if (statusStore.playIndex === index) {
      this.play();
      return;
    }
    // 更改状态
    this.setSeek(0);
    statusStore.playIndex = index;
    this.initPlayer();
  }
  /**
   * 移除指定歌曲
   * @param index 歌曲索引
   */
  removeSongIndex(index: number) {
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
    // 深拷贝，防止影响原数据
    const newPlaylist = cloneDeep(playList);
    // 若将移除最后一首
    if (index === playList.length - 1) {
      statusStore.playIndex = 0;
    }
    // 若为当前播放之后
    else if (statusStore.playIndex > index) {
      statusStore.playIndex--;
    }
    // 移除指定歌曲
    newPlaylist.splice(index, 1);
    dataStore.setPlayList(newPlaylist);
    // 若为当前播放
    if (statusStore.playIndex === index) {
      this.initPlayer(statusStore.playStatus);
    }
  }
  /**
   * 清空播放列表
   */
  async cleanPlayList() {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 停止播放
    await this.resetStatus();
    await this.cleanPlayer();
    // 清空数据
    statusStore.$patch({
      playListShow: false,
      showFullPlayer: false,
      playHeartbeatMode: false,
      personalFmMode: false,
    });
    musicStore.resetMusicData();
    dataStore.setPlayList([]);
    window.$message.success("已清空播放列表");
  }
  /**
   * 切换输出设备
   * @param deviceId 输出设备
   */
  toggleOutputDevice(deviceId?: string) {
    try {
      const settingStore = useSettingStore();
      // 输出设备
      const devices = deviceId ?? settingStore.playDevice;
      if (!(this.player as any)?._sounds.length) return;
      // 获取音频元素
      const audioDom = this.getAudioDom();
      // 设置输出设备
      if (devices && audioDom?.setSinkId) {
        audioDom.setSinkId(devices);
      }
    } catch (error) {
      console.error("Failed to change audio output device:", error);
    }
  }
  /**
   * 初始化音频可视化
   */
  initSpectrumData() {
    try {
      if (this.audioContext) return;
      // AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // 获取音频元素
      const audioDom = this.getAudioDom();
      // 媒体元素源
      this.source = this.audioContext.createMediaElementSource(audioDom);
      // AnalyserNode
      this.analyser = this.audioContext.createAnalyser();
      // 频谱分析器 FFT
      this.analyser.fftSize = 512;
      // 连接源和分析节点
      this.source.connect(this.analyser);
      // 连接分析节点到 AudioContext
      this.analyser.connect(this.audioContext.destination);
      // 配置 AnalyserNode
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      // 更新频谱数据
      this.generateSpectrumData();
      console.log("🎼 Initialize music spectrum successfully");
    } catch (error) {
      console.error("🎼 Initialize music spectrum failed:", error);
    }
  }
  /**
   * 切换桌面歌词
   */
  toggleDesktopLyric() {
    const statusStore = useStatusStore();
    const show = !statusStore.showDesktopLyric;
    statusStore.showDesktopLyric = show;
    window.electron.ipcRenderer.send("change-desktop-lyric", show);
    window.$message.success(`${show ? "已开启" : "已关闭"}桌面歌词`);
  }
  /**
   * 切换心动模式
   * @param open 是否开启
   */
  async toggleHeartMode(open: boolean = true) {
    try {
      const dataStore = useDataStore();
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      if (!open && statusStore.playHeartbeatMode) {
        statusStore.playHeartbeatMode = false;
        window.$message.success("已退出心动模式");
        return;
      }
      if (!isLogin()) {
        openUserLogin(true);
        return;
      }
      if (statusStore.playHeartbeatMode) {
        window.$message.warning("已处于心动模式");
        this.play();
        return;
      }
      this.message?.destroy();
      this.message = window.$message.loading("心动模式开启中", { duration: 0 });
      // 获取所需数据
      const playSongData = this.getPlaySongData();
      const likeSongsList: any = await dataStore.getUserLikePlaylist();
      // if (!playSongData || !likeSongsList) {
      //   throw new Error("获取播放数据或喜欢列表失败");
      // }
      const pid =
        musicStore.playPlaylistId && musicStore.playPlaylistId !== 0
          ? musicStore.playPlaylistId
          : likeSongsList?.detail?.id;
      // 开启心动模式
      const result = await heartRateList(playSongData?.id || 0, pid);
      if (result.code === 200) {
        this.message?.destroy();
        const heartRatelists = formatSongsList(result.data);
        // 更新播放列表
        await this.updatePlayList(heartRatelists, heartRatelists[0]);
        // 更改模式
        statusStore.playHeartbeatMode = true;
      } else {
        this.message?.destroy();
        window.$message.error(result.message || "心动模式开启出错，请重试");
      }
    } catch (error) {
      console.error("Failed to toggle heart mode:", error);
      this.message?.destroy();
      window.$message.error("心动模式开启出错，请重试");
    } finally {
      this.message?.destroy();
    }
  }
  /**
   * 听歌打卡
   */
  async scrobbleSong() {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    try {
      if (!isLogin()) return;
      if (!settingStore.scrobbleSong) return;
      // 获取所需数据
      const playSongData = this.getPlaySongData();
      if (!playSongData) return;
      const { id, name } = playSongData;
      const sourceid = musicStore.playPlaylistId;
      const time = statusStore.duration;
      // 网易云打卡
      console.log("打卡：", id, name, sourceid, time);
      await scrobble(id, sourceid, time);
    } catch (error) {
      console.error("Failed to scrobble song:", error);
    }
  }
  /**
   * 初始化私人FM
   * @param playNext 是否播放下一首
   */
  async initPersonalFM(playNext: boolean = false) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    try {
      // 获取并重置
      const getPersonalFmData = async () => {
        const result = await personalFm();
        const songData = formatSongsList(result.data);
        console.log(`🌐 personal FM:`, songData);
        musicStore.personalFM.list = songData;
        musicStore.personalFM.playIndex = 0;
      };
      // 若为空
      if (musicStore.personalFM.list.length === 0) await getPersonalFmData();
      // 若需播放下一首
      if (playNext) {
        statusStore.personalFmMode = true;
        // 更改索引
        if (musicStore.personalFM.playIndex < musicStore.personalFM.list.length - 1) {
          musicStore.personalFM.playIndex++;
        } else {
          await getPersonalFmData();
        }
        // 清理并播放
        await this.resetStatus();
        this.initPlayer();
      }
    } catch (error) {
      console.error("Failed to initialize personal FM:", error);
    }
  }
  /**
   * 私人FM - 垃圾桶
   * @param id 歌曲id
   */
  async personalFMTrash(id: number) {
    try {
      const statusStore = useStatusStore();
      if (!isLogin()) {
        openUserLogin(true);
        return;
      }
      // 更改模式
      statusStore.personalFmMode = true;
      statusStore.playHeartbeatMode = false;
      // 加入回收站
      const result = await personalFmToTrash(id);
      if (result.code === 200) {
        window.$message.success("已移至垃圾桶");
        this.nextOrPrev("next");
      }
    } catch (error) {
      console.error("Error adding to trash:", error);
      window.$message.error("移至垃圾桶失败，请重试");
    }
  }
}

export default new Player();
