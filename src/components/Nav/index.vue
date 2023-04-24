<template>
  <nav>
    <div class="left">
      <div class="logo" @click="router.push('/')">
        <img src="/images/logo/favicon.svg" alt="logo" />
      </div>
      <div class="controls">
        <n-icon size="22" :component="Left" @click="router.go(-1)" />
        <n-icon size="22" :component="Right" @click="router.go(1)" />
      </div>
    </div>
    <div class="center">
      <router-link class="link" to="/">首页</router-link>
      <n-dropdown
        trigger="hover"
        :options="discoverOptions"
        @select="menuSelect"
      >
        <router-link class="link" to="/discover">发现</router-link>
      </n-dropdown>
      <n-dropdown trigger="hover" :options="userOptions" @select="menuSelect">
        <router-link class="link" to="/user">我的</router-link>
      </n-dropdown>
    </div>
    <div class="right">
      <SearchInp />
      <!-- 下拉菜单 -->
      <n-dropdown
        class="dropdown"
        placement="bottom-end"
        :show="showDropdown"
        :show-arrow="true"
        :options="dropdownOptions"
        :on-clickoutside="closeDropdown"
        @select="dropdownSelect"
      >
        <n-avatar
          class="avatar"
          round
          size="small"
          :src="
            user.getUserData.avatarUrl
              ? user.getUserData.avatarUrl.replace(/^http:/, 'https:') +
                '?param=60y60'
              : '/images/ico/user-filling.svg'
          "
          :img-props="{ class: 'avatarImg' }"
          fallback-src="/images/ico/user-filling.svg"
          @click="showDropdown = !showDropdown"
        />
      </n-dropdown>
      <!-- 关于本站 -->
      <AboutSite ref="aboutSiteRef" />
    </div>
  </nav>
</template>

<script setup>
import { NIcon, NAvatar, NText, NProgress } from "naive-ui";
import {
  Left,
  Right,
  Login,
  Logout,
  Info,
  SettingTwo,
  History,
  SunOne,
  Moon,
} from "@icon-park/vue-next";
import { userStore, settingStore } from "@/store";
import { useRouter } from "vue-router";
import AboutSite from "@/components/DataModal/AboutSite.vue";
import SearchInp from "@/components/SearchInp/index.vue";

const router = useRouter();
const user = userStore();
const setting = settingStore();
const aboutSiteRef = ref(null);
const timeOut = ref(null);

// 下拉菜单显隐
const showDropdown = ref(false);
const closeDropdown = (event) => {
  // 解决点击头像无法关闭
  if (event.target.className == "avatarImg") {
    showDropdown.value = true;
  } else {
    showDropdown.value = false;
  }
};

// 用户数据模块
const userDataRender = () => {
  return h(
    "div",
    {
      style:
        "display: flex; align-items: center; padding: 8px 12px; cursor: pointer",
      onclick: () => {
        user.userLogin ? router.push("/user") : router.push("/login");
        showDropdown.value = false;
      },
    },
    [
      h(NAvatar, {
        round: true,
        style: "margin-right: 12px",
        src: user.userLogin
          ? user.getUserData.avatarUrl.replace(/^http:/, "https:") +
            "?param=60y60"
          : "/images/ico/user-filling.svg",
        fallbackSrc: "/images/ico/user-filling.svg",
      }),
      h("div", null, [
        h("div", null, [
          h(
            NText,
            { depth: 2 },
            {
              default: () =>
                user.userLogin ? user.getUserData.nickname : "未登录",
            }
          ),
        ]),
        h("div", { style: "font-size: 12px;" }, [
          h(
            NText,
            { depth: 3 },
            {
              default: () =>
                user.userLogin
                  ? Object.keys(user.getUserOtherData).length
                    ? h(
                        NProgress,
                        {
                          height: 4,
                          type: "line",
                          percentage:
                            user.getUserOtherData.level.progress * 100,
                          color: "#f55e55",
                        },
                        {
                          default: () =>
                            "Lv." + user.getUserOtherData.level.level,
                        }
                      )
                    : "等级信息获取失败"
                  : "登录后享受完整功能",
            }
          ),
        ]),
      ]),
    ]
  );
};

// 下拉框数据
const discoverOptions = ref([
  {
    label: "歌单",
    key: "/discover/playlists",
  },
  {
    label: "排行榜",
    key: "/discover/toplists",
  },
  {
    label: "歌手",
    key: "/discover/artists",
  },
]);
const userOptions = ref([]);
const changeUserOptions = (val) => {
  userOptions.value = val
    ? [
        {
          label: "我的歌单",
          key: "/user/playlists",
        },
        {
          label: "收藏的歌单",
          key: "/user/like",
        },
        {
          label: "收藏的专辑",
          key: "/user/album",
        },
        {
          label: "收藏的歌手",
          key: "/user/artists",
        },
        {
          label: "音乐云盘",
          key: "/user/cloud",
        },
      ]
    : [
        {
          label: "登录账号",
          key: "/login",
        },
      ];
};
const dropdownOptions = ref([
  {
    key: "header",
    type: "render",
    render: userDataRender,
  },
  {
    key: "header-divider",
    type: "divider",
  },
  {
    label: () => {
      return h(
        NText,
        { style: { transform: "translateX(2px)" } },
        {
          default: () =>
            setting.getSiteTheme == "light" ? "深色模式" : "浅色模式",
        }
      );
    },
    key: "changeTheme",
    icon: () => {
      return h(
        NIcon,
        { style: { transform: "translateX(2px)" } },
        {
          default: () =>
            setting.getSiteTheme == "light" ? h(Moon) : h(SunOne),
        }
      );
    },
  },
  {
    label: "播放历史",
    key: "history",
    icon: () => {
      return h(
        NIcon,
        { style: { transform: "translateX(2px)" } },
        {
          default: () => h(History),
        }
      );
    },
  },
  {
    label: "全局设置",
    key: "setting",
    icon: () => {
      return h(
        NIcon,
        { style: { transform: "translateX(2px)" } },
        {
          default: () => h(SettingTwo),
        }
      );
    },
  },
  {
    label: () => {
      return h(
        NText,
        { style: { transform: "translateX(2px)" } },
        {
          default: () => (user.userLogin ? "退出登录" : "登录账号"),
        }
      );
    },
    key: "user",
    icon: () => {
      return h(
        NIcon,
        { style: { transform: "translateX(2px)" } },
        {
          default: () => (user.userLogin ? h(Logout) : h(Login)),
        }
      );
    },
  },
  {
    label: "关于本站",
    key: "about",
    icon: () => {
      return h(
        NIcon,
        { style: { transform: "translateX(2px)" } },
        {
          default: () => h(Info),
        }
      );
    },
  },
]);

// 下拉框事件
const menuSelect = (key) => {
  router.push(key);
};
const dropdownSelect = (key) => {
  showDropdown.value = false;
  switch (key) {
    // 明暗切换
    case "changeTheme":
      setting.getSiteTheme == "light"
        ? setting.setSiteTheme("dark")
        : setting.setSiteTheme("light");
      break;
    // 播放历史
    case "history":
      router.push("/history");
      break;
    // 设置
    case "setting":
      router.push("/setting");
      break;
    // 用户
    case "user":
      if (user.userLogin) {
        // 退出登录
        $dialog.warning({
          class: "s-dialog",
          title: "退出登录",
          content: "确认退出当前用户登录？",
          positiveText: "退出登录",
          negativeText: "取消",
          onPositiveClick: () => {
            user.userLogOut();
            $message.success("已退出登录");
            // 刷新页面
            timeOut.value = setTimeout(() => {
              document.location.reload();
            }, 1000);
          },
        });
      } else {
        // 登录
        router.push("/login");
      }
      break;
    // 关于
    case "about":
      aboutSiteRef.value.openAboutSite();
      break;
    default:
      break;
  }
};

// 监听登录状态变化
watch(
  () => user.userLogin,
  (val) => {
    changeUserOptions(val);
  }
);

onMounted(() => {
  changeUserOptions(user.userLogin);
});

onBeforeUnmount(() => {
  clearTimeout(timeOut.value);
});
</script>

<style lang="scss" scoped>
nav {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  .left {
    flex: 1;
    max-width: 300px;
    display: flex;
    flex-direction: row;
    align-items: center;
    @media (max-width: 990px) {
      flex: initial;
    }
    .logo {
      width: 30px;
      height: 30px;
      margin-right: 12px;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
      }
    }
    .controls {
      display: flex;
      flex-direction: row;
      align-items: center;
      @media (max-width: 520px) {
        display: none;
      }
      .n-icon {
        margin: 0 4px;
        border-radius: 8px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          background-color: var(--n-border-color);
        }
        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
  .center {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    @media (max-width: 768px) {
      display: none;
    }
    .link {
      display: block;
      text-decoration: none;
      color: var(--n-text-color);
      padding: 6px 16px;
      margin: 0 2px;
      border-radius: 8px;
      transition: all 0.3s;
      cursor: pointer;
      &:hover {
        background-color: $mainColor;
        color: var(--n-color);
      }
      &:active {
        transform: scale(0.95);
      }
    }

    .router-link-active {
      background-color: $mainColor;
      color: var(--n-color);
    }
  }
  .right {
    flex: 1;
    max-width: 300px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    .avatar {
      width: 30px;
      min-width: 30px;
      height: 30px;
      margin-left: 12px;
      box-shadow: 0 4px 12px -2px rgb(0 0 0 / 10%);
      cursor: pointer;
    }
  }
}
</style>
