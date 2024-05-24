// 站点状态
import { defineStore } from "pinia";

const useSiteStatusStore = defineStore("siteStatus", {
  state: () => {
    return {
      // 菜单折叠状态
      asideMenuCollapsed: false,
      // 搜索框状态
      searchInputFocus: false,
      // 是否展示播放控制条
      showPlayBar: true,
      // 播放状态
      playState: false,
      playLoading: false,
      playUseOtherSource: false,
      // 播放列表状态
      playListShow: false,
      // 全屏播放器状态
      showFullPlayer: false,
      // 播放器功能显示
      playerControlShow: true,
      controlTimeOut: null,
      // 实时播放进度
      playSeek: 0,
      // 是否下一首
      hasNextSong: false,
      // 封面主题
      coverTheme: {},
      coverBackground: null,
      // 纯净歌词模式
      pureLyricMode: false,
      // 音乐频谱数据
      spectrumsData: [],
      // 当前歌曲歌词播放索引
      playSongLyricIndex: -1,
      // 播放时长数据
      playTimeData: {
        currentTime: 0,
        duration: 0,
        bar: 0,
        played: "00:00",
        durationTime: "00:00",
      },
      // 默认倍速
      playRate: 1,
      // 默认音量
      playVolume: 0.7,
      // 静音前音量
      playVolumeMute: 0,
      // 当前播放索引
      playIndex: 0,
      // 当前模式
      // normal 正常 / fm 私人 FM / dj 电台
      playMode: "normal",
      // normal 顺序播放 / random 随机播放 / repeat 单曲循环
      playSongMode: "normal",
      // 是否为心动模式
      playHeartbeatMode: false,
    };
  },
  getters: {},
  actions: {},
  // 数据持久化
  persist: [
    {
      key: "siteStatus",
      storage: localStorage,
      paths: [
        "asideMenuCollapsed",
        "pureLyricMode",
        "playRate",
        "playVolume",
        "playVolumeMute",
        "playIndex",
        "playMode",
        "playSongMode",
        "playHeartbeatMode",
        "playTimeData",
      ],
    },
  ],
});

export default useSiteStatusStore;
