<template>
  <div class="playlist-page-manager">
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
          :value="settingStore.playlistPageElements[item.key]"
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

type PlaylistPageElementKey = keyof SettingState["playlistPageElements"];
type Item = { label: string; key: PlaylistPageElementKey };

const items: Item[] = [
  { label: "显示标签", key: "tags" },
  { label: "显示创建者/艺术家", key: "creator" },
  { label: "显示创建/更新时间", key: "time" },
  { label: "显示描述", key: "description" },
];

const updateSetting = (key: PlaylistPageElementKey, val: boolean) => {
  settingStore.playlistPageElements[key] = val;
};
</script>

<style scoped lang="scss">
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
