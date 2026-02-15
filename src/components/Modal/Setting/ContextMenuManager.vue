<template>
  <div class="context-menu-manager">
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
          :value="settingStore.contextMenuOptions[item.key]"
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

type ContextMenuOptionKey = keyof SettingState["contextMenuOptions"];
type Item = { label: string; key: ContextMenuOptionKey };

const items: Item[] = [
  { label: "播放", key: "play" },
  { label: "下一首播放", key: "playNext" },
  { label: "添加到歌单", key: "addToPlaylist" },
  { label: "查看 MV", key: "mv" },
  { label: "不感兴趣", key: "dislike" },
  { label: "更多操作", key: "more" },
  { label: "导入云盘", key: "cloudImport" },
  { label: "从歌单删除", key: "deleteFromPlaylist" },
  { label: "从云盘删除", key: "deleteFromCloud" },
  { label: "从本地删除", key: "deleteFromLocal" },
  { label: "打开文件夹", key: "openFolder" },
  { label: "云盘歌曲纠正", key: "cloudMatch" },
  { label: "歌曲百科", key: "wiki" },
  { label: "搜索", key: "search" },
  { label: "下载", key: "download" },
  { label: "复制歌曲名称", key: "copyName" },
  { label: "音乐标签编辑", key: "musicTagEditor" },
];

const updateSetting = (key: ContextMenuOptionKey, val: boolean) => {
  settingStore.contextMenuOptions[key] = val;
};
</script>

<style scoped lang="scss">
.context-menu-manager {
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
