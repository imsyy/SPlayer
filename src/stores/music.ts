import { defineStore } from "pinia";
import type { SongType } from "@/types/main";
import { isElectron } from "@/utils/env";
import { cloneDeep } from "lodash-es";
import { SongLyric } from "@/types/lyric";

interface MusicState {
  playSong: SongType;
  playPlaylistId: number;
  songLyric: SongLyric;
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
  cover: "/images/song.jpg?asset",
  duration: 0,
  free: 0,
  mv: null,
  type: "song",
};

export const useMusicStore = defineStore("music", {
  state: (): MusicState => ({
    // 当前播放歌曲
    playSong: { ...defaultMusicData },
    // 当前播放歌单
    playPlaylistId: 0,
    // 当前歌曲歌词
    songLyric: {
      lrcData: [], // 普通歌词
      yrcData: [], // 逐字歌词
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
    /** 歌曲封面 */
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
    /** 重置音乐数据 */
    resetMusicData() {
      this.playSong = { ...defaultMusicData };
      this.playPlaylistId = 0;
      this.setSongLyric({ lrcData: [], yrcData: [] }, true);
      if (isElectron) {
        window.electron.ipcRenderer.send("play-song-change", undefined);
      }
    },
    /**
     * 设置/更新歌曲歌词数据
     * @param updates 部分或完整歌词数据
     * @param replace 是否覆盖（true：用提供的数据覆盖并为缺省字段置空；false：合并更新）
     */
    setSongLyric(updates: Partial<SongLyric>, replace: boolean = false) {
      if (replace) {
        this.songLyric = {
          lrcData: updates.lrcData ?? [],
          yrcData: updates.yrcData ?? [],
        };
      } else {
        this.songLyric = {
          lrcData: updates.lrcData ?? this.songLyric.lrcData,
          yrcData: updates.yrcData ?? this.songLyric.yrcData,
        };
      }
      // 更新歌词窗口数据
      if (isElectron) {
        window.electron.ipcRenderer.send(
          "play-lyric-change",
          cloneDeep({
            songId: this.playSong?.id,
            lyricLoading: false,
            lrcData: this.songLyric.lrcData ?? [],
            yrcData: this.songLyric.yrcData ?? [],
          }),
        );
      }
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
