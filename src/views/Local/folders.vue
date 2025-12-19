<template>
  <div class="local-folders">
    <!-- 左侧文件夹列表 -->
    <n-scrollbar class="folder-list">
      <n-card
        v-for="(songs, folderPath, index) in folderData"
        :key="index"
        :id="folderPath"
        :class="['folder-item', { choose: chooseFolder === folderPath }]"
        @click="chooseFolder = folderPath"
      >
        <n-text class="name">
          <SvgIcon name="Folder" :depth="2" />
          {{ getFolderName(folderPath) || "未知文件夹" }}
        </n-text>
        <n-text class="path" depth="3">
          {{ folderPath }}
        </n-text>
        <n-text class="num" depth="3">
          <SvgIcon name="Music" :depth="3" />
          {{ songs.length }} 首
        </n-text>
      </n-card>
    </n-scrollbar>

    <!-- 右侧歌曲列表 -->
    <Transition name="fade" mode="out-in">
      <SongList
        :key="chooseFolder"
        :data="folderSongs"
        :loading="folderSongs?.length ? false : true"
        :hidden-cover="!settingStore.showLocalCover"
        class="song-list"
        @removeSong="handleRemoveSong"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useLocalStore, useSettingStore } from "@/stores";
import SongList from "@/components/List/SongList.vue";
import { some } from "lodash-es";

const props = defineProps<{
  data: SongType[];
  loading: boolean;
}>();

const localStore = useLocalStore();
const settingStore = useSettingStore();

// 选中的文件夹
const chooseFolder = ref<string>("");

// 按文件夹分组后的数据：{ 文件夹路径: SongType[] }
const folderData = computed<Record<string, SongType[]>>(() => {
  const map: Record<string, SongType[]> = {};

  props.data.forEach((song) => {
    const fullPath = (song as any).path as string | undefined;
    if (!fullPath) return;

    // 去掉文件名，提取目录路径
    const folderPath = fullPath.replace(/[/\\][^/\\]*$/, "") || "未知文件夹";

    if (!map[folderPath]) map[folderPath] = [];
    // 去重
    if (!some(map[folderPath], { id: song.id })) {
      map[folderPath].push(song);
    }
  });

  const sortedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const sortedMap: Record<string, SongType[]> = {};
  sortedKeys.forEach((key) => {
    sortedMap[key] = map[key];
  });

  // 默认选中第一个文件夹
  if (!chooseFolder.value && sortedKeys.length > 0) {
    chooseFolder.value = sortedKeys[0];
  }

  return sortedMap;
});

// 当前选中文件夹的歌曲
const folderSongs = computed<SongType[]>(() => folderData.value?.[chooseFolder.value] || []);

// 从完整路径中提取最后一级目录作为显示名
const getFolderName = (folderPath: string): string => {
  if (!folderPath) return "";
  const parts = folderPath.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || folderPath;
};

// 删除歌曲时，同步更新本地歌曲列表
const handleRemoveSong = (ids: number[]) => {
  const updatedSongs = localStore.localSongs.filter((song) => !ids.includes(song.id));
  localStore.updateLocalSong(updatedSongs);
};

// 切换选中文件夹时，让左侧列表自动滚动居中
watch(
  () => chooseFolder.value,
  (val) => {
    if (!val) return;
    const folderDom = document.getElementById(val);
    if (folderDom) folderDom.scrollIntoView({ behavior: "smooth", block: "center" });
  },
);
</script>

<style lang="scss" scoped>
.local-folders {
  display: flex;
  height: calc((var(--layout-height) - 80) * 1px);

  :deep(.folder-list) {
    width: 260px;
    .n-scrollbar-content {
      padding: 0 5px 0 0 !important;
    }
  }

  .folder-item {
    margin-bottom: 8px;
    border-radius: 8px;
    border: 2px solid rgba(var(--primary), 0.12);
    cursor: pointer;

    :deep(.n-card__content) {
      display: flex;
      flex-direction: column;
      padding: 10px 14px;
    }

    &:last-child {
      margin-bottom: 24px;
    }

    .name {
      display: flex;
      align-items: center;
      font-weight: bold;
      font-size: 15px;

      .n-icon {
        margin-right: 6px;
      }
    }

    .path {
      font-size: 12px;
      margin-top: 2px;
      word-break: break-all;
    }

    .num {
      margin-top: 4px;
      display: flex;
      align-items: center;

      .n-icon {
        margin-right: 2px;
        margin-top: -2px;
      }
    }

    &:hover {
      border-color: rgba(var(--primary), 0.58);
    }

    &.choose {
      border-color: rgba(var(--primary), 0.58);
      background-color: rgba(var(--primary), 0.28);
    }
  }

  .song-list {
    width: 100%;
    flex: 1;
    margin-left: 15px;
  }
}
</style>
