<template>
  <div class="set-type">
    <n-h3 prefix="bar"> 播放 </n-h3>
    <n-card class="set-item">
      <div class="name">
        启动时自动播放
        <n-text class="tip">
          {{ checkPlatform.electron() ? "程序启动时自动播放上次歌曲" : "客户端独占功能" }}
        </n-text>
      </div>
      <n-switch v-model:value="autoPlay" :disabled="!checkPlatform.electron()" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        记忆上次播放位置
        <n-text v-if="autoPlay" class="tip"> 与自动播放相冲突，已禁用 </n-text>
      </div>
      <n-switch v-model:value="memorySeek" :disabled="autoPlay" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        音乐资源自动缓存
        <n-text class="tip"> 可能会造成加载缓慢，将在下一首播放或刷新时生效 </n-text>
      </div>
      <n-switch v-model:value="useMusicCache" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">音乐渐入渐出</div>
      <n-switch v-model:value="songVolumeFade" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        播放全部搜索歌曲
        <n-text class="tip"> 在播放搜索页面上的歌曲时，是否同时播放所有搜索结果中的歌曲 </n-text>
      </div>
      <n-switch v-model:value="playSearch" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        在线播放音质
        <n-text class="tip">
          {{ songLevelData[songLevel].tip }}
        </n-text>
      </div>
      <n-select v-model:value="songLevel" :options="Object.values(songLevelData)" class="set" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        底栏歌词显示
        <n-text class="tip">是否在播放时将歌手信息更改为歌词</n-text>
      </div>
      <n-switch v-model:value="bottomLyricShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示播放列表歌曲数量</div>
      <n-switch v-model:value="showPlaylistCount" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        播放器样式
        <n-text class="tip"> 播放器左侧区域样式 </n-text>
      </div>
      <n-select
        v-model:value="playCoverType"
        :options="[
          {
            label: '封面模式',
            value: 'cover',
          },
          {
            label: '唱片模式',
            value: 'record',
          },
        ]"
        class="set"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        播放背景样式
        <n-text class="tip">
          {{
            playerBackgroundType === "animation"
              ? "流体效果，较消耗性能，请谨慎开启"
              : playerBackgroundType === "blur"
                ? "将封面模糊处理为背景"
                : "提取封面主色为渐变色"
          }}
        </n-text>
      </div>
      <n-select
        v-model:value="playerBackgroundType"
        :options="[
          {
            label: '流体效果',
            value: 'animation',
          },
          {
            label: '封面模糊',
            value: 'blur',
          },
          {
            label: '主色渐变',
            value: 'gradient',
          },
          {
            label: '无背景',
            value: 'none',
          },
        ]"
        class="set"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示前奏倒计时
        <n-text class="tip">部分歌曲前奏可能存在显示错误</n-text>
      </div>
      <n-switch v-model:value="countDownShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        尝试替换无法播放的歌曲
        <n-text class="tip">
          {{ checkPlatform.electron() ? "可能会造成音乐与原曲不符" : "客户端独占功能" }}
        </n-text>
      </div>
      <n-switch v-model:value="useUnmServer" :disabled="!checkPlatform.electron()" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          显示音乐频谱
          <n-tag :bordered="false" round size="small" type="warning">
            开发中
            <template #icon>
              <n-icon>
                <SvgIcon icon="code" />
              </n-icon>
            </template>
          </n-tag>
        </div>
        <n-text class="tip">
          {{
            showSpectrums
              ? "开启音乐频谱会极大影响性能，如遇问题请关闭"
              : "是否在播放器底部显示音乐频谱"
          }}
        </n-text>
      </div>
      <n-switch v-model:value="showSpectrums" :round="false" />
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteSettings } from "@/stores";
import { checkPlatform } from "@/utils/helper";

const settings = siteSettings();
const {
  songVolumeFade,
  autoPlay,
  countDownShow,
  playerBackgroundType,
  useUnmServer,
  songLevel,
  bottomLyricShow,
  memorySeek,
  playCoverType,
  playSearch,
  showPlaylistCount,
  showSpectrums,
  useMusicCache,
} = storeToRefs(settings);

// 音质数据
const songLevelData = {
  standard: {
    label: "标准音质",
    tip: "标准音质 128kbps",
    value: "standard",
  },
  higher: {
    label: "较高音质",
    tip: "较高音质 328kbps",
    value: "higher",
  },
  exhigh: {
    label: "极高 HQ",
    tip: "近 CD 品质的细节体验，最高 320kbps",
    value: "exhigh",
  },
  lossless: {
    label: "无损 SQ",
    tip: "高保真无损音质，最高 48kHz/16bit",
    value: "lossless",
  },
  hires: {
    label: "高清臻音 Spatial Audio",
    tip: "环绕声体验，声音听感增强，96kHz/24bit",
    value: "hires",
  },
  jymaster: {
    label: "超清母带 Master",
    tip: "还原音频细节，192kHz/24bit",
    value: "jymaster",
  },
  sky: {
    label: "沉浸环绕声 Surround Audio",
    tip: "沉浸式体验，最高 5.1 声道",
    value: "sky",
  },
};
</script>
