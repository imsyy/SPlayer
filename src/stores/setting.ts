import { defineStore } from "pinia";

interface SettingState {
  themeMode: "light" | "dark" | "auto";
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
  themeCustomColor: string;
  themeGlobalColor: boolean;
  themeFollowCover: boolean;
  globalFont: "default" | string;
  LyricFont: "follow" | string;
  showCloseAppTip: boolean;
  closeAppMethod: "exit" | "hide";
  showTaskbarProgress: boolean;
  useOnlineService: boolean;
  checkUpdateOnStart: boolean;
  hideVipTag: boolean;
  lyricFontSize: number;
  lyricTranFontSize: number;
  lyricRomaFontSize: number;
  lyricFontBold: boolean;
  showYrc: boolean;
  showYrcAnimation: boolean;
  showTran: boolean;
  showRoma: boolean;
  lyricsPosition: "flex-start" | "center" | "flex-end";
  lyricsScrollPosition: "start" | "center";
  downloadPath: string;
  downloadMeta: boolean;
  downloadCover: boolean;
  downloadLyric: boolean;
  saveMetaFile: boolean;
  proxyProtocol: "off" | "http" | "https";
  proxyServe: string;
  proxyPort: number;
  songLevel:
    | "standard"
    | "higher"
    | "exhigh"
    | "lossless"
    | "hires"
    | "jyeffect"
    | "sky"
    | "jymaster";
  playDevice: "default" | string;
  autoPlay: boolean;
  songVolumeFade: boolean;
  songVolumeFadeTime: number;
  useSongUnlock: boolean;
  countDownShow: boolean;
  barLyricShow: boolean;
  playerType: "cover" | "record";
  playerBackgroundType: "none" | "animation" | "blur" | "color";
  memoryLastSeek: boolean;
  showPlaylistCount: boolean;
  showSpectrums: boolean;
  smtcOpen: boolean;
  smtcOutputHighQualityCover: boolean;
  lyricsBlur: boolean;
  lrcMousePause: boolean;
  playSongDemo: boolean;
  showSearchHistory: boolean;
  useAMLyrics: boolean;
  useAMSpring: boolean;
  menuShowCover: boolean;
  preventSleep: boolean;
  localFilesPath: string[];
  localSeparators: string[];
  showLocalCover: boolean;
  routeAnimation: "none" | "fade" | "zoom" | "slide" | "up";
  useRealIP: boolean;
  realIP: string;
}

export const useSettingStore = defineStore({
  id: "setting",
  state: (): SettingState => ({
    // 个性化
    themeMode: "auto", // 明暗模式
    themeColorType: "default", // 主题类别
    themeCustomColor: "#fe7971", // 主题自定义颜色
    themeFollowCover: false, // 主题跟随歌曲封面
    themeGlobalColor: false, // 全局着色
    globalFont: "default", // 全局字体
    LyricFont: "follow", // 歌词区域字体
    hideVipTag: false, // 隐藏 VIP 标签
    showSearchHistory: true, // 显示搜索历史
    menuShowCover: true, // 菜单显示封面
    routeAnimation: "slide", // 路由动画
    // 系统
    useOnlineService: true, // 是否使用在线服务
    showCloseAppTip: true, // 显示关闭应用提示
    closeAppMethod: "hide", // 关闭方式
    showTaskbarProgress: false, // 显示任务栏进度
    checkUpdateOnStart: true, // 启动时检查更新
    preventSleep: false, // 是否禁止休眠
    // 播放
    songLevel: "exhigh", // 音质
    playDevice: "default", // 播放设备
    autoPlay: false, // 自动播放
    songVolumeFade: true, // 渐入渐出
    songVolumeFadeTime: 300, // 渐入渐出时间
    useSongUnlock: true, // 是否使用解灰
    countDownShow: true, // 显示倒计时
    barLyricShow: true, // 显示歌词条
    playerType: "cover", // 播放器类型
    playerBackgroundType: "blur", // 背景类型
    memoryLastSeek: true, // 记忆最后进度
    showPlaylistCount: true, // 显示播放列表数量
    showSpectrums: true, // 是否显示音乐频谱
    smtcOpen: true, // 是否开启 SMTC
    smtcOutputHighQualityCover: false, // 是否输出高清封面
    playSongDemo: false, // 是否播放试听歌曲
    // 歌词
    lyricFontSize: 46, // 歌词大小
    lyricTranFontSize: 22, // 歌词翻译大小
    lyricRomaFontSize: 18, // 歌词音译大小
    lyricFontBold: true, // 歌词字体加粗
    useAMLyrics: false, // 是否使用 AM 歌词
    useAMSpring: false, // 是否使用 AM 歌词弹簧效果
    showYrc: true, // 显示逐字歌词
    showYrcAnimation: true, // 显示逐字歌词动画
    showTran: true, // 显示歌词翻译
    showRoma: true, // 显示歌词音译
    lyricsPosition: "flex-start", // 歌词位置
    lyricsBlur: false, // 歌词模糊
    lyricsScrollPosition: "start", // 歌词滚动位置
    lrcMousePause: false, // 鼠标悬停暂停
    // 本地
    localFilesPath: [],
    localSeparators: ["/", "&"],
    showLocalCover: true,
    // 下载
    downloadPath: "", // 默认下载路径
    downloadMeta: true, // 同时下载元信息
    downloadCover: true, // 同时下载封面
    downloadLyric: true, // 同时下载歌词
    saveMetaFile: false, // 保留为独立文件
    // 网络
    proxyProtocol: "off", // 代理协议
    proxyServe: "127.0.0.1", // 代理地址
    proxyPort: 80, // 代理端口
    useRealIP: false, // 是否使用真实 IP
    realIP: "116.25.146.177", // 真实IP地址
  }),
  getters: {},
  actions: {
    // 更换明暗模式
    setThemeMode(mode?: "auto" | "light" | "dark") {
      // 若未传入
      if (mode === undefined) {
        this.themeMode === "auto"
          ? (this.themeMode = "light")
          : this.themeMode === "light"
            ? (this.themeMode = "dark")
            : (this.themeMode = "auto");
      } else {
        this.themeMode = mode;
      }
      window.$message.info(
        `已切换至
        ${
          this.themeMode === "auto"
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
