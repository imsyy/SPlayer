<!-- 全局搜索框 -->
<template>
  <div class="search-input">
    <n-input
      ref="searchInpRef"
      v-model:value="searchInputValue"
      :class="searchInputFocus ? 'input focus' : 'input'"
      :input-props="{ autoComplete: false }"
      :placeholder="searchPlaceholder"
      :allow-input="noSideSpace"
      round
      clearable
      @focus="searchInputToFocus"
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
      <div v-show="searchInputFocus" class="search-mask" @click.stop="searchInputFocus = false" />
    </Transition>
    <!-- 热搜榜及历史 -->
    <SearchHot
      :searchValue="searchInputValue?.trim()"
      @toSearch="toSearch"
      @closeSearch="closeSearch"
    />
    <!-- 搜索建议 -->
    <SearchSuggestions
      :searchValue="searchInputValue?.trim()"
      @toSearch="toSearch"
      @closeSearch="closeSearch"
    />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getSongDetail } from "@/api/song";
import { getSearchDefault } from "@/api/search";
import { siteData, siteStatus, musicData } from "@/stores";
import { addSongToNext, initPlayer } from "@/utils/Player";
import formatData from "@/utils/formatData";

const router = useRouter();
const music = musicData();
const status = siteStatus();
const data = siteData();
const { searchHistory } = storeToRefs(data);
const { playSongData } = storeToRefs(music);
const { searchInputFocus } = storeToRefs(status);

// 搜索框数据
const searchInpRef = ref(null);
const searchInputValue = ref("");
const searchInterval = ref(null);
const searchRealkeyword = ref(null);
const searchPlaceholder = ref("搜索音乐 / 视频");

// 搜索框输入限制
const noSideSpace = (value) => !value.startsWith(" ");

// 搜索框 focus
const searchInputToFocus = () => {
  searchInpRef.value?.focus();
  searchInputFocus.value = true;
};

// 添加搜索历史
const setSearchHistory = (name) => {
  if (!name || !name?.trim()) return false;
  const index = searchHistory.value.indexOf(name);
  if (index !== -1) {
    searchHistory.value.splice(index, 1);
  }
  searchHistory.value.unshift(name);
  if (searchHistory.value.length > 30) {
    searchHistory.value.pop();
  }
};

// 更换搜索框关键词
const updatePlaceholder = async () => {
  try {
    const result = await getSearchDefault();
    searchPlaceholder.value = result.data.showKeyword;
    searchRealkeyword.value = result.data.realkeyword;
  } catch (error) {
    console.error("搜索关键词获取失败：", error);
    searchPlaceholder.value = "搜索音乐 / 视频";
  }
};

// 更新搜索框关键词
const changePlaceholder = () => {
  updatePlaceholder();
  // 5分钟
  searchInterval.value = setInterval(updatePlaceholder, 5 * 60 * 1000);
};

// 关闭搜索
const closeSearch = () => {
  // 取消聚焦状态
  status.searchInputFocus = false;
  searchInpRef.value?.blur();
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
  // 未输入内容且不存在推荐
  if (!val && searchPlaceholder.value === "搜索音乐 / 视频") return false;
  if (!val && searchPlaceholder.value !== "搜索音乐 / 视频" && searchRealkeyword.value) {
    val = searchRealkeyword.value?.trim();
  }
  // 取消聚焦状态
  closeSearch();
  // 更新推荐
  updatePlaceholder();
  // 触发测试
  if (Number(val) === 114514) return router.push("/test");
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

onMounted(() => {
  changePlaceholder();
});

onBeforeUnmount(() => {
  clearInterval(searchInterval.value);
});
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
  @media (max-width: 700px) {
    width: 100%;
    margin-right: 12px;
    .input {
      width: 100%;
      &.focus {
        width: 100%;
      }
    }
  }
  @media (max-width: 512px) {
    .search-mask {
      background-color: transparent;
      backdrop-filter: blur(0);
    }
  }
}
</style>
