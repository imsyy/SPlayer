<template>
  <div class="set-player">
    <n-card class="set-item">
      <div class="name">
        播放器样式
        <span class="tip">播放器左侧功能区样式</span>
      </div>
      <n-select
        class="set"
        v-model:value="playerStyle"
        :options="playerStyleOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        播放背景样式
        <span class="tip">{{
          backgroundImageShow === "blur"
            ? "将专辑封面模糊显示"
            : "提取专辑主色作为背景颜色"
        }}</span>
      </div>
      <n-select
        class="set"
        v-model:value="backgroundImageShow"
        :options="backgroundImageShowOptions"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        替换无法播放的歌曲链接
        <span class="tip">
          {{
            useUnmServerShow
              ? "是否使用 UNM 替换无法播放的歌曲链接"
              : "请配置 UNM-Server 后使用解灰功能"
          }}
        </span>
      </div>
      <n-switch
        v-model:value="useUnmServer"
        :round="false"
        :disabled="!useUnmServerShow"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示歌词翻译
        <span class="tip">是否在具有翻译歌词时显示</span>
      </div>
      <n-switch v-model:value="showTransl" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示歌词音译
        <span class="tip">是否在具有音译歌词时显示</span>
      </div>
      <n-switch v-model:value="showRoma" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示前奏等待
        <span class="tip">部分歌曲前奏可能存在显示错误</span>
      </div>
      <n-switch v-model:value="countDownShow" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示逐字歌词
        <span class="tip">是否在歌曲具有逐字歌词时显示，实验性功能</span>
      </div>
      <n-switch v-model:value="showYrc" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        智能暂停滚动
        <span class="tip">鼠标移入歌词区域是否暂停滚动</span>
      </div>
      <n-switch v-model:value="lrcMousePause" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        歌词滚动位置
        <span class="tip">歌词高亮时所处的位置</span>
      </div>
      <n-select
        class="set"
        v-model:value="lyricsBlock"
        :options="lyricsBlockOptions"
      />
    </n-card>
    <n-card
      class="set-item"
      :content-style="{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }"
    >
      <div class="name">歌词文本大小</div>
      <n-slider
        v-model:value="lyricsFontSize"
        :tooltip="false"
        :max="4"
        :min="3"
        :step="0.01"
        :marks="{
          3: '最小',
          3.6: '默认',
          4: '最大',
        }"
      />
      <div :class="lyricsBlur ? 'more blur' : 'more'">
        <div
          v-for="n in 3"
          :key="n"
          :class="n === 2 ? 'lrc on' : 'lrc'"
          :style="{
            margin: n === 2 ? '12px 0' : null,
            alignItems: lyricsPosition == 'center' ? 'center' : null,
            transformOrigin:
              lyricsPosition == 'center' ? 'center' : 'center left',
          }"
        >
          <span :style="{ fontSize: lyricsFontSize + 'vh' }"
            >这是一句歌词
          </span>
          <span :style="{ fontSize: lyricsFontSize - 0.4 + 'vh' }"
            >This is a lyric
          </span>
        </div>
      </div>
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
        歌词模糊
        <span class="tip">未播放或已播放歌词模糊显示，实验性功能</span>
      </div>
      <n-switch v-model:value="lyricsBlur" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        显示音乐频谱
        <span class="tip">可能会导致一些意想不到的后果，实验性功能</span>
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
import { settingStore } from "@/store";

const setting = settingStore();
const {
  showTransl,
  lyricsPosition,
  playerStyle,
  musicFrequency,
  lyricsFontSize,
  lyricsBlock,
  lyricsBlur,
  lrcMousePause,
  showYrc,
  showRoma,
  useUnmServer,
  backgroundImageShow,
  countDownShow,
} = storeToRefs(setting);

// UNM 开关显示
const useUnmServerShow = import.meta.env.VITE_UNM_API ? true : false;

// 歌词位置
const lyricsPositionOptions = [
  {
    label: "居左",
    value: "left",
  },
  {
    label: "居中",
    value: "center",
  },
];

// 歌词滚动位置
const lyricsBlockOptions = [
  {
    label: "靠近顶部",
    value: "start",
  },
  {
    label: "水平居中",
    value: "center",
  },
];

// 播放器样式
const playerStyleOptions = [
  {
    label: "封面模式",
    value: "cover",
  },
  {
    label: "唱片模式",
    value: "record",
  },
];

// 播放背景类型
const backgroundImageShowOptions = [
  {
    label: "封面主色",
    value: "solid",
  },
  {
    label: "封面模糊",
    value: "blur",
  },
];

// 音乐频谱提醒
const changeMusicFrequency = () => {
  if (musicFrequency.value) {
    $dialog.warning({
      class: "s-dialog",
      title: "实验性功能",
      content: "确认开启音乐频谱？将在重启应用后生效",
      positiveText: "开启",
      negativeText: "取消",
      onMaskClick: () => {
        musicFrequency.value = false;
      },
      onPositiveClick: () => {
        musicFrequency.value = true;
      },
      onNegativeClick: () => {
        musicFrequency.value = false;
      },
    });
  }
};
</script>
