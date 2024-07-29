<!-- 全局设置 -->
<template>
  <div :class="{ setting: true, 'use-cover': themeAutoCover }">
    <n-h1 class="title">
      <n-text>全局设置</n-text>
      <div class="copyright" @click="jump">
        <div class="author">
          <n-icon depth="3" size="18">
            <SvgIcon icon="github" />
          </n-icon>
          <n-text class="author-text" depth="3">{{ packageJson.author }}</n-text>
        </div>
        <n-text class="version" depth="3">{{ packageJson.version }}</n-text>
      </div>
    </n-h1>
    <!-- 导航栏 -->
    <n-tabs
      ref="setTabsRef"
      v-model:value="setTabsValue"
      type="segment"
      @update:value="settingTabChange"
    >
      <n-tab name="setTab1"> 常规 </n-tab>
      <n-tab name="setTab2"> 系统 </n-tab>
      <n-tab name="setTab3"> 播放 </n-tab>
      <n-tab name="setTab4"> 歌词 </n-tab>
      <n-tab name="setTab5"> 下载 </n-tab>
      <n-tab name="setTab6"> 其他 </n-tab>
    </n-tabs>
    <!-- 设置项 -->
    <n-scrollbar
      ref="setScrollRef"
      :style="{
        height: `calc(100vh - ${music.getPlaySongData?.id && showPlayBar ? 328 : 248}px)`,
      }"
      class="all-set"
      @scroll="allSetScroll"
    >
      <!-- 常规 -->
      <General />
      <!-- 系统 -->
      <System />
      <!-- 播放 -->
      <Player />
      <!-- 歌词 -->
      <Lyrics />
      <!-- 下载 -->
      <Download />
      <!-- 其他 -->
      <Other />
    </n-scrollbar>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings, siteStatus, musicData } from "@/stores";
import debounce from "@/utils/debounce";
import packageJson from "@/../package.json";
// 设置子项
import General from "@/views/Setting/general.vue";
import System from "@/views/Setting/system.vue";
import Player from "@/views/Setting/player.vue";
import Lyrics from "@/views/Setting/lyrics.vue";
import Download from "@/views/Setting/download.vue";
import Other from "@/views/Setting/other.vue";

const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { showPlayBar } = storeToRefs(status);
const { themeAutoCover } = storeToRefs(settings);

// 标签页数据
const setTabsRef = ref(null);
const setScrollRef = ref(null);
const setTabsValue = ref("setTab1");

// 标签页切换
const settingTabChange = (name) => {
  const index = Number(name.replace("setTab", ""));
  const setDom = document.querySelectorAll(".set-type")?.[index - 1];
  if (!setDom) return false;
  // 滚动至设置分类
  setDom.scrollIntoView({ behavior: "smooth" });
};

// 设置列表滚动
const allSetScroll = debounce((e) => {
  const distance = e.target.scrollTop + 30;
  const allSetDom = document.querySelectorAll(".set-type");
  allSetDom.forEach((v, i) => {
    if (distance >= v.offsetTop) setTabsValue.value = `setTab${i + 1}`;
  });
}, 100);

// 跳转
const jump = () => {
  window.open(packageJson.github);
};
</script>

<style lang="scss" scoped>
.setting {
  max-width: 1200px;
  margin: 0 auto;
  .title {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    height: 58px;
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
    .copyright {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-left: 12px;
      margin-bottom: 6px;
      font-size: 16px;
      font-weight: normal;
      cursor: pointer;
      .author {
        display: flex;
        align-items: center;
        &::after {
          content: "/";
          transform: translateY(2px);
          font-size: 14px;
          margin: 0 6px;
          opacity: 0.6;
        }
        .author-text {
          margin-left: 6px;
        }
      }
      .version {
        &::before {
          content: "v";
          margin-right: 2px;
        }
      }
    }
  }
  .n-tabs {
    height: 42px;
  }
  :deep(.set-type) {
    padding-top: 30px;
    .set-item {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 12px;
      &:last-child {
        margin-bottom: 0;
      }
      .n-card__content {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .name {
        font-size: 16px;
        display: flex;
        flex-direction: column;
        padding-right: 20px;
        .dev {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-tag {
            margin-left: 6px;
          }
        }
        .tip {
          font-size: 12px;
          opacity: 0.8;
        }
      }
      .set {
        width: 200px;
        @media (max-width: 768px) {
          width: 140px;
          min-width: 140px;
        }
      }
    }
  }
  &.use-cover {
    .n-switch {
      &.n-switch--active {
        :deep(.n-switch__rail) {
          background-color: var(--main-second-color);
        }
      }
    }
  }
}
</style>
