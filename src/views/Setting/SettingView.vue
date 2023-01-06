<template>
  <div class="setting">
    <div class="title">全局设置</div>
    <n-h6 prefix="bar"> 基础设置 </n-h6>
    <n-card class="set-item">
      <div class="name">站点模式</div>
      <n-select class="set" v-model:value="theme" :options="darkOptions" />
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
    <n-h6 prefix="bar"> 歌词设置 </n-h6>
    <n-card class="set-item">
      <div class="name">显示歌词翻译</div>
      <n-switch v-model:value="showTransl" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">播放器样式</div>
      <n-select
        class="set"
        v-model:value="playerStyle"
        :options="playerStyleOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">默认歌词位置</div>
      <n-select
        class="set"
        v-model:value="lyricsPosition"
        :options="lyricsPositionOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示音乐频谱
        <span class="tip">实验性功能，可能会导致一些意想不到的后果</span>
      </div>
      <n-switch
        v-model:value="musicFrequency"
        :round="false"
        @click="changeMusicFrequency"
      />
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { settingStore } from "@/store/index";
const setting = settingStore();
const {
  theme,
  showTransl,
  lyricsPosition,
  playerStyle,
  musicFrequency,
  listClickMode,
} = storeToRefs(setting);

// 深浅模式
let darkOptions = [
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
let listClickModeOptions = [
  {
    label: "双击播放",
    value: "dblclick",
  },
  {
    label: "单击播放",
    value: "click",
  },
];

// 歌词位置
let lyricsPositionOptions = [
  {
    label: "居左",
    value: "left",
  },
  {
    label: "居中",
    value: "center",
  },
];

// 播放器样式
let playerStyleOptions = [
  {
    label: "封面模式",
    value: "cover",
  },
  {
    label: "唱片模式",
    value: "record",
  },
];

// 音乐频谱提醒
const changeMusicFrequency = () => {
  if (musicFrequency.value) {
    $dialog.warning({
      title: "实验性功能",
      content: "确认开启音乐频谱？将于刷新后生效",
      positiveText: "开启",
      negativeText: "取消",
      onPositiveClick: () => {
        musicFrequency.value = true;
        location.reload();
      },
      onNegativeClick: () => {
        musicFrequency.value = false;
      },
    });
  }
};
</script>

<style lang="scss" scoped>
.setting {
  padding: 0 10vw;
  max-width: 800px;
  @media (max-width: 768px) {
    padding: 0;
  }
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 40px;
    font-weight: bold;
  }
  .n-h {
    padding-left: 16px;
    font-size: 20px;
    margin-left: 4px;
  }
  .set-item {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 12px;
    :deep(.n-card__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      .name {
        font-size: 16px;
        display: flex;
        flex-direction: column;
        .tip {
          font-size: 12px;
          opacity: 0.8;
        }
      }
      .set {
        width: 200px;
      }
    }
  }
}
</style>