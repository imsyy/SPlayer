<template>
  <div class="local-albums">
    <n-scrollbar class="album-list">
      <n-card
        v-for="(item, key, index) in albumData"
        :key="index"
        :id="key"
        :class="['album-item', { choose: chooseAlbum === key }]"
        @click="chooseAlbum = key"
      >
        <Transition name="fade" mode="out-in">
          <n-image
            :key="item?.[0]?.cover"
            :src="item?.[0]?.cover || '/images/album.jpg?assest'"
            preview-disabled
            class="cover"
            v-visible.once="(show: boolean) => loadAlbumCover(show, key)"
          />
        </Transition>
        <div class="data">
          <n-text class="name">{{ key }}</n-text>
          <n-text class="num" depth="3">
            <SvgIcon name="Music" :depth="3" />
            {{ item.length }} 首
          </n-text>
        </div>
      </n-card>
    </n-scrollbar>
    <Transition name="fade" mode="out-in">
      <SongList
        :key="chooseAlbum"
        :data="chooseAlbum ? albumData[chooseAlbum] : []"
        :loading="true"
        hidden-cover
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { some } from "lodash-es";
import blob from "@/utils/blob";

const props = defineProps<{ data: SongType[] }>();

// 专辑数据
const chooseAlbum = ref<string>("");
const albumData = computed<Record<string, SongType[]>>(() => formatArtistsList(props.data));

// 区分专辑数据
const formatArtistsList = (data: SongType[]): Record<string, SongType[]> => {
  const allAlbums = data.reduce(
    (acc, song) => {
      // 专辑信息
      const albumName = typeof song.album === "string" ? song.album.trim() : song.album.name;
      // 若还无专辑分类，初始化为空数组
      if (!acc[albumName]) acc[albumName] = [];
      // 去重
      if (!some(acc[albumName], { id: song.id })) acc[albumName].push(song);
      return acc;
    },
    {} as Record<string, SongType[]>,
  );
  // 按字母顺序排序
  const sortedAlbums = Object.keys(allAlbums).sort((a, b) => a.localeCompare(b));
  // 创建排序后的专辑对象
  const sortedAllAlbums: Record<string, SongType[]> = {};
  sortedAlbums.forEach((album) => {
    sortedAllAlbums[album] = allAlbums[album];
  });
  // 默认选中
  chooseAlbum.value = sortedAlbums[0];
  return sortedAllAlbums;
};

// 加载专辑封面
const loadAlbumCover = async (show: boolean, key: string) => {
  if (!show) return;
  const path = albumData.value?.[key]?.[0]?.path;
  if (!path) return;
  const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", path);
  if (!coverData) return;
  const { data, format } = coverData;
  const blobURL = blob.createBlobURL(data, format, path);
  if (blobURL) albumData.value[key][0].cover = blobURL;
};

watch(
  () => chooseAlbum.value,
  (val) => {
    if (!val) return;
    const artistDom = document.getElementById(val);
    if (artistDom) artistDom.scrollIntoView({ behavior: "smooth", block: "center" });
  },
);
</script>

<style lang="scss" scoped>
.local-albums {
  display: flex;
  height: calc((var(--layout-height) - 80) * 1px);
  :deep(.album-list) {
    width: 260px;
    .n-scrollbar-content {
      padding: 0 5px 0 0 !important;
    }
  }
  .album-item {
    margin-bottom: 8px;
    border-radius: 8px;
    height: max-content;
    border: 2px solid rgba(var(--primary), 0.12);
    cursor: pointer;
    :deep(.n-card__content) {
      display: flex;
      padding: 12px;
    }
    &:last-child {
      margin-bottom: 24px;
    }
    .cover {
      width: 50px;
      height: 50px;
      margin-right: 12px;
      border-radius: 12px;
      overflow: hidden;
      :deep(img) {
        width: 100%;
        height: 100%;
      }
    }
    .data {
      display: flex;
      flex-direction: column;
      flex: 1;
      .name {
        font-weight: bold;
        font-size: 16px;
      }
      .num {
        margin-top: 2px;
        display: flex;
        align-items: center;
        .n-icon {
          margin-right: 2px;
          margin-top: -2px;
        }
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
