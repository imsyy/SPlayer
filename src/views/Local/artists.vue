<!-- 本地歌曲 - 歌手 -->
<template>
  <n-tabs
    v-if="allArtistsData"
    v-model:value="tabValue"
    class="local-artists"
    :style="{
      height: `calc(100vh - ${
        Object.keys(music.playSongData)?.length && status.showPlayBar ? 445 : 365
      }px)`,
    }"
    type="card"
    placement="left"
  >
    <n-tab-pane
      v-for="(item, index) in allArtistsData"
      :key="index"
      :name="item.name"
      :tab="createTab(item)"
    >
      <n-scrollbar class="scrollbar">
        <SongList :data="filterByArtistKeyword(songList, item.name)" />
        <!-- 回顶 -->
        <n-back-top bottom="120">
          <n-icon size="26">
            <SvgIcon icon="chevron-up" />
          </n-icon>
        </n-back-top>
      </n-scrollbar>
    </n-tab-pane>
  </n-tabs>
  <div v-else class="not">
    <n-text>未找到歌手</n-text>
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { musicData, siteStatus } from "@/stores";
import SvgIcon from "@/components/Global/SvgIcon";

const music = musicData();
const status = siteStatus();

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 歌曲信息
  songList: {
    type: Array,
    default: () => [],
  },
});

// 歌手数据
const tabValue = ref(null);
const allArtistsData = computed(() => getAllArtists(props.songList));

// 自定义标签页头
const createTab = (data) => {
  return h("div", { class: "tab-artist" }, [
    h("span", { class: "tba-name" }, [data.name]),
    h("div", { class: "tba-num" }, [
      h(NIcon, null, () => h(SvgIcon, { icon: "music-note" })),
      h("span", { class: "tba-num" }, ["共" + data.num + "首"]),
    ]),
  ]);
};

// 提取歌手信息为数组
const getAllArtists = (data) => {
  const artistsCountMap = new Map();
  data?.forEach((music) => {
    const artists = music.artists ? music.artists.split(/[/,&]/) : [];
    artists.forEach((artist) => {
      const trimmedArtist = artist.trim();
      if (artistsCountMap.has(trimmedArtist)) {
        artistsCountMap.set(trimmedArtist, artistsCountMap.get(trimmedArtist) + 1);
      } else {
        artistsCountMap.set(trimmedArtist, 1);
      }
    });
  });
  // 将 Map 转为数组
  const artistsArray = Array.from(artistsCountMap.entries()).map(([name, num]) => ({
    name,
    num,
  }));
  // 排序
  const sortedArtistsArray = artistsArray.sort((a, b) => {
    const nameComparison = a.name.localeCompare(b.name, "zh-Hans-CN", { sensitivity: "base" });
    if (nameComparison === 0) {
      return b.num - a.num; // 如果 name 相同，按 num 降序排序
    }
    return nameComparison;
  });
  tabValue.value = sortedArtistsArray?.[0]?.name || null;
  return sortedArtistsArray;
};

// 过滤包含关键字的歌手数组
const filterByArtistKeyword = (data, keyword) => {
  return data.filter((item) => {
    if (item.artists && item.artists.includes(keyword)) {
      return item;
    }
    return false;
  });
};
</script>

<style lang="scss" scoped>
.local-artists {
  transition: height 0.3s;
  :deep(.scrollbar) {
    height: 100%;
  }
  :deep(.n-tabs-tab) {
    transition:
      color 0.3s,
      border 0.3s;
    &.n-tabs-tab--active {
      background-color: var(--main-boxshadow-color) !important;
      border-color: var(--main-color) !important;
    }
    .tab-artist {
      display: flex;
      flex-direction: column;
      .tba-num {
        display: flex;
        flex-direction: row;
        align-items: center;
        opacity: 0.8;
        font-size: 12px;
        .n-icon {
          margin-right: 4px;
          opacity: 0.8;
        }
      }
    }
  }
}
</style>
