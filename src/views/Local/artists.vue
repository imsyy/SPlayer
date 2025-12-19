<template>
  <div class="local-artists">
    <n-scrollbar class="artist-list">
      <n-card
        v-for="(item, key, index) in artistData"
        :key="index"
        :id="key"
        :class="['artist-item', { choose: chooseArtist === key }]"
        @click="chooseArtist = key"
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
        :hidden-cover="!settingStore.showLocalCover"
        @removeSong="handleRemoveSong"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useLocalStore, useSettingStore } from "@/stores";
import { isArray, some } from "lodash-es";

const props = defineProps<{ data: SongType[] }>();

const localStore = useLocalStore();
const settingStore = useSettingStore();

// 歌手数据
const chooseArtist = ref<string>("");
const artistData = computed<Record<string, SongType[]>>(() => formatArtistsList(props.data));

// 对应歌手歌曲
const artistSongs = computed<SongType[]>(() => artistData.value?.[chooseArtist.value] || []);

// 区分歌手数据
const formatArtistsList = (
  data: SongType[],
  separators: string[] = settingStore.localSeparators,
): Record<string, SongType[]> => {
  const allArtists = data.reduce(
    (acc, song) => {
      // 歌手信息
      let artists = isArray(song.artists) ? song.artists : [song.artists];
      // 分割歌手
      separators.forEach((separator) => {
        artists = artists.flatMap((artist: any) =>
          typeof artist === "string" ? artist.split(separator) : [artist],
        );
      });
      // 遍历歌手
      artists.forEach((artist: any) => {
        // 获取歌手名称
        const artistName = typeof artist === "string" ? artist.trim() : artist.name;
        // 若还无歌手分类，初始化为空数组
        if (!acc[artistName]) acc[artistName] = [];
        // 去重
        if (!some(acc[artistName], { id: song.id })) acc[artistName].push(song);
      });
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
  // 默认选中
  chooseArtist.value = sortedArtists[0];
  return sortedAllArtists;
};

// 处理删除歌曲
const handleRemoveSong = (ids: number[]) => {
  // 从本地歌曲列表中删除指定ID的歌曲
  const updatedSongs = localStore.localSongs.filter((song) => !ids.includes(song.id));
  localStore.updateLocalSong(updatedSongs);
};

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
.local-artists {
  display: flex;
  height: calc((var(--layout-height) - 80) * 1px);
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
