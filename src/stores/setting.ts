import { defineStore } from "pinia";
import { keywords, regexes } from "@/assets/data/exclude";
import { SongUnlockServer } from "@/utils/songManager";

export interface SettingState {
  /** 明暗模式 */
  themeMode: "light" | "dark" | "auto";
  /** 主题类别 */
  themeColorType:
  | "default"
  | "orange"
  | "blue"
  | "pink"
  | "brown"
  | "indigo"
  | "green"
  | "purple"
  | "yellow"
  | "teal"
  | "custom";
  /** 主题自定义颜色 */
  themeCustomColor: string;
  /** 全局着色 */
  themeGlobalColor: boolean;
  /** 主题跟随封面 */
  themeFollowCover: boolean;
  /** 全局字体 */
  globalFont: "default" | string;
  /** 歌词区域字体 */
  LyricFont: "follow" | string;
  /** 日语歌词字体 */
  japaneseLyricFont: "follow" | string;
  /** 隐藏 VIP 标签 */
  showCloseAppTip: boolean;
  /** 关闭应用方式 */
  closeAppMethod: "exit" | "hide";
  /** 显示任务栏进度 */
  showTaskbarProgress: boolean;
  /** 是否使用在线服务 */
  useOnlineService: boolean;
  /** 启动时检查更新 */
  checkUpdateOnStart: boolean;
  /** 隐藏 VIP 标签 */
  hideVipTag: boolean;
  /** 歌词字体大小 */
  lyricFontSize: number;
  /** 歌词翻译字体大小 */
  lyricTranFontSize: number;
  /** 歌词音译字体大小 */
  lyricRomaFontSize: number;
  /** 歌词字体加粗 */
  lyricFontBold: boolean;
  /** 显示逐字歌词 */
  showYrc: boolean;
  /** 显示逐字歌词动画 */
  showYrcAnimation: boolean;
  /** 显示逐字歌词长音发光效果 */
  showYrcLongEffect: boolean;
  /** 显示歌词翻译 */
  showTran: boolean;
  /** 显示歌词音译 */
  showRoma: boolean;
  /** 歌词位置 */
  lyricsPosition: "flex-start" | "center" | "flex-end";
  /** 歌词滚动位置 */
  lyricsScrollPosition: "start" | "center";
  /** 下载路径 */
  downloadPath: string;
  /** 下载元信息 */
  downloadMeta: boolean;
  /** 下载封面 */
  downloadCover: boolean;
  /** 下载歌词 */
  downloadLyric: boolean;
  /** 保存元信息文件 */
  saveMetaFile: boolean;
  /** 代理协议 */
  proxyProtocol: "off" | "http" | "https";
  /** 代理地址 */
  proxyServe: string;
  /** 代理端口 */
  proxyPort: number;
  /** 歌曲音质 */
  songLevel:
  | "standard"
  | "higher"
  | "exhigh"
  | "lossless"
  | "hires"
  | "jyeffect"
  | "sky"
  | "jymaster";
  /** 播放设备 */
  playDevice: "default" | string;
  /** 自动播放 */
  autoPlay: boolean;
  /** 渐入渐出 */
  songVolumeFade: boolean;
  /** 渐入渐出时间 */
  songVolumeFadeTime: number;
  /** 是否使用解灰 */
  useSongUnlock: boolean;
  /** 歌曲解锁音源 */
  songUnlockServer: { key: SongUnlockServer; enabled: boolean }[];
  /** 显示倒计时 */
  countDownShow: boolean;
  /** 显示歌词条 */
  barLyricShow: boolean;
  /** 播放器类型 */
  playerType: "cover" | "record";
  /** 背景类型 */
  playerBackgroundType: "none" | "animation" | "blur" | "color";
  /** 背景动画帧率 */
  playerBackgroundFps: number;
  /** 背景动画流动速度 */
  playerBackgroundFlowSpeed: number;
  /** 记忆最后进度 */
  memoryLastSeek: boolean;
  /** 显示播放列表数量 */
  showPlaylistCount: boolean;
  /** 是否显示音乐频谱 */
  showSpectrums: boolean;
  /** 是否开启 SMTC */
  smtcOpen: boolean;
  /** 歌词模糊 */
  lyricsBlur: boolean;
  /** 鼠标悬停暂停 */
  lrcMousePause: boolean;
  /** 播放试听 */
  playSongDemo: boolean;
  /** 显示搜索历史 */
  showSearchHistory: boolean;
  /** 是否使用 AM 歌词 */
  useAMLyrics: boolean;
  /** 是否使用 AM 歌词弹簧效果 */
  useAMSpring: boolean;
  /** 是否启用在线 TTML 歌词 */
  enableTTMLLyric: boolean;
  /** 菜单显示封面 */
  menuShowCover: boolean;
  /** 菜单展开项 */
  menuExpandedKeys: string[];
  /** 是否禁止休眠 */
  preventSleep: boolean;
  /** 本地文件路径 */
  localFilesPath: string[];
  /** 本地歌词路径 */
  localLyricPath: string[];
  /** 本地文件分隔符 */
  localSeparators: string[];
  /** 显示本地封面 */
  showLocalCover: boolean;
  /** 路由动画 */
  routeAnimation: "none" | "fade" | "zoom" | "slide" | "up";
  /** 是否使用真实 IP */
  useRealIP: boolean;
  /** 真实 IP 地址 */
  realIP: string;
  /** 是否打卡歌曲 */
  scrobbleSong: boolean;
  /** 动态封面 */
  dynamicCover: boolean;
  /** 是否使用 keep-alive */
  useKeepAlive: boolean;
  /** 是否启用排除歌词 */
  enableExcludeLyrics: boolean;
  /** 「排除歌词」是否适用于 TTML */
  enableExcludeTTML: boolean;
  /** 「排除歌词」是否适用于本地歌词 */
  enableExcludeLocalLyrics: boolean;
  /** 排除歌词关键字 */
  excludeKeywords: string[];
  /** 排除歌词正则表达式 */
  excludeRegexes: string[];
  /** 显示默认本地路径 */
  showDefaultLocalPath: boolean;
  /** 展示当前歌曲歌词状态信息 */
  showPlayMeta: boolean;
  /** 显示歌曲音质 */
  showSongQuality: boolean;
  /** 显示歌曲特权标签 */
  showSongPrivilegeTag: boolean;
  /** 显示原唱翻唱标签 */
  showSongOriginalTag: boolean;
  /** 隐藏发现音乐 */
  hideDiscover: boolean;
  /** 隐藏私人漫游 */
  hidePersonalFM: boolean;
  /** 隐藏播客电台 */
  hideRadioHot: boolean;
  /** 隐藏我的收藏 */
  hideLike: boolean;
  /** 隐藏我的云盘 */
  hideCloud: boolean;
  /** 隐藏本地歌曲 */
  hideLocal: boolean;
  /** 隐藏最近播放 */
  hideHistory: boolean;
  /** 隐藏创建的歌单 */
  hideUserPlaylists: boolean;
  /** 隐藏收藏的歌单 */
  hideLikedPlaylists: boolean;
  /** 隐藏心动模式 */
  hideHeartbeatMode: boolean;
  /** 启用搜索关键词获取 */
  enableSearchKeyword: boolean;
  /** 应用启动次数 */
  appLaunchCount: number;
  /** 隐藏 Star 弹窗 */
  hideStarPopup: boolean;
  /** 首页栏目顺序和显示配置 */
  homePageSections: Array<{
    key: "playlist" | "radar" | "artist" | "video" | "radio" | "album";
    name: string;
    visible: boolean;
    order: number;
  }>;
}

export const useSettingStore = defineStore("setting", {
  state: (): SettingState => ({
    themeMode: "auto",
    themeColorType: "default",
    themeCustomColor: "#fe7971",
    themeFollowCover: false,
    themeGlobalColor: false,
    globalFont: "default",
    LyricFont: "follow",
    japaneseLyricFont: "follow",
    hideVipTag: false,
    showSearchHistory: true,
    menuShowCover: true,
    menuExpandedKeys: [],
    routeAnimation: "slide",
    useOnlineService: true,
    showCloseAppTip: true,
    closeAppMethod: "hide",
    showTaskbarProgress: false,
    checkUpdateOnStart: true,
    preventSleep: false,
    useKeepAlive: true,
    songLevel: "exhigh",
    playDevice: "default",
    autoPlay: false,
    songVolumeFade: true,
    songVolumeFadeTime: 300,
    useSongUnlock: true,
    songUnlockServer: [
      { key: SongUnlockServer.BODIAN, enabled: true },
      { key: SongUnlockServer.GEQUBAO, enabled: true },
      { key: SongUnlockServer.NETEASE, enabled: true },
    ],
    countDownShow: true,
    barLyricShow: true,
    playerType: "cover",
    playerBackgroundType: "blur",
    playerBackgroundFps: 30,
    playerBackgroundFlowSpeed: 4,
    memoryLastSeek: true,
    showPlaylistCount: true,
    showSpectrums: false,
    smtcOpen: true,
    playSongDemo: false,
    scrobbleSong: false,
    dynamicCover: false,
    lyricFontSize: 46,
    lyricTranFontSize: 22,
    lyricRomaFontSize: 18,
    lyricFontBold: true,
    useAMLyrics: false,
    useAMSpring: false,
    enableTTMLLyric: true,
    showYrc: true,
    showYrcAnimation: true,
    showYrcLongEffect: true,
    showTran: true,
    showRoma: true,
    lyricsPosition: "flex-start",
    lyricsBlur: false,
    lyricsScrollPosition: "start",
    lrcMousePause: false,
    enableExcludeLyrics: true,
    enableExcludeTTML: false,
    enableExcludeLocalLyrics: false,
    excludeKeywords: keywords,
    excludeRegexes: regexes,
    localFilesPath: [],
    localLyricPath: [],
    showDefaultLocalPath: true,
    localSeparators: ["/", "&"],
    showLocalCover: true,
    downloadPath: "",
    downloadMeta: true,
    downloadCover: true,
    downloadLyric: true,
    saveMetaFile: false,
    proxyProtocol: "off",
    proxyServe: "127.0.0.1",
    proxyPort: 80,
    useRealIP: false,
    realIP: "",
    showPlayMeta: false,
    showSongQuality: true,
    showSongPrivilegeTag: true,
    showSongOriginalTag: true,
    hideDiscover: false,
    hidePersonalFM: false,
    hideRadioHot: false,
    hideLike: false,
    hideCloud: false,
    hideLocal: false,
    hideHistory: false,
    hideUserPlaylists: false,
    hideLikedPlaylists: false,
    hideHeartbeatMode: false,
    enableSearchKeyword: true,
    appLaunchCount: 0,
    hideStarPopup: true,
    homePageSections: [
      { key: "playlist", name: "专属歌单", visible: true, order: 0 },
      { key: "radar", name: "雷达歌单", visible: true, order: 1 },
      { key: "artist", name: "歌手推荐", visible: true, order: 2 },
      { key: "video", name: "推荐 MV", visible: true, order: 3 },
      { key: "radio", name: "推荐播客", visible: true, order: 4 },
      { key: "album", name: "新碟上架", visible: true, order: 5 },
    ],
  }),
  getters: {
    /**
     * 获取淡入淡出时间
     * @returns 淡入淡出时间
     */
    getFadeTime(state): number {
      return state.songVolumeFade ? state.songVolumeFadeTime : 0;
    },
  },
  actions: {
    // 更换明暗模式
    setThemeMode(mode?: "auto" | "light" | "dark") {
      // 若未传入
      if (mode === undefined) {
        if (this.themeMode === "auto") {
          this.themeMode = "light";
        } else if (this.themeMode === "light") {
          this.themeMode = "dark";
        } else {
          this.themeMode = "auto";
        }
      } else {
        this.themeMode = mode;
      }
      window.$message.info(
        `已切换至
        ${this.themeMode === "auto"
          ? "跟随系统"
          : this.themeMode === "light"
            ? "浅色模式"
            : "深色模式"
        }`,
        {
          showIcon: false,
        },
      );
    },
  },
  // 持久化
  persist: {
    key: "setting-store",
    storage: localStorage,
  },
});
