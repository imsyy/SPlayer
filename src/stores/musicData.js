// 音乐数据
import { defineStore } from "pinia";
import { getPersonalFm, setFmToTrash } from "@/api/recommend";
import { changePlayIndex } from "@/utils/Player";
import { isLogin } from "@/utils/auth";
import formatData from "@/utils/formatData";

const useMusicDataStore = defineStore("musicData", {
  state: () => {
    return {
      // 当前模式
      // normal 正常 / fm 私人 FM / dj 电台
      playMode: "normal",
      // normal 顺序播放 / random 随机播放 / repeat 单曲循环
      playSongMode: "normal",
      // 是否为心动模式
      playHeartbeatMode: false,
      // 默认倍速
      playRate: 1,
      // 默认音量
      playVolume: 0.7,
      // 静音前音量
      playVolumeMute: 0,
      // 当前播放索引
      playIndex: 0,
      // 播放列表
      playList: [],
      playListOld: [],
      historyPlaylist: [],
      // 当前歌曲数据
      playSongData: {},
      // 当前歌曲来源
      playSongSource: 0,
      // 当前歌曲歌词数据
      playSongLyric: {
        lrc: [],
        yrc: [],
        hasTran: false,
        hasRoma: false,
        hasYrc: false,
      },
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
      // 本地歌曲目录
      localSongPath: [],
      // 私人 FM 数据
      privateFmIndex: 0,
      privateFmData: [],
      privateFmSong: {},
    };
  },
  getters: {
    // 获取当前播放歌曲
    getPlaySongData(state) {
      return state.playMode === "fm" && state.privateFmSong
        ? state.privateFmSong
        : state.playSongData;
    },
  },
  actions: {
    // 更改播放历史
    setPlayHistory(data, clean = false) {
      if (clean) {
        this.historyPlaylist = [];
      } else {
        const index = this.historyPlaylist.findIndex((item) => item?.id === data?.id);
        if (index !== -1) {
          this.historyPlaylist.splice(index, 1);
        }
        // 只有在数据存在时才进行插入操作
        if (data && Object.keys(data).length > 0) {
          // 如果数组为空，则直接插入
          if (this.historyPlaylist.length === 0) {
            this.historyPlaylist.push(data);
          } else {
            // 避免插入重复数据
            const existingIndex = this.historyPlaylist.findIndex((item) => item?.id === data?.id);
            if (existingIndex === -1) {
              // 在数组头部插入数据
              this.historyPlaylist.unshift(data);
              // 限制历史记录长度为 500
              if (this.historyPlaylist.length > 500) {
                this.historyPlaylist.pop();
              }
            }
          }
        }
      }
    },
    // 更改私人FM
    async setPersonalFm(getNext = false) {
      try {
        // 获取私人FM数据
        const getPersonalFmData = async () => {
          const result = await getPersonalFm();
          this.privateFmData = formatData(result.data, "song");
        };
        // 若私人FM数据为空，则获取
        if (!this.privateFmData?.length) {
          await getPersonalFmData();
        }
        // 若当前无歌曲或上次索引为旧列表
        if (Object.keys(this.privateFmSong).length === 0 || this.privateFmIndex === -1) {
          this.privateFmSong = this.privateFmData[0];
        }
        // 若需要播放下一首
        if (getNext) {
          // 更改播放模式
          this.playMode = "fm";
          // 增加索引
          this.privateFmIndex++;
          // 判断索引是否在列表范围内
          if (this.privateFmIndex < this.privateFmData.length) {
            this.privateFmSong = this.privateFmData[this.privateFmIndex];
          } else {
            // 索引超出范围，重新加载列表
            this.privateFmIndex = 0;
            await getPersonalFmData();
            this.privateFmSong = this.privateFmData[0];
          }
        }
      } catch (error) {
        // 处理错误情况
        this.privateFmSong = {};
        console.error("私人FM加载失败：", error);
        $message.error("私人FM出现错误，请重试");
      }
    },
    // 私人FM垃圾桶
    async setPersonalFmToTrash(id) {
      try {
        if (!isLogin()) return $message.warning("请登录后使用");
        const result = await setFmToTrash(id);
        if (result.code === 200) {
          $message.success("已移至垃圾桶");
          // 更改播放模式
          this.playMode = "fm";
          // 下一曲
          changePlayIndex("next", true);
        }
      } catch (error) {
        console.error("移至垃圾桶失败：", error);
        $message.error("移至垃圾桶失败，请重试");
      }
    },
  },
  // 数据持久化
  persist: [
    {
      key: "musicData",
      storage: localStorage,
    },
  ],
});

export default useMusicDataStore;
