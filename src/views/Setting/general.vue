<!-- 设置 - 常规 -->
<template>
  <div class="set-type">
    <n-h3 prefix="bar"> 常规 </n-h3>
    <n-card class="set-item">
      <div class="name">明暗模式</div>
      <n-select
        v-model:value="themeType"
        :options="[
          {
            label: '浅色模式',
            value: 'light',
          },
          {
            label: '深色模式',
            value: 'dark',
          },
        ]"
        class="set"
        @update:value="themeAuto = false"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">明暗模式是否跟随系统</div>
      <n-switch
        v-model:value="themeAuto"
        :round="false"
        @update:value="
          (val) => {
            if (val) themeType = osThemeRef;
          }
        "
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        开启侧边栏
        <n-text class="tip">将导航栏放于侧边显示，可展开或收起</n-text>
      </div>
      <n-switch v-model:value="showSider" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        侧边栏展示封面
        <n-text class="tip">侧边栏歌单是否展示歌单封面</n-text>
      </div>
      <n-switch v-model:value="siderShowCover" :disabled="!showSider" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">显示搜索历史</div>
      <n-switch v-model:value="showSearchHistory" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        自动签到
        <n-text class="tip">在每日首次开启软件时自动签到</n-text>
      </div>
      <n-switch v-model:value="autoSignIn" :round="false" />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          全局动态取色
          <n-tag :bordered="false" round size="small" type="warning">
            开发中
            <template #icon>
              <n-icon>
                <SvgIcon icon="code" />
              </n-icon>
            </template>
          </n-tag>
        </div>
        <n-text class="tip">主题色是否跟随封面，目前感觉不好看</n-text>
      </div>
      <n-switch
        v-model:value="themeAutoCover"
        :round="false"
        :disabled="Object.keys(coverTheme)?.length === 0"
        @update:value="themeAutoCoverChange"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        <div class="dev">
          全局动态取色类别
          <n-tag :bordered="false" round size="small" type="warning">
            开发中
            <template #icon>
              <n-icon>
                <SvgIcon icon="code" />
              </n-icon>
            </template>
          </n-tag>
        </div>
        <n-text class="tip">将在下一首播放或刷新时生效，不建议更改</n-text>
      </div>
      <n-select
        v-model:value="themeAutoCoverType"
        :disabled="!themeAutoCover"
        :options="[
          {
            label: '中性',
            value: 'neutral',
          },
          {
            label: '中性变体',
            value: 'neutralVariant',
          },
          {
            label: '主要',
            value: 'primary',
          },
          {
            label: '次要',
            value: 'secondary',
          },
          {
            label: '次次要',
            value: 'tertiary',
          },
        ]"
        class="set"
      />
    </n-card>
    <n-card class="set-item">
      <div class="name">
        隐藏 VIP 歌曲标签
        <n-text class="tip">是否在歌曲列表中隐藏 VIP 歌曲标签</n-text>
      </div>
      <n-switch v-model:value="hiddenVipTags" :round="false" />
    </n-card>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useOsTheme } from "naive-ui";
import { siteSettings, siteStatus } from "@/stores";

const status = siteStatus();
const settings = siteSettings();
const { coverTheme } = storeToRefs(status);
const {
  themeType,
  themeTypeName,
  themeAuto,
  themeAutoCover,
  themeAutoCoverType,
  showSider,
  showSearchHistory,
  autoSignIn,
  siderShowCover,
  hiddenVipTags,
} = storeToRefs(settings);

// 基础数据
const osThemeRef = useOsTheme();

// 封面自动跟随变化
const themeAutoCoverChange = (val) => {
  if ($changeThemeColor !== "undefined" && Object.keys(coverTheme.value)?.length) {
    $changeThemeColor(val ? coverTheme.value : themeTypeName.value, val);
  }
};
</script>
