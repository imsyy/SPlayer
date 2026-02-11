<template>
  <div class="local-albums">
    <n-scrollbar class="album-list">
      <n-card
        v-for="(item, key, index) in albumData"
        :key="index"
        :id="key"
        :class="[
          'album-item',
          { choose: chooseAlbum === key, 'no-cover': settingStore.hiddenCovers.album },
        ]"
        @click="chooseAlbum = key"
      >
        <Transition name="fade" mode="out-in">
          <s-image
            v-if="!settingStore.hiddenCovers.album"
            :key="item?.[0]?.cover"
            :src="item?.[0]?.cover || '/images/album.jpg?asset'"
            class="cover"
          />
        </Transition>
        <div class="data">
          <n-text class="name">{{ key || "未知专辑" }}</n-text>
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
        :data="albumSongs"
        :loading="albumSongs?.length ? false : true"
        @removeSong="handleRemoveSong"
        hidden-cover
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useLocalStore, useSettingStore } from "@/stores";
import { some } from "lodash-es";
import { usePlayerController } from "@/core/player/PlayerController";

const props = defineProps<{ data: SongType[] }>();

const localStore = useLocalStore();
const settingStore = useSettingStore();
const player = usePlayerController();

// 播放事件总线
const localPlayEventBus = useEventBus("local-play");

// 专辑数据
const chooseAlbum = ref<string>("");
const albumData = computed<Record<string, SongType[]>>(() => formatArtistsList(props.data));

// 对应专辑歌曲
const albumSongs = computed<SongType[]>(() => albumData.value?.[chooseAlbum.value] || []);

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

// 处理删除歌曲
const handleRemoveSong = (ids: number[]) => {
  // 从本地歌曲列表中删除指定ID的歌曲
  const updatedSongs = localStore.localSongs.filter((song) => !ids.includes(song.id));
  localStore.updateLocalSong(updatedSongs);
};

// 监听播放事件
const router = useRouter();
localPlayEventBus.on(() => {
  if (router.currentRoute.value?.name !== "local-albums") return;
  player.updatePlayList(albumSongs.value);
});

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
    &.no-cover {
      .data {
        align-items: center;
        justify-content: center;
        text-align: center;
      }
    }
  }
  .song-list {
    width: 100%;
    flex: 1;
    margin-left: 15px;
  }
}
</style>
