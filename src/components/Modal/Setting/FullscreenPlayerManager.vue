<template>
  <div class="fullscreen-player-manager">
    <div class="list">
      <n-card
        v-for="item in items"
        :key="item.key"
        :content-style="{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }"
        class="item"
      >
        <n-text class="name">{{ item.label }}</n-text>
        <n-switch
          :value="settingStore.fullscreenPlayerElements[item.key]"
          :round="false"
          @update:value="(val) => updateSetting(item.key, val)"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import type { SettingState } from "@/stores/setting";

const settingStore = useSettingStore();

type FullscreenPlayerElementKey = keyof SettingState["fullscreenPlayerElements"];
type Item = { label: string; key: FullscreenPlayerElementKey };

const items: Item[] = [
  { label: "显示喜欢按钮", key: "like" },
  { label: "显示添加到歌单", key: "addToPlaylist" },
  { label: "显示下载按钮", key: "download" },
  { label: "显示评论按钮", key: "comments" },
  { label: "显示桌面歌词", key: "desktopLyric" },
  { label: "显示更多设置", key: "moreSettings" },
  { label: "显示复制歌词", key: "copyLyric" },
  { label: "显示歌词调整", key: "lyricOffset" },
  { label: "显示歌词设置", key: "lyricSettings" },
];

const updateSetting = (key: FullscreenPlayerElementKey, val: boolean) => {
  settingStore.fullscreenPlayerElements[key] = val;
};
</script>

<style scoped lang="scss">
.fullscreen-player-manager {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.3);
    border-radius: 3px;
    &:hover {
      background-color: rgba(128, 128, 128, 0.5);
    }
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .item {
    border-radius: 8px;
    .name {
      font-size: 16px;
      line-height: normal;
    }
    .n-switch {
      margin-left: auto;
    }
  }
}
</style>
