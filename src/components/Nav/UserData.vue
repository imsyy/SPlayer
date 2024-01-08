<!-- 导航栏 - 用户数据 -->
<template>
  <n-dropdown
    :key="userLoginStatus"
    :show-arrow="true"
    :show="userMenuShow"
    :options="userMenuOptions"
    placement="bottom-end"
    @select="userMenuSelect"
    @clickoutside="userMenuShow = false"
  >
    <div
      class="user"
      :style="{ pointerEvents: userMenuShow ? 'none' : 'auto' }"
      @click="userMenuShow = !userMenuShow"
    >
      <div class="avatar">
        <n-avatar v-if="userLoginStatus" :src="userData.detail?.profile?.avatarUrl" round />
        <n-avatar v-else round>
          <n-icon depth="3">
            <SvgIcon icon="account-circle" />
          </n-icon>
        </n-avatar>
      </div>
      <div class="user-data">
        <n-text :key="userLoginStatus" class="name">
          {{ userLoginStatus ? userData.detail?.profile?.nickname || "未知用户名" : "未登录" }}
        </n-text>
        <!-- VIP -->
        <img
          v-if="userLoginStatus && userData.detail?.profile?.vipType === 11"
          class="vip"
          src="/images/pic/vip.png?assest"
        />
        <n-icon depth="3" class="more">
          <SvgIcon icon="menu-down" />
        </n-icon>
      </div>
    </div>
  </n-dropdown>
  <!-- 登录弹窗 -->
  <Login ref="loginRef" />
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { NIcon, NText, NNumberAnimation, NButton } from "naive-ui";
import { siteData, siteSettings } from "@/stores";
import SvgIcon from "@/components/Global/SvgIcon";
import userSignIn from "@/utils/userSignIn";

const data = siteData();
const router = useRouter();
const settings = siteSettings();
const { userLoginStatus, userData, userLikeData } = storeToRefs(data);
const { themeType } = storeToRefs(settings);

// 菜单数据
const userMenuShow = ref(false);

// 登录弹窗
const loginRef = ref(null);

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, () => h(SvgIcon, { icon }));
};

// 数量统计模块
const createUserNumber = (num, text, duration = 1000) => {
  return h(
    "div",
    {
      className: "user-pl",
      onclick: () => {
        userMenuShow.value = false;
        router.push(
          `/like/${text === "歌单" ? "playlists?" : text === "专辑" ? "albums" : "artists"}`,
        );
      },
    },
    [
      h(NNumberAnimation, { from: 0, to: num, duration }),
      h(NText, { depth: 3, style: { fontSize: "12px" } }, () => [text]),
    ],
  );
};

// 生成导航栏用户信息
const createUserData = () => {
  // 是否签到
  const signInStatus = sessionStorage.getItem("lastSignInDate") ? true : false;
  return h(
    "div",
    { className: "nav-user-data" },
    userLoginStatus.value
      ? [
          // 喜欢数量
          h("div", { className: "nav-user-num" }, [
            createUserNumber(userLikeData.value.playlists?.length || 0, "歌单"),
            createUserNumber(userLikeData.value.albums?.length || 0, "专辑"),
            createUserNumber(userLikeData.value.artists?.length || 0, "歌手"),
          ]),
          // 签到等级
          h("div", { className: "nav-user-silder" }, [
            h(
              NButton,
              {
                round: true,
                renderIcon: renderIcon(signInStatus ? "calendar-check" : "calendar-badge"),
                disabled: signInStatus,
                onclick: async () => {
                  userMenuShow.value = false;
                  await userSignIn();
                },
              },
              () => [signInStatus ? "今日已签到" : "立即签到"],
            ),
          ]),
        ]
      : h(NText, { depth: 3 }, () => ["登录后可享受完整功能"]),
  );
};

// 用户信息
const userMenuOptions = computed(() => [
  {
    key: "header",
    type: "render",
    render: createUserData,
  },
  {
    type: "divider",
    key: "d1",
  },
  {
    label: themeType.value === "dark" ? "浅色模式" : "深色模式",
    key: "darkOrlight",
    icon: renderIcon(themeType.value === "dark" ? "round-wb-sunny" : "round-dark-mode"),
  },
  {
    label: "全局设置",
    key: "setting",
    icon: renderIcon("round-settings"),
  },
  {
    label: userLoginStatus.value ? "退出登录" : "登录账号",
    key: "logoutOrlogin",
    icon: renderIcon(userLoginStatus.value ? "logout" : "login"),
  },
]);

// 用户信息选中
const userMenuSelect = (key) => {
  console.log(key);
  userMenuShow.value = false;
  switch (key) {
    // 明暗切换
    case "darkOrlight":
      settings.setThemeType(themeType.value === "light" ? "dark" : "light");
      break;
    // 登录登出
    case "logoutOrlogin":
      loginRef.value.openLoginModal();
      break;
    // 全局设置
    case "setting":
      router.push("/setting");
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
.user {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 34px;
  margin-left: auto;
  padding: 4px 6px 4px 0;
  background-color: var(--n-border-color);
  border-radius: 25px;
  box-sizing: border-box;
  cursor: pointer;
  -webkit-app-region: no-drag;
  .avatar {
    display: flex;
    align-items: center;
    height: 38px;
    width: 38px;
    min-width: 38px;
    margin-right: 8px;
    .n-avatar {
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      :deep(img) {
        width: 80%;
        height: 80%;
        border-radius: 50%;
      }
    }
  }
  .user-data {
    display: flex;
    align-items: center;
    max-width: 200px;
    .vip {
      margin-left: 6px;
      height: 18px;
    }
    .more {
      font-size: 20px;
      margin-left: 2px;
    }
  }
  @media (max-width: 700px) {
    padding: 0;
    .avatar {
      margin: 0;
    }
    .user-data {
      display: none;
    }
  }
}
</style>

<style lang="scss">
.nav-user-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  .nav-user-num {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    .user-pl {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0px 8px;
      min-width: 30px;
      font-size: 16px;
      .n-text {
        font-size: 12px;
      }
    }
  }
  .nav-user-silder {
    text-align: center;
    width: 100%;
    margin-top: 12px;
    .n-button {
      font-size: 13px;
    }
  }
}
</style>
