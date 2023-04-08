import { defineStore } from "pinia";
import {
  userLogOut,
  getUserLevel,
  getUserSubcount,
  getUserPlaylist,
  getUserArtistlist,
} from "@/api/user";
import { formatNumber } from "@/utils/timeTools.js";

const useUserDataStore = defineStore("userData", {
  state: () => {
    return {
      // 用户登录状态
      userLogin: false,
      // 用户 cookie
      cookie: null,
      // 用户数据
      userData: {},
      // 用户歌单
      userPlayLists: {
        has: false,
        own: [], // 创建歌单
        like: [], // 收藏歌单
      },
      // 用户收藏歌手
      userArtistLists: {
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
    // 获取用户数据
    getUserData(state) {
      return state.userData;
    },
    // 获取用户歌单
    getUserPlayLists(state) {
      return state.userPlayLists;
    },
    // 获取用户收藏歌手
    getUserArtistlists(state) {
      return state.userArtistLists;
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
      if (!this.userData.level) this.setUserOtherData();
    },
    // 更改用户等级信息
    setUserOtherData() {
      if (this.userLogin) {
        getUserLevel()
          .then((res) => {
            this.userData.level = res.data;
          })
          .catch((err) => {
            $message.error("获取用户等级出错 " + err);
          });
        getUserSubcount()
          .then((res) => {
            this.userData.subcount = res;
          })
          .catch((err) => {
            $message.error("获取用户详情失败 " + err);
          });
      }
    },
    // 退出登录
    userLogOut() {
      this.userLogin = false;
      this.cookie = null;
      this.userData = {};
      localStorage.removeItem("cookie");
      userLogOut();
    },
    // 更改用户歌单
    setUserPlayLists() {
      if (this.userLogin) {
        try {
          getUserPlaylist(
            this.getUserData.userId,
            this.getUserData.subcount.createdPlaylistCount +
            this.getUserData.subcount.subPlaylistCount
          ).then((res) => {
            if (res.playlist) {
              this.userPlayLists = {
                own: [],
                like: [],
              };
              this.userPlayLists.has = true;
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
            } else {
              $message.error("用户歌单为空");
            }
          });
        } catch (err) {
          console.error("获取用户歌单时出现错误：" + err);
          $message.error("获取用户歌单时出现错误，请刷新后重试");
        }
      } else {
        $message.error("请登录账号后使用");
      }
    },
    // 更改用户收藏歌手
    setUserArtistLists() {
      if (this.userLogin) {
        getUserArtistlist().then((res) => {
          if (res.data) {
            this.userArtistLists = {
              list: [],
            };
            this.userArtistLists.has = true;
            res.data.forEach((v) => {
              this.userArtistLists.list.push({
                id: v.id,
                name: v.name,
                cover: v.img1v1Url,
                size: v.musicSize,
              });
            });
          } else {
            $message.error("用户收藏歌手为空");
          }
        });
      } else {
        $message.error("请登录账号后使用");
      }
    },
  },
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
      paths: ["userLogin", "cookie", "userData"],
    },
  ],
});

export default useUserDataStore;
