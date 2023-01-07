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
          <div class="copyright" v-if="false">
            <n-text class="power">
              SPlayer ·
              <a :href="packageJson.github" target="_blank">
                Made By {{ packageJson.author }}
              </a>
            </n-text>
            <n-text class="version" :depth="3">
              v&nbsp;{{ packageJson.version }}
            </n-text>
          </div>
        </main>
      </n-layout-content>
    </n-layout>
  </Provider>
</template>

<script setup>
import Provider from "@/components/Provider/index.vue";
import Nav from "@/components/Nav/index.vue";
import Player from "@/components/Player/index.vue";
import packageJson from "@/../package.json";
import { musicStore, userStore } from "@/store/index";
import { useRouter } from "vue-router";
import { getLoginState } from "@/api";

const music = musicStore();
const user = userStore();
const router = useRouter();
const mainContent = ref(null);

// 空格暂停与播放
const spacePlayOrPause = (e) => {
  if (e.code === "Space") {
    if (e.target.tagName === "INPUT") return false;
    if (router.currentRoute.value.name == "video") return false;
    e.preventDefault();
    music.setPlayState(!music.getPlayState);
  }
};

onMounted(() => {
  // 挂载主窗口至全局
  window.$mainContent = mainContent.value;

  // 初始化
  console.log("初始化完成");
  $notification["info"]({
    content: "项目未完成",
    meta: "最近更新：新增移动端歌曲列表抽屉",
    duration: 8000,
  });

  // 检查账号登录状态
  getLoginState()
    .then((res) => {
      if (res.data.profile && user.userLogin) {
        user.userLogin = true;
        user.setUserLevel();
      } else {
        user.userLogOut();
      }
    })
    .catch((err) => {
      $message.error("遇到错误" + err);
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
  .copyright {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 30px;
    margin-bottom: -20px;
    .power {
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        color: $mainColor;
      }
    }
    .version {
      font-size: 12px;
    }
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