import { defineStore } from "pinia";
import { userLogOut, getUserLevel, getUserSubcount } from "@/api";

const useUserDataStore = defineStore("userData", {
  state: () => {
    return {
      // 用户登录状态
      userLogin: false,
      // 用户 cookie
      cookie: null,
      // 用户数据
      userData: {},
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
      window.localStorage.removeItem("cookie");
      userLogOut();
    },
  },
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
    },
  ],
});

export default useUserDataStore;
