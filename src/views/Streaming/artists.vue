<template>
  <div class="streaming-artists">
    <n-scrollbar class="artist-list">
      <n-card
        v-for="(item, key, index) in artistData"
        :key="index"
        :id="String(key)"
        :class="['artist-item', { choose: chooseArtist === key }]"
        @click="chooseArtist = String(key)"
      >
        <n-text class="name">{{ key || "未知艺术家" }}</n-text>
        <n-text class="num" depth="3">
          <SvgIcon name="Music" :depth="3" />
          {{ item.length }} 首
        </n-text>
      </n-card>
    </n-scrollbar>
    <Transition name="fade" mode="out-in">
      <SongList
        :key="chooseArtist"
        :data="artistSongs"
        :loading="artistSongs?.length ? false : true"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useStreamingStore } from "@/stores";
import { some } from "lodash-es";
import { usePlayerController } from "@/core/player/PlayerController";

const streamingStore = useStreamingStore();
const player = usePlayerController();

// 播放事件总线
const streamingPlayEventBus = useEventBus("streaming-play");

// 歌手数据
const chooseArtist = ref<string>("");
const artistData = computed<Record<string, SongType[]>>(() =>
  formatArtistsList(streamingStore.songs.value),
);

// 对应歌手歌曲
const artistSongs = computed<SongType[]>(() => artistData.value?.[chooseArtist.value] || []);

// 区分歌手数据
const formatArtistsList = (data: SongType[]): Record<string, SongType[]> => {
  if (!data || data.length === 0) return {};

  const allArtists = data.reduce(
    (acc, song) => {
      // 歌手信息
      const artistName = typeof song.artists === "string" ? song.artists.trim() : "未知艺术家";
      // 若还无歌手分类，初始化为空数组
      if (!acc[artistName]) acc[artistName] = [];
      // 去重
      if (!some(acc[artistName], { id: song.id })) acc[artistName].push(song);
      return acc;
    },
    {} as Record<string, SongType[]>,
  );
  // 按字母顺序排序
  const sortedArtists = Object.keys(allArtists).sort((a, b) => a.localeCompare(b));
  const sortedAllArtists: Record<string, SongType[]> = {};
  sortedArtists.forEach((artist) => {
    sortedAllArtists[artist] = allArtists[artist];
  });
  // 默认选中第一个
  if (sortedArtists.length > 0 && !chooseArtist.value) {
    chooseArtist.value = sortedArtists[0];
  }
  return sortedAllArtists;
};

// 监听播放事件
const router = useRouter();
streamingPlayEventBus.on(() => {
  if (router.currentRoute.value?.name !== "streaming-artists") return;
  const songs = artistSongs.value.map((song) => ({
    ...song,
    id: song.id,
  }));
  player.updatePlayList(songs);
});

watch(
  () => chooseArtist.value,
  (val) => {
    if (!val) return;
    const artistDom = document.getElementById(val);
    if (artistDom) artistDom.scrollIntoView({ behavior: "smooth", block: "center" });
  },
);
</script>

<style lang="scss" scoped>
.streaming-artists {
  display: flex;
  height: calc((var(--layout-height) - 132) * 1px);
  :deep(.artist-list) {
    width: 200px;
    .n-scrollbar-content {
      padding: 0 5px 0 0 !important;
    }
  }
  .artist-item {
    margin-bottom: 8px;
    border-radius: 8px;
    border: 2px solid rgba(var(--primary), 0.12);
    cursor: pointer;
    :deep(.n-card__content) {
      display: flex;
      flex-direction: column;
      padding: 12px 16px;
    }
    &:last-child {
      margin-bottom: 24px;
    }
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
