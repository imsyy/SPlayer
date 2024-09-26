import { defineStore } from "pinia";
import type { LyricLine } from "@applemusic-like-lyrics/core";
import type { SongType, LyricType } from "@/types/main";

interface MusicState {
  playSong: SongType;
  playPlaylistId: number;
  songLyric: {
    lrcData: LyricType[];
    yrcData: LyricType[];
    lrcAMData: LyricLine[];
    yrcAMData: LyricLine[];
  };
  personalFM: {
    playIndex: number;
    list: SongType[];
  };
  dailySongsData: {
    timestamp: number | null;
    list: SongType[];
  };
}

// 默认音乐数据
const defaultMusicData: SongType = {
  id: 0,
  name: "未播放歌曲",
  artists: "未知歌手",
  album: "未知专辑",
  cover: "/images/song.jpg?assest",
  duration: 0,
  free: 0,
  mv: null,
  type: "song",
};

export const useMusicStore = defineStore({
  id: "music",
  state: (): MusicState => ({
    // 当前播放歌曲
    playSong: { ...defaultMusicData },
    // 当前播放歌单
    playPlaylistId: 0,
    // 当前歌曲歌词
    songLyric: {
      lrcData: [], // 普通歌词
      yrcData: [], // 逐字歌词
      lrcAMData: [], // 普通歌词-AM
      yrcAMData: [], // 逐字歌词-AM
    },
    // 私人FM数据
    personalFM: {
      playIndex: 0,
      list: [],
    },
    // 每日推荐
    dailySongsData: {
      timestamp: null, // 更新时间
      list: [], // 歌曲数据
    },
  }),
  getters: {
    // 是否具有歌词
    isHasLrc(state): boolean {
      return state.songLyric.lrcData.length > 0 && state.playSong.type !== "radio";
    },
    // 是否具有逐字歌词
    isHasYrc(state): boolean {
      return state.songLyric.yrcData.length > 0;
    },
    // 是否有播放器
    isHasPlayer(state): boolean {
      return state.playSong?.id !== 0;
    },
    // 歌曲封面
    songCover(state): string {
      return state.playSong.path
        ? state.playSong.cover
        : state.playSong.coverSize?.s || state.playSong.cover;
    },
    // 私人FM播放歌曲
    personalFMSong(state): SongType {
      return state.personalFM.list?.[state.personalFM.playIndex] || defaultMusicData;
    },
  },
  actions: {
    // 恢复默认音乐数据
    resetMusicData() {
      this.playSong = defaultMusicData;
      this.songLyric = {
        lrcData: [],
        yrcData: [],
        lrcAMData: [],
        yrcAMData: [],
      };
    },
    // 获取歌曲封面
    getSongCover(size: "s" | "m" | "l" | "xl" | "cover" = "s") {
      return this.playSong.path
        ? this.playSong.cover
        : size === "cover"
          ? this.playSong.cover
          : this.playSong.coverSize?.[size] || this.playSong.cover;
    },
  },
  // 持久化
  persist: {
    key: "music-store",
    storage: localStorage,
  },
});
