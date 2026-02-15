<template>
  <div class="sidebar-hide-manager">
    <n-scrollbar style="max-height: 400px" trigger="none">
      <div class="list">
        <n-card
          v-for="item in sidebarItems"
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
            :value="settingStore.sidebarHide[item.key]"
            :round="false"
            @update:value="(val) => updateSetting(item.key, val)"
          />
        </n-card>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";

const settingStore = useSettingStore();
const statusStore = useStatusStore();

type SidebarHideKey = keyof typeof settingStore.sidebarHide;
type SidebarHideItem = { label: string; key: SidebarHideKey };

const when = (condition: boolean, ...item: SidebarHideItem[]): SidebarHideItem[] => {
  return condition ? item : [];
};

const sidebarItems: SidebarHideItem[] = [
  { label: "发现音乐", key: "hideDiscover" },
  { label: "私人漫游", key: "hidePersonalFM" },
  { label: "播客电台", key: "hideRadioHot" },
  { label: "我的收藏", key: "hideLike" },
  { label: "我的云盘", key: "hideCloud" },
  ...when(isElectron && statusStore.isDeveloperMode, { label: "下载管理", key: "hideDownload" }),
  ...when(isElectron, { label: "本地歌曲", key: "hideLocal" }),
  { label: "最近播放", key: "hideHistory" },
  { label: "创建的歌单", key: "hideUserPlaylists" },
  { label: "收藏的歌单", key: "hideLikedPlaylists" },
  { label: "心动模式", key: "hideHeartbeatMode" },
];

const updateSetting = (key: SidebarHideKey, val: boolean) => {
  settingStore.sidebarHide[key] = val;
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
