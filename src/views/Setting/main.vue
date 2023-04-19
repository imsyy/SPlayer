<template>
  <div class="set-main">
    <n-card class="set-item">
      <div class="name">明暗模式</div>
      <n-select class="set" v-model:value="theme" :options="darkOptions" />
    </n-card>
    <n-card class="set-item">
      <div class="name">明暗模式跟随系统</div>
      <n-switch v-model:value="themeAuto" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        每日签到
        <span class="tip">是否自动进行每日签到</span>
      </div>
      <n-switch v-model:value="autoSignIn" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示轮播图</div>
      <n-switch v-model:value="bannerShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        列表点击方式
        <span class="tip">移动端该设置项无效，单击同时生效</span>
      </div>
      <n-select
        class="set"
        v-model:value="listClickMode"
        :options="listClickModeOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示搜索历史</div>
      <n-switch v-model:value="searchHistory" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示底栏歌词
        <span class="tip">是否在播放时显示歌词</span>
      </div>
      <n-switch v-model:value="bottomLyricShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌曲音质
        <span class="tip">无损音质及以上需要您为黑胶会员</span>
      </div>
      <n-select
        class="set"
        v-model:value="songLevel"
        :options="songLevelOptions"
      />
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore, userStore } from "@/store";

const setting = settingStore();
const user = userStore();
const {
  theme,
  themeAuto,
  listClickMode,
  bottomLyricShow,
  songLevel,
  bannerShow,
  autoSignIn,
  searchHistory,
} = storeToRefs(setting);

// 深浅模式
const darkOptions = [
  {
    label: "浅色模式",
    value: "light",
  },
  {
    label: "深色模式",
    value: "dark",
  },
];

// 列表模式
const listClickModeOptions = [
  {
    label: "双击播放",
    value: "dblclick",
  },
  {
    label: "单击播放",
    value: "click",
  },
];

// 歌曲音质
const songLevelOptions = [
  {
    label: "标准",
    value: "standard",
  },
  {
    label: "较高",
    value: "higher",
  },
  ,
  {
    label: "极高",
    value: "exhigh",
  },
  {
    label: "无损",
    value: "lossless",
    disabled: user.userData?.vipType ? false : true,
  },
  {
    label: "Hi-Res",
    value: "hires",
    disabled: user.userData?.vipType ? false : true,
  },
];
</script>
