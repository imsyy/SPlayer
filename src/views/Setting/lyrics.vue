<template>
  <div class="set-type">
    <n-h3 prefix="bar"> 歌词 </n-h3>
    <n-card
      class="set-item"
      :content-style="{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }"
    >
      <div class="name">
        歌词文本大小
        <n-text :style="{ fontSize: lyricsFontSize + 'px', fontWeight: 'bold' }" class="tip">
          我是一句歌词
        </n-text>
      </div>
      <n-slider
        v-model:value="lyricsFontSize"
        :tooltip="false"
        :max="56"
        :min="36"
        :step="1"
        :marks="{
          36: '最小',
          46: '默认',
          56: '最大',
        }"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        智能暂停滚动
        <n-text class="tip">鼠标移入歌词区域是否暂停滚动</n-text>
      </div>
      <n-switch v-model:value="lrcMousePause" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词位置
        <n-text class="tip">歌词的默认垂直位置</n-text>
      </div>
      <n-select
        v-model:value="lyricsPosition"
        :options="[
          {
            label: '居左',
            value: 'left',
          },
          {
            label: '居中',
            value: 'center',
          },
          {
            label: '居右',
            value: 'right',
          },
        ]"
        class="set"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词滚动位置
        <n-text class="tip">歌词高亮时所处的位置</n-text>
      </div>
      <n-select
        v-model:value="lyricsBlock"
        :options="[
          {
            label: '靠近顶部',
            value: 'start',
          },
          {
            label: '水平居中',
            value: 'center',
          },
        ]"
        class="set"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词字体加粗
        <n-text class="tip">是否将歌词字体加粗显示，部分字体可能显示异常</n-text>
      </div>
      <n-switch v-model:value="lyricsBold" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          显示逐字歌词
          <n-tag :bordered="false" round size="small" type="warning">
            开发中
            <template #icon>
              <n-icon>
                <SvgIcon icon="code" />
              </n-icon>
            </template>
          </n-tag>
        </div>
        <n-text class="tip">是否在具有逐字歌词时显示</n-text>
      </div>
      <n-switch v-model:value="showYrc" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          显示逐字歌词动画
          <n-tag :bordered="false" round size="small" type="warning">
            开发中
            <template #icon>
              <n-icon>
                <SvgIcon icon="code" />
              </n-icon>
            </template>
          </n-tag>
        </div>
        <n-text class="tip">可能会造成卡顿等性能问题，请确保您的设备具有独立显卡</n-text>
      </div>
      <n-switch v-model:value="showYrcAnimation" :disabled="!showYrc" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示歌词翻译
        <n-text class="tip">是否在具有翻译歌词时显示</n-text>
      </div>
      <n-switch v-model:value="showTransl" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示歌词音译
        <n-text class="tip">是否在具有音译歌词时显示</n-text>
      </div>
      <n-switch v-model:value="showRoma" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词自动聚焦
        <n-text class="tip">是否聚焦显示当前播放行，其他行将模糊显示</n-text>
      </div>
      <n-switch v-model:value="lyricsBlur" :round="false" />
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings } from "@/stores";

const settings = siteSettings();
const {
  showYrc,
  showYrcAnimation,
  showTransl,
  showRoma,
  lyricsPosition,
  lyricsBlock,
  lrcMousePause,
  lyricsFontSize,
  lyricsBlur,
  lyricsBold,
} = storeToRefs(settings);
</script>
