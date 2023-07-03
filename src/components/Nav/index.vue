<template>
  <nav>
    <div class="left">
      <div class="logo" @click="router.push('/')">
        <img :src="logoUrl" alt="logo" />
      </div>
      <Transition name="fade" mode="out-in">
        <div v-show="!site.searchInputActive" class="controls">
          <n-icon size="22" :component="Left" @click="router.go(-1)" />
          <n-icon size="22" :component="Right" @click="router.go(1)" />
        </div>
      </Transition>
    </div>
    <div class="center">
      <router-link class="link" to="/">{{ $t("nav.home") }}</router-link>
      <n-dropdown
        trigger="hover"
        :options="discoverOptions"
        @select="menuSelect"
      >
        <router-link class="link" to="/discover">
          {{ $t("nav.discover") }}
        </router-link>
      </n-dropdown>
      <n-dropdown trigger="hover" :options="userOptions" @select="menuSelect">
        <router-link class="link" to="/user">{{ $t("nav.user") }}</router-link>
      </n-dropdown>
    </div>
    <div class="right">
      <SearchInp />
      <!-- 移动端菜单 -->
      <n-dropdown trigger="click" :options="mbMenuOptions" @select="menuSelect">
        <n-button class="mb-menu" circle>
          <template #icon>
            <n-icon :component="HamburgerButton" />
          </template>
        </n-button>
      </n-dropdown>
      <!-- 下拉菜单 -->
      <n-dropdown
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
  HamburgerButton,
  HomeTwo,
  FindOne,
  Me,
} from "@icon-park/vue-next";
import { userStore, settingStore, siteStore } from "@/store";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import AboutSite from "@/components/DataModal/AboutSite.vue";
import SearchInp from "@/components/SearchInp/index.vue";

const { t } = useI18n();
const router = useRouter();
const user = userStore();
const site = siteStore();
const setting = settingStore();
const aboutSiteRef = ref(null);
const timeOut = ref(null);
const logoUrl = import.meta.env.VITE_SITE_LOGO;

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

// 图标渲染
const renderIcon = (icon) => {
  return () => {
    return h(
      NIcon,
      { style: { transform: "translateX(2px) translateY(1px)" } },
      {
        default: () => icon,
      }
    );
  };
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
                user.userLogin
                  ? user.getUserData.nickname
                  : t("nav.avatar.notLogin"),
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
                          color: setting.themeData.primaryColor,
                        },
                        {
                          default: () =>
                            "Lv." + user.getUserOtherData.level.level,
                        }
                      )
                    : t("nav.avatar.loginError")
                  : t("nav.avatar.notLoginSubtitle"),
            }
          ),
        ]),
      ]),
    ]
  );
};

// 下拉框数据
const discoverOptions = ref([]);
const userOptions = ref([]);
const dropdownOptions = ref([]);

// 写入下拉框数据
const changeDiscoverOptions = () => {
  discoverOptions.value = [
    {
      label: t("nav.discoverChildren.playlists"),
      key: "/discover/playlists",
    },
    {
      label: t("nav.discoverChildren.toplists"),
      key: "/discover/toplists",
    },
    {
      label: t("nav.discoverChildren.artists"),
      key: "/discover/artists",
    },
  ];
};
const changeUserOptions = (val) => {
  userOptions.value = val
    ? [
        {
          label: t("nav.userChildren.playlist"),
          key: "/user/playlists",
        },
        {
          label: t("nav.userChildren.like"),
          key: "/user/like",
        },
        {
          label: t("nav.userChildren.album"),
          key: "/user/album",
        },
        {
          label: t("nav.userChildren.artist"),
          key: "/user/artists",
        },
        {
          label: t("nav.userChildren.cloud"),
          key: "/user/cloud",
        },
      ]
    : [
        {
          label: t("nav.userChildren.login"),
          key: "/login",
        },
      ];
};
const changeDropdownOptions = () => {
  dropdownOptions.value = [
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
          { style: { transform: "translateX(2px) translateY(1px)" } },
          {
            default: () =>
              setting.getSiteTheme == "light"
                ? t("nav.avatar.dark")
                : t("nav.avatar.light"),
          }
        );
      },
      key: "changeTheme",
      icon: () => {
        return h(
          NIcon,
          { style: { transform: "translateX(2px) translateY(1px)" } },
          {
            default: () =>
              setting.getSiteTheme == "light" ? h(Moon) : h(SunOne),
          }
        );
      },
    },
    {
      label: t("nav.avatar.history"),
      key: "history",
      icon: renderIcon(h(History)),
    },
    {
      label: t("nav.avatar.setting"),
      key: "setting",
      icon: renderIcon(h(SettingTwo)),
    },
    {
      label: () => {
        return h(
          NText,
          { style: { transform: "translateX(2px) translateY(1px)" } },
          {
            default: () =>
              user.userLogin ? t("nav.avatar.logout") : t("nav.avatar.login"),
          }
        );
      },
      key: "user",
      icon: () => {
        return h(
          NIcon,
          { style: { transform: "translateX(2px) translateY(1px)" } },
          {
            default: () => (user.userLogin ? h(Logout) : h(Login)),
          }
        );
      },
    },
    {
      label: t("nav.avatar.about"),
      key: "about",
      icon: renderIcon(h(Info)),
    },
  ];
};

// 移动端菜单
const mbMenuOptions = ref([]);
const changeMbMenuOptions = () => {
  mbMenuOptions.value = [
    {
      label: t("nav.home"),
      key: "/",
      icon: renderIcon(h(HomeTwo)),
    },
    {
      label: t("nav.discover"),
      key: "/discover",
      icon: renderIcon(h(FindOne)),
    },
    {
      label: t("nav.user"),
      key: "/user",
      icon: renderIcon(h(Me)),
    },
  ];
};

// 下拉框点击事件
const menuSelect = (key) => {
  router.push(key);
};
const dropdownSelect = (key) => {
  showDropdown.value = false;
  switch (key) {
    // 明暗切换
    case "changeTheme":
      setting.getSiteTheme === "light"
        ? setting.setSiteTheme("dark")
        : setting.setSiteTheme("light");
      setting.themeAuto = false;
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
          title: t("nav.avatar.logout"),
          content: t("nav.avatar.tip"),
          positiveText: t("nav.avatar.logout"),
          negativeText: t("general.dialog.cancel"),
          onPositiveClick: () => {
            user.userLogOut();
            $message.success(t("nav.avatar.success"));
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

// 监听语言变化
watch(
  () => setting.language,
  () => {
    changeDiscoverOptions();
    changeMbMenuOptions();
    changeDropdownOptions();
    changeUserOptions(user.userLogin);
  }
);

onMounted(() => {
  changeDiscoverOptions();
  changeMbMenuOptions();
  changeDropdownOptions();
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
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  .fade-enter-active {
    transition-delay: 0.5s;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
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
      transition: all 0.3s;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
      }
      @media (min-width: 640px) {
        &:hover {
          transform: scale(1.15);
        }
      }
      &:active {
        transform: scale(1);
      }
    }
    .controls {
      display: flex;
      flex-direction: row;
      align-items: center;
      .n-icon {
        margin: 0 4px;
        border-radius: 8px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.3s;
        @media (min-width: 640px) {
          &:hover {
            background-color: var(--n-border-color);
          }
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
        background-color: var(--main-color);
        color: rgba(255, 255, 255, 0.9);
      }
      &:active {
        transform: scale(0.95);
      }
    }

    .router-link-active {
      background-color: var(--main-color);
      color: rgba(255, 255, 255, 0.9);
    }
  }
  .right {
    flex: 1;
    max-width: 300px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    @media (max-width: 520px) {
      position: absolute;
      right: 12px;
    }
    .avatar {
      width: 30px;
      min-width: 30px;
      height: 30px;
      margin-left: 12px;
      box-shadow: 0 4px 12px -2px rgb(0 0 0 / 10%);
      cursor: pointer;
    }
    .mb-menu {
      margin-left: 12px;
      display: none;
      @media (max-width: 768px) {
        display: flex;
      }
    }
  }
}
</style>
