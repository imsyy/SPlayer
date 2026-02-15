<template>
  <div class="cover-manager">
    <n-scrollbar style="max-height: 400px">
      <div class="list">
        <n-card
          v-for="item in coverItems"
          :key="item.key"
          :content-style="{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
          }"
          class="item"
        >
          <n-text class="name">{{ item.name }}</n-text>
          <n-switch v-model:value="settingStore.hiddenCovers[item.key]" :round="false" />
        </n-card>
      </div>
    </n-scrollbar>
    <div class="footer">
      <n-button @click="toggleAll">
        {{ isAllHidden ? "显示全部" : "隐藏全部" }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingStore } from "@/stores";
import type { SettingState } from "@/stores/setting";
import { NScrollbar, NButton } from "naive-ui";

const settingStore = useSettingStore();

type CoverItem = {
  key: keyof SettingState["hiddenCovers"];
  name: string;
};

const coverItems: CoverItem[] = [
  { key: "home", name: "为我推荐" },
  { key: "playlist", name: "歌单广场" },
  { key: "toplist", name: "排行榜" },
  { key: "artist", name: "歌手" },
  { key: "new", name: "最新音乐" },
  { key: "personalFM", name: "私人FM" },
  { key: "player", name: "播放器" },
  { key: "list", name: "歌单详情/歌曲列表" },
  { key: "artistDetail", name: "歌手详情" },
  { key: "radio", name: "播客电台" },
  { key: "album", name: "专辑" },
  { key: "like", name: "我的收藏" },
  { key: "video", name: "视频" },
  { key: "videoDetail", name: "视频详情页" },
];

const isAllHidden = computed(() => {
  return coverItems.every((item) => settingStore.hiddenCovers[item.key]);
});

const toggleAll = () => {
  const target = !isAllHidden.value;
  coverItems.forEach((item) => {
    settingStore.hiddenCovers[item.key] = target;
  });
};
</script>

<style scoped lang="scss">
.cover-manager {
  display: flex;
  flex-direction: column;
  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 12px;
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
  .footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
