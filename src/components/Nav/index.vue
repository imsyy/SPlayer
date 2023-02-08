<template>
  <nav>
    <div class="left">
      <div class="logo" @click="router.push('/')">
        <img src="/images/logo/favicon.svg" alt="logo" />
      </div>
      <div class="controls">
        <n-icon
          size="26"
          :component="NavigateBeforeFilled"
          @click="router.go(-1)"
        />
        <n-icon
          size="26"
          :component="NavigateNextFilled"
          @click="router.go(1)"
        />
      </div>
    </div>
    <div class="center">
      <router-link class="link" to="/">首页</router-link>
      <router-link class="link" to="/discover">发现</router-link>
      <router-link class="link" to="/user">我的</router-link>
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
              ? user.getUserData.avatarUrl
              : '/images/ico/user-filling.svg'
          "
          :img-props="{ class: 'avatarImg' }"
          fallback-src="/images/ico/user-filling.svg"
          @click="showDropdown = !showDropdown"
        />
      </n-dropdown>
      <!-- 关于本站 -->
      <n-modal
        class="main-model"
        v-model:show="showAboutModal"
        style="width: 60vw; min-width: min(24rem, 100vw)"
        preset="card"
        title="关于本站"
        :bordered="false"
      >
        <div class="copyright">
          <div class="desc">
            <n-text class="name">SPlayer</n-text>
            <n-text class="version" :depth="3">
              v&nbsp;{{ packageJson.version }}
            </n-text>
          </div>
          <n-blockquote>
            <n-text class="power">
              Copyright&nbsp;©&nbsp;2020 - {{ new Date().getFullYear() }}
              <n-a
                :href="packageJson.home"
                target="_blank"
                v-html="packageJson.author"
              />
            </n-text>
            <n-text class="point" v-html="'·'" />
            <n-a
              v-if="icp"
              class="beian"
              href="https://beian.miit.gov.cn/"
              target="_blank"
              v-html="icp"
            />
          </n-blockquote>
          <n-button
            class="github"
            secondary
            strong
            @click="jumpUrl(packageJson.github)"
          >
            <template #icon>
              <n-icon :component="GithubOne" />
            </template>
            Github
          </n-button>
        </div>
      </n-modal>
    </div>
  </nav>
</template>

<script setup>
import { NIcon, NAvatar, NText, NProgress } from "naive-ui";
import {
  NavigateBeforeFilled,
  NavigateNextFilled,
  LogInFilled,
  LogOutFilled,
  SettingsRound,
  WbSunnyFilled,
  DarkModeFilled,
  InfoRound,
  HistoryRound,
} from "@vicons/material";
import { GithubOne, Copyright } from "@icon-park/vue-next";
import { userStore, settingStore } from "@/store/index";
import { useRouter } from "vue-router";
import SearchInp from "@/components/SearchInp/index.vue";
import packageJson from "@/../package.json";
const router = useRouter();
const user = userStore();
const setting = settingStore();

// 下拉菜单显隐
let showDropdown = ref(false);
const closeDropdown = (event) => {
  // 解决点击头像无法关闭
  if (event.target.className == "avatarImg") {
    showDropdown.value = true;
  } else {
    showDropdown.value = false;
  }
};

// 关于本站弹窗
let showAboutModal = ref(false);
let icp = ref(import.meta.env.VITE_ICP ? import.meta.env.VITE_ICP : null);

// 链接跳转
const jumpUrl = (url) => {
  window.open(url);
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
          ? user.getUserData.avatarUrl
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
                  ? user.getUserData.level
                    ? h(
                        NProgress,
                        {
                          height: 4,
                          type: "line",
                          percentage: user.getUserData.level.progress * 100,
                          color: "#f55e55",
                        },
                        {
                          default: () => "Lv." + user.getUserData.level.level,
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
let dropdownOptions = ref([
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
      return h(NText, null, {
        default: () =>
          setting.getSiteTheme == "light" ? "深色模式" : "浅色模式",
      });
    },
    key: "changeTheme",
    icon: () => {
      return h(
        NIcon,
        { style: "transform: translateY(-1px)" },
        {
          default: () =>
            setting.getSiteTheme == "light"
              ? h(DarkModeFilled)
              : h(WbSunnyFilled),
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
        { style: "transform: translateY(-1px)" },
        {
          default: () => h(HistoryRound),
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
        { style: "transform: translateY(-2px)" },
        {
          default: () => h(SettingsRound),
        }
      );
    },
  },
  {
    label: () => {
      return h(NText, null, {
        default: () => (user.userLogin ? "退出登录" : "登录账号"),
      });
    },
    key: "user",
    icon: () => {
      return h(
        NIcon,
        { style: "transform: translateY(-1px)" },
        {
          default: () => (user.userLogin ? h(LogOutFilled) : h(LogInFilled)),
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
        { style: "transform: translateY(-2px)" },
        {
          default: () => h(InfoRound),
        }
      );
    },
  },
]);

// 下拉框事件
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
          title: "退出登录",
          content: "确认退出当前用户登录？",
          positiveText: "退出",
          negativeText: "取消",
          onPositiveClick: () => {
            user.userLogOut();
            $message.success("已退出登录");
          },
        });
      } else {
        // 登录
        router.push("/login");
      }
      break;
    // 关于
    case "about":
      showAboutModal.value = true;
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
nav {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
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
.copyright {
  display: flex;
  flex-direction: column;
  a {
    text-decoration: none;
  }
  .name {
    font-size: 30px;
    font-weight: bold;
  }
  .version {
    margin-left: 6px;
  }
  .n-blockquote {
    @media (max-width: 768px) {
      display: flex;
      flex-direction: column;
      .point {
        display: none;
      }
    }
    .point {
      margin: 0 4px;
    }
  }
  .github {
    margin-top: 8px;
  }
}
</style>