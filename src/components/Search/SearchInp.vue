<!-- 全局搜索框 -->
<template>
  <div class="search-input">
    <n-input
      ref="searchInpRef"
      v-model:value="searchInputValue"
      :class="status.searchInputFocus ? 'input focus' : 'input'"
      :input-props="{ autoComplete: false }"
      :allow-input="noSideSpace"
      placeholder="搜索音乐 / 视频"
      round
      clearable
      @focus="searchInputFocus"
      @keyup.enter="toSearch(searchInputValue)"
      @click.stop
    >
      <template #prefix>
        <n-icon>
          <SvgIcon icon="search-rounded" />
        </n-icon>
      </template>
    </n-input>
    <!-- 搜索框遮罩 -->
    <Transition name="fade" mode="out-in">
      <div
        v-show="status.searchInputFocus"
        class="search-mask"
        @click.stop="status.searchInputFocus = false"
      />
    </Transition>
    <!-- 热搜榜及历史 -->
    <SearchHot :searchValue="searchInputValue?.trim()" @toSearch="toSearch" />
    <!-- 搜索建议 -->
    <SearchSuggestions :searchValue="searchInputValue?.trim()" @toSearch="toSearch" />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getSongDetail } from "@/api/song";
import { siteData, siteStatus, musicData } from "@/stores";
import { addSongToNext, initPlayer } from "@/utils/Player";
import formatData from "@/utils/formatData";

const router = useRouter();
const music = musicData();
const status = siteStatus();
const data = siteData();
const { playSongData } = storeToRefs(music);

const searchInpRef = ref(null);
const searchInputValue = ref("");

// 搜索框输入限制
const noSideSpace = (value) => !value.startsWith(" ");

// 搜索框 focus
const searchInputFocus = () => {
  searchInpRef.value?.focus();
  status.searchInputFocus = true;
};

// 添加搜索历史
const setSearchHistory = (name) => {
  if (!name || !name?.trim()) return false;
  const index = data.searchHistory.indexOf(name);
  if (index !== -1) {
    data.searchHistory.splice(index, 1);
  }
  data.searchHistory.unshift(name);
  if (data.searchHistory.length > 30) {
    data.searchHistory.pop();
  }
};

// 直接播放单曲
const toPlaySong = async (id) => {
  try {
    if (!id) return false;
    // 获取歌曲信息
    const result = await getSongDetail(id.toString());
    const songData = formatData(result?.songs?.[0], "song")?.[0];
    // 添加至下一曲
    addSongToNext(songData, true);
    playSongData.value = songData;
    // 初始化播放器
    initPlayer(true);
  } catch (error) {
    console.error("获取歌曲信息失败：", error);
    $message.error("获取歌曲信息失败");
  }
};

// 前往搜索
const toSearch = (val, type = "song") => {
  if (!val) return false;
  // 取消聚焦状态
  status.searchInputFocus = false;
  searchInpRef.value?.blur();
  // 判断类型
  switch (type) {
    // 直接搜索
    case "song":
      // 写入搜索历史
      setSearchHistory(val?.trim());
      // 前往
      router.push({
        path: "/search/songs",
        query: {
          keywords: val?.trim(),
        },
      });
      break;
    // 歌单
    case "playlists":
      router.push({
        path: "/playlist",
        query: {
          id: val,
        },
      });
      break;
    // 单曲
    case "songs":
      toPlaySong(val);
      break;
    // 专辑
    case "albums":
      router.push({
        path: "/album",
        query: {
          id: val,
        },
      });
      break;
    // 歌手
    case "artists":
      router.push({
        path: "/artist",
        query: {
          id: val,
        },
      });
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
.search-input {
  position: relative;
  -webkit-app-region: no-drag;
  .input {
    width: 200px;
    z-index: 11;
    transition: width 0.3s;
    &.focus {
      width: 300px;
    }
  }
  .search-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    background-color: #00000040;
    backdrop-filter: blur(20px);
    -webkit-app-region: no-drag;
  }
}
</style>
