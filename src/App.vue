<template>
  <Provider>
    <n-layout style="height: 100vh">
      <n-layout-header bordered>
        <Nav />
      </n-layout-header>
      <n-layout-content
        position="absolute"
        :class="music.getPlaylists[0] && music.showPlayBar ? 'show' : ''"
        :native-scrollbar="false"
        embedded
      >
        <main ref="mainContent" class="main">
          <n-back-top
            :bottom="music.getPlaylists[0] && music.showPlayBar ? 100 : 40"
            style="transition: all 0.3s"
          />
          <router-view v-slot="{ Component }">
            <keep-alive>
              <Transition name="scale" mode="out-in">
                <component :is="Component" />
              </Transition>
            </keep-alive>
          </router-view>
          <Player />
        </main>
      </n-layout-content>
    </n-layout>
  </Provider>
</template>

<script setup>
import { musicStore, userStore, settingStore } from "@/store";
import { useRouter } from "vue-router";
import { getLoginState } from "@/api/login";
import { userDailySignin, userYunbeiSign } from "@/api/user";
import Provider from "@/components/Provider/index.vue";
import Nav from "@/components/Nav/index.vue";
import Player from "@/components/Player/index.vue";
import packageJson from "@/../package.json";

const music = musicStore();
const user = userStore();
const setting = settingStore();
const router = useRouter();
const mainContent = ref(null);

// 公告数据
const annShow =
  import.meta.env.VITE_ANN_TITLE && import.meta.env.VITE_ANN_CONTENT
    ? true
    : false;
const annTitle = import.meta.env.VITE_ANN_TITLE;
const annContene = import.meta.env.VITE_ANN_CONTENT;
const annDuration = Number(import.meta.env.VITE_ANN_DURATION);

// 空格暂停与播放
const spacePlayOrPause = (e) => {
  if (e.code === "Space") {
    console.log(e.target.tagName);
    if (router.currentRoute.value.name == "video") return false;
    if (e.target.tagName === "BODY") {
      e.preventDefault();
      music.setPlayState(!music.getPlayState);
    } else {
      return false;
    }
  }
};

// 用户签到
const signIn = () => {
  // 获取当前日期
  const today = new Date().toLocaleDateString();
  // 从 localStorage 中获取上一次签到日期
  const lastSignInDate = localStorage.getItem("lastSignInDate");
  // 如果上一次签到日期不等于当前日期，说明今天还没有签到
  if (lastSignInDate !== today) {
    const signInPromises = [userDailySignin(0), userYunbeiSign()];
    Promise.all(signInPromises)
      .then((results) => {
        // 更新上一次签到日期为今天
        localStorage.setItem("lastSignInDate", today);
        console.log("签到成功！");
        console.log("userDailySignin:", results[0]);
        console.log("userYunbeiSign:", results[1]);
        $notification["success"]({
          content: "签到成功",
          meta: "每日签到及云贝签到成功",
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error("签到失败：", error);
        $message.error("每日签到失败");
      });
  } else {
    console.log("今天已经签到过了！");
  }
};
// 系统重置
const cleanAll = () => {
  $message ? $message.success("重置成功") : alert("重置成功");
  localStorage.clear();
  window.location.href = "/";
};

onMounted(() => {
  // 挂载至全局
  window.$mainContent = mainContent.value;
  window.$cleanAll = cleanAll;
  window.$signIn = signIn;

  // 公告
  if (annShow) {
    $notification["info"]({
      content: annTitle,
      meta: annContene,
      duration: annDuration,
    });
  }

  // 版权声明
  const logoText = "SPlayer";
  const copyrightNotice = `\n\n版本: ${packageJson.version}\n作者: ${packageJson.author}\n作者主页: ${packageJson.home}\nGitHub: ${packageJson.github}`;
  console.info(
    `%c${logoText} %c ${copyrightNotice}`,
    "color:#f55e55;font-size:26px;font-weight:bold;",
    "font-size:16px"
  );
  console.info(
    "若站点出现异常，可尝试在下方输入 %c$cleanAll()%c 然后按回车来重置",
    "background: #eaeffd;color:#f55e55;padding: 4px 6px;border-radius:8px;",
    "background:unset;color:unset;"
  );

  // 检查账号登录状态
  getLoginState()
    .then((res) => {
      if (res.data.profile && user.userLogin) {
        // 签到
        if (setting.autoSignIn) signIn();
        user.setUserData(res.data.profile);
        user.userLogin = true;
        user.setUserOtherData();
      } else {
        user.userLogOut();
        if (music.getPlayListMode === "cloud") {
          $message.info("登录已失效，请重新登录");
          music.setPlaylists([]);
        }
      }
    })
    .catch((err) => {
      $message.error("请求发生错误");
      console.error("请求发生错误" + err);
      router.push("/500");
      return false;
    });

  // 获取喜欢音乐列表
  music.setLikeList();

  // 键盘监听
  window.addEventListener("keydown", spacePlayOrPause);
});
</script>

<style lang="scss" scoped>
.n-layout-header {
  height: 60px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.n-layout-content {
  top: 60px;
  transition: all 0.3s;
  &.show {
    bottom: 70px;
  }
  :deep(.n-scrollbar-rail--vertical) {
    right: 0;
  }
  .main {
    max-width: 1400px;
    margin: 0 auto;
  }
}

// 路由跳转动画
.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
