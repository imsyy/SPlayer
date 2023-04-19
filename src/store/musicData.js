import { defineStore } from "pinia";
import { getSongTime, getSongPlayingTime } from "@/utils/timeTools.js";
import { getPersonalFm, setFmTrash } from "@/api/home";
import { getLikelist, setLikeSong } from "@/api/user";
import { getPlayListCatlist } from "@/api/playlist";
import { userStore, settingStore } from "@/store";
import { NIcon } from "naive-ui";
import { PlayCycle, PlayOnce, ShuffleOne } from "@icon-park/vue-next";
import parseLyric from "@/utils/parseLyric";

const useMusicDataStore = defineStore("musicData", {
  state: () => {
    return {
      // 是否展示播放界面
      showBigPlayer: false,
      // 是否展示播放控制条
      showPlayBar: true,
      // 是否展示播放列表
      showPlayList: false,
      // 播放状态
      playState: false,
      // 当前歌曲播放链接
      playSongLink: null,
      // 当前歌曲歌词数据
      playSongLyric: {
        lrc: [],
        yrc: [],
        hasTran: false,
        hasTran: false,
        hasYrc: false,
      },
      // 当前歌曲歌词播放索引
      playSongLyricIndex: 0,
      // 每日推荐
      dailySongsData: [],
      // 歌单分类
      catList: {},
      // 精品歌单分类
      highqualityCatList: [],
      // 持久化数据
      persistData: {
        // 搜索历史
        searchHistory: [],
        // 是否处于私人 FM 模式
        personalFmMode: false,
        // 私人 FM 数据
        personalFmData: {},
        // 播放列表类型
        playListMode: "list",
        // 喜欢音乐列表
        likeList: [],
        // 播放列表
        playlists: [],
        // 当前歌曲索引
        playSongIndex: 0,
        // 当前播放模式
        // normal-顺序播放 random-随机播放 single-单曲循环
        playSongMode: "normal",
        // 当前播放时间
        playSongTime: {
          currentTime: 0,
          duration: 0,
          barMoveDistance: 0,
          songTimePlayed: "00:00",
          songTimeDuration: "00:00",
        },
        // 播放音量
        playVolume: 0.7,
        // 静音前音量
        playVolumeMute: 0,
        // 列表状态
        playlistState: 0, // 0 顺序 1 单曲循环 2 随机
        // 播放历史
        playHistory: [],
      },
    };
  },
  getters: {
    // 获取是否处于私人FM模式
    getPersonalFmMode(state) {
      return state.persistData.personalFmMode;
    },
    // 获取私人FM模式数据
    getPersonalFmData(state) {
      return state.persistData.personalFmData;
    },
    // 获取每日推荐
    getDailySongs(state) {
      return state.dailySongsData;
    },
    // 获取播放列表
    getPlaylists(state) {
      return state.persistData.playlists;
    },
    // 获取播放模式
    getPlaySongMode(state) {
      return state.persistData.playSongMode;
    },
    // 获取当前歌曲
    getPlaySongData(state) {
      return state.persistData.playlists[state.persistData.playSongIndex];
    },
    // 获取当前歌词
    getPlaySongLyric(state) {
      return state.playSongLyric;
    },
    // 获取当前歌词索引
    getPlaySongLyricIndex(state) {
      return state.playSongLyricIndex;
    },
    // 获取当前播放时间
    getPlaySongTime(state) {
      return state.persistData.playSongTime;
    },
    // 获取播放状态
    getPlayState(state) {
      return state.playState;
    },
    // 获取播放链接
    getPlaySongLink(state) {
      return state.playSongLink;
    },
    // 获取喜欢音乐列表
    getLikeList(state) {
      return state.persistData.likeList;
    },
    // 获取播放历史
    getPlayHistory(state) {
      return state.persistData.playHistory;
    },
    // 获取播放列表模式
    getPlayListMode(state) {
      return state.persistData.playListMode;
    },
    // 获取搜索历史
    getSearchHistory(state) {
      return state.persistData.searchHistory;
    },
  },
  actions: {
    // 更改是否处于私人FM模式
    setPersonalFmMode(value) {
      this.persistData.personalFmMode = value;
      if (value) {
        this.playSongLink = null;
        if (this.persistData.personalFmData.id) {
          this.persistData.playlists = [];
          this.persistData.playlists.push(this.persistData.personalFmData);
          this.persistData.playSongIndex = 0;
        } else {
          this.setPersonalFmData();
        }
      }
    },
    // 当处于私人fm模式时更改歌单
    setPersonalFmData() {
      try {
        const songName = this.getPersonalFmData?.name;
        getPersonalFm().then((res) => {
          if (res.data[0]) {
            const data = res.data[2] || res.data[0];
            const fmData = {
              id: data.id,
              name: data.name,
              artist: data.artists,
              album: data.album,
              alia: data.alias,
              time: getSongTime(data.duration),
              fee: data.fee,
              pc: data.pc ? data.pc : null,
              mv: data.mvid,
            };
            if (songName && songName == fmData.name) {
              this.setFmDislike(fmData.id, false);
            } else {
              this.persistData.personalFmData = fmData;
              if (this.persistData.personalFmMode) {
                this.playSongLink = null;
                this.persistData.playlists = [];
                this.persistData.playlists.push(fmData);
                this.persistData.playSongIndex = 0;
                this.setPlayState(true);
              }
            }
          } else {
            $message.error("获取私人 FM 失败");
          }
        });
      } catch (err) {
        console.error("获取私人 FM 失败：" + err);
        $message.error("获取私人 FM 失败");
      }
    },
    // 私人fm垃圾桶
    setFmDislike(id, tip = true) {
      const user = userStore();
      if (user.userLogin) {
        setFmTrash(id).then((res) => {
          if (res.code == 200) {
            if (tip) $message.success("已将该歌曲移除至垃圾桶");
            this.persistData.personalFmMode = true;
            this.setPlaySongIndex("next");
          } else {
            $message.error("歌曲移除至垃圾桶失败");
          }
        });
      } else {
        $message.error("请登录账号后使用");
      }
    },
    // 更改喜欢列表
    setLikeList() {
      const user = userStore();
      if (user.userLogin) {
        getLikelist(user.getUserData.id).then((res) => {
          this.persistData.likeList = res.ids;
        });
      }
    },
    // 查找歌曲是否处于喜欢列表
    getSongIsLike(id) {
      return this.persistData.likeList.includes(id);
    },
    // 移入移除喜欢列表
    changeLikeList(id, like = true) {
      const user = userStore();
      const list = this.persistData.likeList;
      const exists = list.includes(id);
      if (user.userLogin) {
        if (like) {
          if (!exists) {
            setLikeSong(id, like).then((res) => {
              if (res.code == 200) {
                list.push(id);
                $message.info("成功喜欢歌曲");
              } else {
                $message.error("喜欢歌曲时发生错误");
              }
            });
          } else {
            $message.info("我喜欢的列表中已存在该歌曲");
          }
        } else {
          if (exists) {
            setLikeSong(id, like).then((res) => {
              if (res.code == 200) {
                list.splice(list.indexOf(id), 1);
                $message.info("成功取消喜欢歌曲");
              } else {
                $message.error("取消喜欢歌曲时发生错误");
              }
            });
          } else {
            $message.error("我喜欢的列表中未找到该歌曲");
          }
        }
      } else {
        $message.error("请登录账号后使用");
      }
    },
    // 更改音乐播放状态
    setPlayState(value) {
      this.playState = value;
    },
    // 更改展示播放界面
    setBigPlayerState(value) {
      this.showBigPlayer = value;
    },
    // 更改播放条状态
    setPlayBarState(value) {
      this.showPlayBar = value;
    },
    // 更改歌曲播放链接
    setPlaySongLink(value) {
      this.playSongLink = value;
    },
    // 更改播放列表模式
    setPlayListMode(value) {
      console.log(value);
      this.persistData.playListMode = value;
    },
    // 添加歌单至播放列表
    setPlaylists(value) {
      this.persistData.playlists = value;
      console.log(`已添加${value.length}首歌曲至播放列表`);
    },
    // 更改每日推荐数据
    setDailySongs(value) {
      if (value) {
        this.dailySongsData = [];
        value.forEach((v) => {
          this.dailySongsData.push({
            id: v.id,
            name: v.name,
            artist: v.ar,
            album: v.al,
            alia: v.alia,
            time: getSongTime(v.dt),
            fee: v.fee,
            pc: v.pc ? v.pc : null,
            mv: v.mv ? v.mv : null,
          });
        });
      } else {
        $message.error("处理每日推荐发生错误");
      }
    },
    // 歌词处理
    setPlaySongLyric(value) {
      if (value.lrc) {
        try {
          this.playSongLyric = parseLyric(value);
        } catch (err) {
          $message.error("歌词处理出错");
          console.error("歌词处理出错：" + err);
        }
      } else {
        console.log("该歌曲暂无歌词");
        this.playSongLyric = [];
      }
    },
    // 歌曲播放进度
    setPlaySongTime(value) {
      this.persistData.playSongTime.currentTime = value.currentTime;
      this.persistData.playSongTime.duration = value.duration;
      // 计算进度条应该移动的距离
      this.persistData.playSongTime.barMoveDistance = Number(
        (value.currentTime / (value.duration / 100)).toFixed(2)
      );
      if (this.persistData.playSongTime.barMoveDistance) {
        // 歌曲播放进度转换
        this.persistData.playSongTime.songTimePlayed = getSongPlayingTime(
          (value.duration / 100) * this.persistData.playSongTime.barMoveDistance
        );
        this.persistData.playSongTime.songTimeDuration = getSongPlayingTime(
          value.duration
        );
      }
      // 计算当前歌词播放索引
      const setting = settingStore();
      const lrcType = !this.playSongLyric.hasYrc || !setting.showYrc;
      const lyrics = lrcType ? this.playSongLyric.lrc : this.playSongLyric.yrc;
      const index = lyrics.findIndex((v) => v.time >= value.currentTime);
      this.playSongLyricIndex = index === -1 ? lyrics.length - 1 : index - 1;
    },
    // 设置当前播放模式
    setPlaySongMode() {
      if (this.persistData.playSongMode === "normal") {
        this.persistData.playSongMode = "random";
        $message.info("随机播放", {
          icon: () => h(NIcon, null, { default: () => h(ShuffleOne) }),
        });
      } else if (this.persistData.playSongMode === "random") {
        this.persistData.playSongMode = "single";
        $message.info("单曲循环", {
          icon: () => h(NIcon, null, { default: () => h(PlayOnce) }),
        });
      } else {
        this.persistData.playSongMode = "normal";
        $message.info("列表循环", {
          icon: () => h(NIcon, null, { default: () => h(PlayCycle) }),
        });
      }
    },
    // 上下曲调整
    setPlaySongIndex(type) {
      this.playState = false;
      if (this.persistData.personalFmMode) {
        this.setPersonalFmData();
      } else {
        let listLength = this.persistData.playlists.length;
        let listMode = this.persistData.playSongMode;
        // 根据当前播放模式调整
        if (listMode === "normal") {
          this.persistData.playSongIndex += type === "next" ? 1 : -1;
        } else if (listMode === "random") {
          this.persistData.playSongIndex = Math.floor(
            Math.random() * listLength
          );
        } else if (listMode === "single" && $player) {
          $player.currentTime = 0;
        } else {
          $message.error("播放出错，请刷新后重试");
        }
        // 判断是否处于最后/第一首
        if (this.persistData.playSongIndex < 0) {
          this.persistData.playSongIndex = listLength - 1;
        } else if (this.persistData.playSongIndex >= listLength) {
          this.persistData.playSongIndex = 0;
        }
        if (listMode !== "single") {
          this.playSongLink = null;
        }
        this.playState = true;
      }
    },
    // 添加歌曲至播放列表
    addSongToPlaylists(value, play = true) {
      const index = this.persistData.playlists.findIndex(
        (o) => o.id === value.id
      );
      // 判断与上一次播放歌曲是否一致
      try {
        if (
          value.id !==
          this.persistData.playlists[this.persistData.playSongIndex]?.id
        ) {
          console.log("播放歌曲与上一次不一致");
          this.playSongLink = null;
        }
      } catch (error) {
        console.error("出现错误：" + error);
      }
      if (index !== -1) {
        this.persistData.playSongIndex = index;
      } else {
        this.persistData.playlists.push(value);
        this.persistData.playSongIndex = this.persistData.playlists.length - 1;
      }
      play ? (this.playState = true) : null;
    },
    // 在当前播放歌曲后添加
    addSongToNext(value) {
      const index = this.persistData.playlists.findIndex(
        (o) => o.id === value.id
      );
      if (index !== -1) {
        console.log(index);
        if (index === this.persistData.playSongIndex) return true;
        if (index < this.persistData.playSongIndex)
          this.persistData.playSongIndex--;
        const arr = this.persistData.playlists.splice(index, 1)[0];
        this.persistData.playlists.splice(
          this.persistData.playSongIndex + 1,
          0,
          arr
        );
      } else {
        this.persistData.playlists.splice(
          this.persistData.playSongIndex + 1,
          0,
          value
        );
      }
      $message.success(value.name + " 已添加至下一曲播放");
    },
    // 播放列表移除歌曲
    removeSong(index) {
      const name = this.persistData.playlists[index].name;
      if (index < this.persistData.playSongIndex) {
        this.persistData.playSongIndex--;
      }
      $message.success(name + " 已从播放列表中移除");
      this.persistData.playlists.splice(index, 1);
    },
    // 获取歌单分类
    setCatList(highquality = false) {
      getPlayListCatlist().then((res) => {
        if (res.code == 200) {
          this.catList = res;
        } else {
          $message.error("歌单分类获取失败");
        }
      });
      if (highquality) {
        getPlayListCatlist(true).then((res) => {
          if (res.code == 200) {
            this.highqualityCatList = res.tags;
          } else {
            $message.error("精品歌单分类获取失败");
          }
        });
      }
    },
    // 更改播放历史
    setPlayHistory(data, clean = false) {
      if (clean) {
        this.persistData.playHistory = [];
      } else {
        const index = this.persistData.playHistory.findIndex(
          (item) => item.id === data.id
        );
        if (index !== -1) {
          this.persistData.playHistory.splice(index, 1);
          // return false;
        }
        if (this.persistData.playHistory.length > 100)
          this.persistData.playHistory.pop();
        this.persistData.playHistory.unshift(data);
      }
    },
    // 更改搜索历史
    setSearchHistory(name, clean = false) {
      if (clean) {
        this.persistData.searchHistory = [];
      } else {
        const index = this.persistData.searchHistory.indexOf(name);
        if (index !== -1) {
          this.persistData.searchHistory.splice(index, 1);
        }
        this.persistData.searchHistory.unshift(name);
        if (this.persistData.searchHistory.length > 30) {
          this.persistData.searchHistory.pop();
        }
      }
    },
  },
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
      paths: ["persistData"],
    },
  ],
});

export default useMusicDataStore;
