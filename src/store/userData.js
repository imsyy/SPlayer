import { defineStore } from "pinia";
import {
  userLogOut,
  getUserLevel,
  getUserSubcount,
  getUserPlaylist,
  getUserArtistlist,
  getUserAlbum,
} from "@/api/user";
import { formatNumber, getLongTime } from "@/utils/timeTools";
import getLanguageData from "@/utils/getLanguageData";

const useUserDataStore = defineStore("userData", {
  state: () => {
    return {
      // 用户登录状态
      userLogin: false,
      // 用户 cookie
      cookie: null,
      // 用户基础数据
      userData: {},
      // 用户详情数据
      userOtherData: {},
      // 用户歌单
      userPlayLists: {
        isLoading: false,
        has: false,
        own: [], // 创建歌单
        like: [], // 收藏歌单
      },
      // 用户专辑
      userAlbum: {
        isLoading: false,
        has: false,
        list: [],
      },
      // 用户收藏歌手
      userArtistLists: {
        isLoading: false,
        has: false,
        list: [],
      },
    };
  },
  getters: {
    // 获取 cookie
    getCookie(state) {
      return state.cookie;
    },
    // 获取用户基础数据
    getUserData(state) {
      return state.userData;
    },
    // 获取用户详情数据
    getUserOtherData(state) {
      return state.userOtherData;
    },
    // 获取用户歌单
    getUserPlayLists(state) {
      return state.userPlayLists;
    },
    // 获取用户收藏歌手
    getUserArtistLists(state) {
      return state.userArtistLists;
    },
    // 获取用户收藏专辑
    getUserAlbumLists(state) {
      return state.userAlbum;
    },
  },
  actions: {
    // 更改 cookie
    setCookie(value) {
      window.localStorage.setItem("cookie", value);
      this.cookie = value;
    },
    // 更改用户数据
    setUserData(value) {
      this.userData = value;
    },
    // 更改用户等级信息
    setUserOtherData() {
      if (this.userLogin) {
        const getOtherData = [getUserLevel(), getUserSubcount()];
        Promise.all(getOtherData)
          .then((res) => {
            console.log(res);
            this.userOtherData.level = res[0].data;
            this.userOtherData.subcount = res[1];
            // this.setUserPlayLists();
          })
          .catch((err) => {
            console.error(getLanguageData("getDataError"), err);
            $message.error(getLanguageData("getDataError"));
          });
      }
    },
    // 退出登录
    userLogOut() {
      this.userLogin = false;
      this.cookie = null;
      this.userData = {};
      this.userOtherData = {};
      localStorage.removeItem("cookie");
      // 调用退出登录接口
      userLogOut();
    },
    // 更改用户歌单
    async setUserPlayLists(callback) {
      if (this.userLogin) {
        try {
          this.userPlayLists.isLoading = true;
          const { userId } = this.userData;
          // const { subcount } = this.userOtherData;
          const { createdPlaylistCount, subPlaylistCount } =
            await getUserSubcount();
          const number = createdPlaylistCount + subPlaylistCount ?? 30;
          const res = await getUserPlaylist(userId, number);
          if (res.playlist) {
            this.userPlayLists = {
              has: true,
              own: [],
              like: [],
            };
            res.playlist.forEach((v) => {
              if (v.creator.userId === this.getUserData.userId) {
                this.userPlayLists.own.push({
                  id: v.id,
                  cover: v.coverImgUrl,
                  name: v.name,
                  artist: v.creator,
                  desc: v.description,
                  tags: v.tags,
                  playCount: formatNumber(v.playCount),
                  trackCount: v.trackCount,
                });
              } else {
                this.userPlayLists.like.push({
                  id: v.id,
                  cover: v.coverImgUrl,
                  name: v.name,
                  artist: v.creator,
                  playCount: formatNumber(v.playCount),
                });
              }
            });
            if (callback && typeof callback === "function") {
              callback();
            }
            this.userPlayLists.isLoading = false;
          } else {
            this.userPlayLists.isLoading = false;
            $message.info(getLanguageData("getDaraEmpty"));
          }
        } catch (err) {
          this.userPlayLists.isLoading = false;
          if (this.userLogin) {
            console.error(getLanguageData("getDataError"), err);
            $message.error(getLanguageData("getDataError"));
          }
        }
      } else {
        $message.error(getLanguageData("needLogin"));
      }
    },
    // 更改用户收藏歌手
    async setUserArtistLists(callback) {
      if (this.userLogin) {
        try {
          this.userArtistLists.isLoading = true;
          const res = await getUserArtistlist();
          if (res.data) {
            this.userArtistLists.list = [];
            this.userArtistLists.has = true;
            res.data.forEach((v) => {
              this.userArtistLists.list.push({
                id: v.id,
                name: v.name,
                cover: v.img1v1Url,
                size: v.musicSize,
              });
            });
            if (callback && typeof callback === "function") {
              callback();
            }
            this.userArtistLists.isLoading = false;
          } else {
            this.userArtistLists.isLoading = false;
            $message.info(getLanguageData("getDaraEmpty"));
          }
        } catch (err) {
          this.userArtistLists.isLoading = false;
          if (this.userLogin) {
            console.error(getLanguageData("getDataError"), err);
            $message.error(getLanguageData("getDataError"));
          }
        }
      } else {
        $message.error(getLanguageData("needLogin"));
      }
    },
    // 更改用户收藏专辑
    async setUserAlbumLists(callback) {
      if (this.userLogin) {
        try {
          let offset = 0;
          let totalCount = null;
          this.userAlbum.isLoading = true;
          this.userAlbum.list = [];
          while (totalCount === null || offset < totalCount) {
            const res = await getUserAlbum(30, offset);
            res.data.forEach((v) => {
              this.userAlbum.list.push({
                id: v.id,
                cover: v.picUrl,
                name: v.name,
                artist: v.artists,
                time: getLongTime(v.subTime),
              });
            });
            totalCount = res.count;
            offset += 30;
            console.log(totalCount, offset, this.userAlbum.list);
          }
          if (callback && typeof callback === "function") {
            callback();
          }
          this.userAlbum.isLoading = false;
          this.userAlbum.has = true;
        } catch (err) {
          this.userAlbum.isLoading = false;
          if (this.userLogin) {
            console.error(getLanguageData("getDataError"), err);
            $message.error(getLanguageData("getDataError"));
          }
        }
      } else {
        $message.error(getLanguageData("needLogin"));
      }
    },
  },
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
      paths: ["userLogin", "cookie", "userData", "userOtherData"],
    },
  ],
});

export default useUserDataStore;
