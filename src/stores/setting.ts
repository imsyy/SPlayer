import { TimeFormat } from "@/composables/useTimeFormat";
import { SongUnlockServer } from "@/core/player/SongManager";
import type { SongLevelType } from "@/types/main";
import { defaultAMLLDbServer } from "@/utils/meta";
import { defineStore } from "pinia";
import { CURRENT_SETTING_SCHEMA_VERSION, settingMigrations } from "./migrations/settingMigrations";
import { ThemeColorType } from "@/types/color";
import type { LyricPriority } from "@/types/lyric";

export interface SettingState {
  /** Schema 版本号 */
  schemaVersion?: number;
  /** 明暗模式 */
  themeMode: "light" | "dark" | "auto";
  /** 主题类别 */
  themeColorType: ThemeColorType;
  /** 偏好繁体中文 */
  preferTraditionalChinese: boolean;
  /** 繁体中文变体 */
  traditionalChineseVariant: "s2t" | "s2tw" | "s2hk" | "s2twp";
  /** 主题自定义颜色 */
  themeCustomColor: string;
  /** 全局着色 */
  themeGlobalColor: boolean;
  /** 主题变体 */
  themeVariant: "primary" | "secondary" | "tertiary" | "neutral" | "neutralVariant" | "error";
  /** 主题跟随封面 */
  themeFollowCover: boolean;
  /** 字体设置样式 */
  fontSettingStyle: "single" | "multi" | "custom";
  /** 全局字体 */
  globalFont: "default" | string;
  /** 歌词区域字体 */
  LyricFont: "follow" | string;
  /** 日语歌词字体 */
  japaneseLyricFont: "follow" | string;
  /** 英语歌词字体 */
  englishLyricFont: "follow" | string;
  /** 韩语歌词字体 */
  koreanLyricFont: "follow" | string;
  /** 隐藏 VIP 标签 */
  showCloseAppTip: boolean;
  /** 关闭应用方式 */
  closeAppMethod: "exit" | "hide";
  /** 显示任务栏进度 */
  showTaskbarProgress: boolean;
  /** 任务栏歌词显示封面 */
  taskbarLyricShowCover: boolean;
  /** 任务栏歌词最大宽度 */
  taskbarLyricMaxWidth: number;
  /** 任务栏歌词位置 */
  taskbarLyricPosition: "automatic" | "left" | "right";
  /** 任务栏歌词自动收缩 */
  taskbarLyricAutoShrink: boolean;
  /** 暂停时显示任务栏歌词 */
  taskbarLyricShowWhenPaused: boolean;
  /** 任务栏歌词动画模式 */
  taskbarLyricAnimationMode: "slide-blur" | "left-sm";
  /** 任务栏歌词单行模式 */
  taskbarLyricSingleLineMode: boolean;
  /** 任务栏歌词跟随主题色 */
  taskbarLyricUseThemeColor: boolean;
  /** 任务栏歌词字重 */
  taskbarLyricFontWeight: number;
  /** 是否使用在线服务 */
  useOnlineService: boolean;
  /** 启动时检查更新 */
  checkUpdateOnStart: boolean;
  /** 隐藏 VIP 标签 */
  hideVipTag: boolean;
  /** 歌词字体大小模式 */
  lyricFontSizeMode: "fixed" | "adaptive";
  /** 歌词字体大小 */
  lyricFontSize: number;
  /** 歌词翻译字体大小 */
  lyricTranFontSize: number;
  /** 歌词音译字体大小 */
  lyricRomaFontSize: number;
  /** 歌词字重设置 */
  lyricFontWeight: number;
  /** 显示逐字歌词 */
  showYrc: boolean;
  /** 显示歌词翻译 */
  showTran: boolean;
  /** 显示歌词音译 */
  showRoma: boolean;
  /** 调换翻译与音译位置 */
  swapTranRoma: boolean;
  /** 显示逐字音译 */
  showWordsRoma: boolean;
  /** 歌词动画 */
  lyricTransition: "slide" | "fade";
  /** 歌词位置 */
  lyricsPosition: "flex-start" | "center" | "flex-end";
  /** 歌词滚动位置偏移量 */
  lyricsScrollOffset: number;
  /** 歌词水平位置偏移量 */
  lyricHorizontalOffset: number;
  /** 歌词默认靠右（对唱互换） */
  lyricAlignRight: boolean;
  /** 隐藏歌词括号内容和别名 */
  hideBracketedContent: boolean;
  /** 替换歌词括号内容 */
  replaceLyricBrackets: boolean;
  /** 歌词括号替换预设 */
  bracketReplacementPreset: "dash" | "angleBrackets" | "cornerBrackets" | "custom";
  /** 自定义歌词括号替换内容 */
  customBracketReplacement: string;
  /** 下载路径 */
  downloadPath: string;
  /** 下载线程数 */
  downloadThreadCount: number;
  /** 是否启用缓存 */
  cacheEnabled: boolean;
  /** 是否缓存歌曲（音频文件） */
  songCacheEnabled: boolean;
  /** 音乐命名格式 */
  fileNameFormat: "title" | "artist-title" | "title-artist";
  /** 文件智能分类 */
  folderStrategy: "none" | "artist" | "artist-album";
  /** 下载元信息 */
  downloadMeta: boolean;
  /** 下载封面 */
  downloadCover: boolean;
  /** 下载歌词 */
  downloadLyric: boolean;
  /** 下载歌词翻译 */
  downloadLyricTranslation: boolean;
  /** 下载歌词音译 */
  downloadLyricRomaji: boolean;
  /** 模拟播放下载 */
  usePlaybackForDownload: boolean;
  /** 保存元信息文件 */
  saveMetaFile: boolean;
  /** 使用解锁接口下载 */
  useUnlockForDownload: boolean;
  /** 内嵌暂逐字歌词 (beta) */
  downloadMakeYrc: boolean;
  /** 下载后另存为 ASS 格式 */
  downloadSaveAsAss: boolean;
  /** 下载歌词转繁体 */
  downloadLyricToTraditional: boolean;
  /** 下载歌词文件编码 */
  downloadLyricEncoding: "utf-8" | "gbk" | "utf-16" | "iso-8859-1";
  /** 启用HTTP2下载 */
  enableDownloadHttp2: boolean;
  /** 默认下载音质（弹窗默认选项） */
  downloadSongLevel: SongLevelType;
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
  /** 音频引擎: element (原生) 或 ffmpeg */
  audioEngine: "element" | "ffmpeg";
  /** 自动播放 */
  autoPlay: boolean;
  /** 预载下一首 */
  useNextPrefetch: boolean;
  /** 渐入渐出 */
  songVolumeFade: boolean;
  /** 渐入渐出时间 */
  songVolumeFadeTime: number;
  /** 是否启用 ReplayGain (音量平衡) */
  enableReplayGain: boolean;
  /** ReplayGain 模式: 轨道增益 (track) 或 专辑增益 (album) */
  replayGainMode: "track" | "album";
  /** 是否使用解灰 */
  useSongUnlock: boolean;
  /** 歌曲解锁音源 */
  songUnlockServer: { key: SongUnlockServer; enabled: boolean }[];
  /** 显示倒计时 */
  countDownShow: boolean;
  /** 显示歌词条 */
  barLyricShow: boolean;
  /** 时间显示格式 **/
  timeFormat: TimeFormat;
  /** 播放器类型 */
  playerType: "cover" | "record" | "fullscreen";
  /** 背景类型 */
  playerBackgroundType: "none" | "animation" | "blur" | "color";
  /** 背景动画帧率 */
  playerBackgroundFps: number;
  /** 背景动画流动速度 */
  playerBackgroundFlowSpeed: number;
  /** 背景动画是否在歌曲暂停时暂停 */
  playerBackgroundPause: boolean;
  /** 背景动画是否响应低频音量 */
  playerBackgroundLowFreqVolume: boolean;
  /** 背景动画渲染比例 */
  playerBackgroundRenderScale: number;
  /** 播放器元素自动隐藏 */
  autoHidePlayerMeta: boolean;
  /** 记忆最后进度 */
  memoryLastSeek: boolean;
  /** 显示进度条悬浮信息 */
  progressTooltipShow: boolean;
  /** 进度调节吸附最近歌词 */
  progressAdjustLyric: boolean;
  /** 显示播放列表数量 */
  showPlaylistCount: boolean;
  /** 是否显示音乐频谱 */
  showSpectrums: boolean;
  /** 是否开启系统音频集成 */
  smtcOpen: boolean;
  /** 歌词模糊 */
  lyricsBlur: boolean;
  /** 播放试听 */
  playSongDemo: boolean;
  /** 显示搜索历史 */
  showSearchHistory: boolean;
  /** 是否使用 AMLL 歌词 */
  useAMLyrics: boolean;
  /** 是否使用 AMLL 歌词弹簧效果 */
  useAMSpring: boolean;
  /** 隐藏已播放歌词 */
  hidePassedLines: boolean;
  /** 文字动画的渐变宽度 */
  wordFadeWidth: number;
  /** 歌词时延调节步长（毫秒） */
  lyricOffsetStep: number;
  /** 启用在线 TTML 歌词 */
  enableOnlineTTMLLyric: boolean;
  /** 启用 QM 歌词 */
  enableQQMusicLyric: boolean;
  /** 歌词源优先级 */
  /** 歌词源优先级 */
  lyricPriority: LyricPriority;
  /** 本地歌曲使用 QM 歌词匹配 */
  localLyricQQMusicMatch: boolean;
  /** AMLL DB 服务地址 */
  amllDbServer: string;
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
  /** 封面显示配置 */
  hiddenCovers: {
    /** 为我推荐 */
    home: boolean;
    /** 歌单广场 */
    playlist: boolean;
    /** 排行榜 */
    toplist: boolean;
    /** 歌手 */
    artist: boolean;
    /** 最新音乐 */
    new: boolean;
    /** 播放器 */
    player: boolean;
    /** 歌单详情/歌曲列表 */
    list: boolean;
    /** 私人FM */
    personalFM: boolean;
    /** 歌手详情 */
    artistDetail: boolean;
    /** 播客电台 */
    radio: boolean;
    /** 专辑 */
    album: boolean;
    /** 我的收藏 */
    like: boolean;
    /** 视频 */
    video: boolean;
    /** 视频详情页 */
    videoDetail: boolean;
  };
  /** 隐藏全部封面 */
  hideAllCovers: boolean;
  /** 隐藏迷你播放器封面 */
  hideMiniPlayerCover: boolean;
  /** 路由动画 */
  routeAnimation: "none" | "fade" | "zoom" | "slide" | "up" | "flow" | "mask-left" | "mask-top";
  /** 播放器展开动画 */
  playerExpandAnimation: "up" | "flow";
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
  enableExcludeLyricsTTML: boolean;
  /** 「排除歌词」是否适用于本地歌词 */
  enableExcludeLyricsLocal: boolean;
  /** 用户自定义的排除歌词关键字 */
  excludeLyricsUserKeywords: string[];
  /** 用户自定义的排除歌词正则表达式 */
  excludeLyricsUserRegexes: string[];
  /** 是否启用评论排除 */
  enableExcludeComments: boolean;
  /** 排除评论关键词 */
  excludeCommentKeywords: string[];
  /** 排除评论正则表达式 */
  excludeCommentRegexes: string[];
  /** 显示默认本地路径 */
  showDefaultLocalPath: boolean;
  /** 本地文件夹显示模式 */
  localFolderDisplayMode: "tab" | "dropdown";
  /** 展示当前歌曲歌词状态信息 */
  showPlayMeta: boolean;
  /** 显示歌曲音质 */
  showSongQuality: boolean;
  /** 显示播放器歌曲音质 */
  showPlayerQuality: boolean;
  /** 显示歌曲特权标签 */
  showSongPrivilegeTag: boolean;
  /** 显示歌曲脏标 */
  showSongExplicitTag: boolean;
  /** 显示原唱翻唱标签 */
  showSongOriginalTag: boolean;
  /** 显示歌曲专辑 */
  showSongAlbum: boolean;
  /** 显示歌曲时长 */
  showSongDuration: boolean;
  /** 显示歌曲操作 */
  showSongOperations: boolean;
  /** 显示歌曲歌手 */
  showSongArtist: boolean;
  /** 侧边栏隐藏 */
  sidebarHide: {
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
    /** 隐藏下载管理 */
    hideDownload: boolean;
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
  };
  /** 歌单界面元素显示配置 */
  // Controls the visibility of elements on the playlist detail page
  playlistPageElements: {
    tags: boolean;
    creator: boolean;
    time: boolean;
    description: boolean;
  };
  /** 全屏播放器界面元素显示配置 */
  fullscreenPlayerElements: {
    like: boolean;
    addToPlaylist: boolean;
    download: boolean;
    comments: boolean;
    desktopLyric: boolean;
    moreSettings: boolean;
    copyLyric: boolean;
    lyricOffset: boolean;
    lyricSettings: boolean;
  };
  /** 右键菜单显示配置 */
  contextMenuOptions: {
    play: boolean;
    playNext: boolean;
    addToPlaylist: boolean;
    mv: boolean;
    dislike: boolean;
    more: boolean;
    cloudImport: boolean;
    deleteFromPlaylist: boolean;
    deleteFromCloud: boolean;
    deleteFromLocal: boolean;
    openFolder: boolean;
    cloudMatch: boolean;
    wiki: boolean;
    search: boolean;
    download: boolean;
    copyName: boolean;
    musicTagEditor: boolean;
  };
  /** 启用搜索关键词获取 */
  enableSearchKeyword: boolean;
  /** 失焦后自动清空搜索框 */
  clearSearchOnBlur: boolean;
  /** 显示主页问好 */
  showHomeGreeting: boolean;
  /** 首页栏目顺序和显示配置 */
  homePageSections: Array<{
    key: "playlist" | "radar" | "artist" | "video" | "radio" | "album";
    name: string;
    visible: boolean;
    order: number;
  }>;
  /** 用户协议版本 */
  userAgreementVersion: string;
  /** 自定义协议注册 **/
  registryProtocol: {
    orpheus: boolean;
  };
  /** Last.fm 集成 */
  lastfm: {
    enabled: boolean;
    apiKey: string;
    apiSecret: string;
    sessionKey: string;
    username: string;
    scrobbleEnabled: boolean;
    nowPlayingEnabled: boolean;
  };
  /** 播放器跟随封面主色 */
  playerFollowCoverColor: boolean;
  /** 进度条悬浮时显示歌词 */
  progressLyricShow: boolean;
  /** Discord RPC 配置 */
  discordRpc: {
    /** 是否启用 Discord RPC */
    enabled: boolean;
    /** 暂停时显示 */
    showWhenPaused: boolean;
    /** 显示模式 */
    displayMode: "Name" | "State" | "Details";
  };
  /** 播放引擎 */
  playbackEngine: "web-audio" | "mpv";
  /** 自定义 CSS */
  customCss: string;
  /** 自定义 JS */
  customJs: string;
  /** 播放器封面/歌词占比 (0-100) */
  playerStyleRatio: number;
  /** 全屏封面渐变位置 (0-100) */
  playerFullscreenGradient: number;
  /** 是否启用流媒体功能 */
  streamingEnabled: boolean;
  /** Fuck AI: 开启后在所有的地方都不显示 Hi-res 以上的音质选项 */
  disableAiAudio: boolean;
  /** Fuck DJ: 开启后自动跳过 DJ 歌曲 */
  disableDjMode: boolean;
  /** 启用全局错误弹窗 */
  enableGlobalErrorDialog: boolean;
  /** macOS 专属设置 */
  macos: {
    /** 状态栏歌词 */
    statusBarLyric: {
      /** 是否启用 */
      enabled: boolean;
    };
  };
}

export const useSettingStore = defineStore("setting", {
  state: (): SettingState => ({
    schemaVersion: 0,
    themeMode: "auto",
    themeColorType: "default",
    preferTraditionalChinese: false,
    traditionalChineseVariant: "s2t",
    themeCustomColor: "#fe7971",
    themeFollowCover: false,
    themeGlobalColor: false,
    themeVariant: "secondary",
    fontSettingStyle: "single",
    globalFont: "default",
    LyricFont: "follow",
    japaneseLyricFont: "follow",
    englishLyricFont: "follow",
    koreanLyricFont: "follow",
    hideVipTag: false,
    showSearchHistory: true,
    menuShowCover: true,
    menuExpandedKeys: [],
    routeAnimation: "slide",
    playerExpandAnimation: "up",
    useOnlineService: true,
    showCloseAppTip: true,
    closeAppMethod: "hide",
    showTaskbarProgress: false,
    taskbarLyricShowCover: true,
    taskbarLyricMaxWidth: 30,
    taskbarLyricPosition: "automatic",
    taskbarLyricAutoShrink: false,
    taskbarLyricShowWhenPaused: true,
    taskbarLyricAnimationMode: "slide-blur",
    taskbarLyricSingleLineMode: false,
    taskbarLyricUseThemeColor: false,
    taskbarLyricFontWeight: 400,
    checkUpdateOnStart: true,
    preventSleep: false,
    useKeepAlive: true,
    songLevel: "exhigh",
    playDevice: "default",
    audioEngine: "element",
    autoPlay: false,
    useNextPrefetch: true,
    songVolumeFade: true,
    songVolumeFadeTime: 300,
    enableReplayGain: false,
    replayGainMode: "track",
    useSongUnlock: true,
    songUnlockServer: [
      { key: SongUnlockServer.BODIAN, enabled: true },
      { key: SongUnlockServer.GEQUBAO, enabled: true },
      { key: SongUnlockServer.NETEASE, enabled: true },
      { key: SongUnlockServer.KUWO, enabled: false },
    ],
    countDownShow: true,
    barLyricShow: true,
    timeFormat: "current-total",
    playerType: "cover",
    playerBackgroundType: "blur",
    playerBackgroundFps: 30,
    playerBackgroundFlowSpeed: 4,
    playerBackgroundPause: false,
    playerBackgroundLowFreqVolume: false,
    playerBackgroundRenderScale: 0.5,
    autoHidePlayerMeta: true,
    memoryLastSeek: true,
    progressTooltipShow: true,
    progressAdjustLyric: false,
    showPlaylistCount: true,
    showSpectrums: false,
    smtcOpen: true,
    playSongDemo: false,
    scrobbleSong: false,
    dynamicCover: false,
    lyricFontSizeMode: "adaptive",
    lyricFontSize: 46,
    lyricTranFontSize: 22,
    lyricRomaFontSize: 18,
    lyricFontWeight: 700,
    useAMLyrics: false,
    useAMSpring: false,
    hidePassedLines: false,
    wordFadeWidth: 0.5,
    lyricOffsetStep: 500,
    enableOnlineTTMLLyric: false,
    enableQQMusicLyric: false,
    lyricPriority: "auto",
    localLyricQQMusicMatch: false,
    amllDbServer: defaultAMLLDbServer,
    showYrc: true,
    showTran: true,
    showRoma: true,
    swapTranRoma: false,
    showWordsRoma: true,
    lyricTransition: "slide",
    lyricsPosition: "flex-start",
    lyricsBlur: false,
    lyricsScrollOffset: 0.25,
    lyricHorizontalOffset: 10,
    lyricAlignRight: false,
    hideBracketedContent: false,
    replaceLyricBrackets: false,
    bracketReplacementPreset: "dash",
    customBracketReplacement: "-",
    enableExcludeLyrics: true,
    enableExcludeLyricsTTML: false,
    enableExcludeLyricsLocal: false,
    excludeLyricsUserKeywords: [],
    excludeLyricsUserRegexes: [],
    enableExcludeComments: false,
    excludeCommentKeywords: [],
    excludeCommentRegexes: [],
    localFilesPath: [],
    localLyricPath: [],
    showDefaultLocalPath: true,
    localFolderDisplayMode: "tab",
    localSeparators: ["/", "&"],
    showLocalCover: true,
    hiddenCovers: {
      home: false,
      playlist: false,
      toplist: false,
      artist: false,
      new: false,
      player: false,
      list: false,
      personalFM: false,
      artistDetail: false,
      radio: false,
      album: false,
      like: false,
      video: false,
      videoDetail: false,
    },
    hideAllCovers: false,
    hideMiniPlayerCover: false,
    downloadPath: "",
    downloadThreadCount: 8,
    cacheEnabled: true,
    songCacheEnabled: true,
    fileNameFormat: "title-artist",
    folderStrategy: "none",
    downloadMeta: true,
    downloadCover: true,
    downloadLyric: true,
    downloadLyricTranslation: true,
    downloadLyricRomaji: false,
    usePlaybackForDownload: false,
    useUnlockForDownload: false,
    downloadMakeYrc: false,
    downloadSaveAsAss: false,
    downloadLyricToTraditional: false,
    downloadLyricEncoding: "utf-8",
    enableDownloadHttp2: true,
    saveMetaFile: false,
    downloadSongLevel: "h",
    proxyProtocol: "off",
    proxyServe: "127.0.0.1",
    proxyPort: 80,
    useRealIP: false,
    realIP: "",
    showPlayMeta: true,
    showSongQuality: true,
    showPlayerQuality: true,
    showSongPrivilegeTag: true,
    showSongExplicitTag: true,
    showSongOriginalTag: true,
    showSongAlbum: true,
    showSongDuration: true,
    showSongOperations: true,
    showSongArtist: true,
    sidebarHide: {
      hideDiscover: false,
      hidePersonalFM: false,
      hideRadioHot: false,
      hideLike: false,
      hideCloud: false,
      hideDownload: false,
      hideLocal: false,
      hideHistory: false,
      hideUserPlaylists: false,
      hideLikedPlaylists: false,
      hideHeartbeatMode: false,
    },
    playlistPageElements: {
      tags: true,
      creator: true,
      time: true,
      description: true,
    },
    fullscreenPlayerElements: {
      like: true,
      addToPlaylist: true,
      download: true,
      comments: true,
      desktopLyric: true,
      moreSettings: true,
      copyLyric: true,
      lyricOffset: true,
      lyricSettings: true,
    },
    contextMenuOptions: {
      play: true,
      playNext: true,
      addToPlaylist: true,
      mv: true,
      dislike: true,
      more: true,
      cloudImport: true,
      deleteFromPlaylist: true,
      deleteFromCloud: true,
      deleteFromLocal: true,
      openFolder: true,
      cloudMatch: true,
      wiki: true,
      search: true,
      download: true,
      copyName: true,
      musicTagEditor: true,
    },
    enableSearchKeyword: true,
    clearSearchOnBlur: false,
    showHomeGreeting: true,
    homePageSections: [
      { key: "playlist", name: "专属歌单", visible: true, order: 0 },
      { key: "radar", name: "雷达歌单", visible: true, order: 1 },
      { key: "artist", name: "歌手推荐", visible: true, order: 2 },
      { key: "video", name: "推荐 MV", visible: true, order: 3 },
      { key: "radio", name: "推荐播客", visible: true, order: 4 },
      { key: "album", name: "新碟上架", visible: true, order: 5 },
    ],
    userAgreementVersion: "",
    registryProtocol: {
      orpheus: false,
    },
    lastfm: {
      enabled: false,
      apiKey: "",
      apiSecret: "",
      sessionKey: "",
      username: "",
      scrobbleEnabled: true,
      nowPlayingEnabled: true,
    },
    playerFollowCoverColor: true,
    progressLyricShow: true,
    discordRpc: {
      enabled: false,
      showWhenPaused: true,
      displayMode: "Name",
    },
    playbackEngine: "web-audio",
    customCss: "",
    customJs: "",
    playerStyleRatio: 50,
    playerFullscreenGradient: 15,
    streamingEnabled: false,
    disableAiAudio: false,
    disableDjMode: false,
    enableGlobalErrorDialog: true,
    macos: {
      statusBarLyric: {
        enabled: false,
      },
    },
  }),
  getters: {
    /**
     * 获取淡入淡出时间
     * @returns 淡入淡出时间
     */
    getFadeTime(state): number {
      return state.songVolumeFade ? state.songVolumeFadeTime : 0;
    },
    /**
     * 检查 Last.fm 配置是否有效
     */
    isLastfmConfigured(state): boolean {
      const { lastfm } = state;
      return Boolean(lastfm.apiKey && lastfm.apiSecret);
    },
  },
  actions: {
    /**
     * 检查并执行数据迁移
     * 应在应用启动时调用
     */
    checkAndMigrate() {
      const currentVersion = this.schemaVersion ?? 0;
      const targetVersion = CURRENT_SETTING_SCHEMA_VERSION;

      if (currentVersion !== targetVersion) {
        console.log(`[Setting Migration] 检测到版本差异: ${currentVersion} -> ${targetVersion}`);
        // 保存当前完整状态
        const currentState = { ...this.$state } as Partial<SettingState>;
        // 计算需要更新的字段（迁移返回的更新）
        const updates: Partial<SettingState> = {};
        // 按版本顺序执行迁移，收集所有更新
        for (let version = currentVersion + 1; version <= targetVersion; version++) {
          const migration = settingMigrations[version];
          if (migration) {
            const migrationUpdates = migration(currentState);
            Object.assign(updates, migrationUpdates);
          }
        }
        // 只 patch 需要更新的字段
        this.$patch(updates);
        // 统一设置版本号
        this.schemaVersion = targetVersion;
        console.log(`[Setting Migration] 迁移完成，已更新到版本 ${targetVersion}`);
      }
    },
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
