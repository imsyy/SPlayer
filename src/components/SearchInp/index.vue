<template>
  <div class="searchInp">
    <n-input
      :class="inputActive ? 'input focus' : 'input'"
      round
      clearable
      placeholder="音乐/视频/电台/用户"
      v-model:value="inputValue"
      @focus="inputFocus"
      @keydown="inputkeydown($event)"
      @click.stop
    >
      <template #prefix>
        <n-icon
          size="20"
          :color="inputActive ? '#f55e55' : ''"
          :component="SearchFilled"
        />
      </template>
    </n-input>
    <CollapseTransition easing="ease-in-out">
      <n-card
        class="list"
        v-show="inputActive && !inputValue && searchData.hot[0]"
        content-style="padding: 0"
      >
        <n-scrollbar>
          <div
            class="hot-item"
            v-for="(item, index) in searchData.hot"
            :key="item"
            @click="toSearch(item.searchWord, 0)"
          >
            <div :class="index < 3 ? 'num hot' : 'num'">{{ index + 1 }}</div>
            <div class="title">
              <span class="name">
                {{ item.searchWord }}
                <!-- <img :src="item.iconUrl" alt="icon" /> -->
                <n-tag
                  v-if="item.iconUrl"
                  class="tag"
                  round
                  :bordered="false"
                  size="small"
                >
                  {{ item.iconType == 1 ? "HOT" : "UP" }}
                </n-tag>
              </span>
              <n-text class="tip" depth="3" v-html="item.content" />
            </div>
          </div>
        </n-scrollbar>
      </n-card>
    </CollapseTransition>
    <CollapseTransition easing="ease-in-out">
      <n-card
        class="list"
        v-show="inputActive && inputValue && searchData.suggest"
        content-style="padding: 0"
      >
        <n-scrollbar>
          <div
            class="suggest-tip"
            v-if="JSON.stringify(searchData.suggest) == '{}'"
          >
            <n-icon size="22" :component="SearchOffFilled" />
            <span>暂无搜索结果</span>
          </div>
          <div class="suggest-all" v-else>
            <div class="loading" v-show="!searchData.suggest.order">
              <n-icon size="22" :component="ManageSearchFilled" />
              <span>努力搜索中</span>
            </div>
            <div class="suggest-item" v-if="searchData.suggest.songs">
              <div class="type">
                <n-icon size="18" :component="MusicNoteFilled" />
                <span class="name">单曲</span>
              </div>
              <span
                class="names"
                v-for="songs in searchData.suggest.songs"
                :key="songs"
                @click="toSearch(songs.id, 1)"
                >{{ songs.name }} - {{ songs.artists[0].name }}</span
              >
            </div>
            <div class="suggest-item" v-if="searchData.suggest.artists">
              <div class="type">
                <n-icon size="18" :component="MicFilled" />
                <span class="name">歌手</span>
              </div>
              <span
                class="names"
                v-for="artists in searchData.suggest.artists"
                :key="artists"
                @click="toSearch(artists.id, 100)"
                >{{ artists.name }}</span
              >
            </div>
            <div class="suggest-item" v-if="searchData.suggest.albums">
              <div class="type">
                <n-icon size="18" :component="AlbumSharp" />
                <span class="name">专辑</span>
              </div>
              <span
                class="names"
                v-for="albums in searchData.suggest.albums"
                :key="albums"
                @click="toSearch(albums.id, 10)"
                >{{ albums.name }} - {{ albums.artist.name }}</span
              >
            </div>
            <div class="suggest-item" v-if="searchData.suggest.playlists">
              <div class="type">
                <n-icon size="18" :component="PlaylistPlayFilled" />
                <span class="name">歌单</span>
              </div>
              <span
                class="names"
                v-for="playlists in searchData.suggest.playlists"
                :key="playlists"
                @click="toSearch(playlists.id, 1000)"
                >{{ playlists.name }}</span
              >
            </div>
          </div>
        </n-scrollbar>
      </n-card>
    </CollapseTransition>
  </div>
</template>

<script setup>
import { getSearchHot, getSearchSuggest } from "@/api";
import {
  SearchFilled,
  MusicNoteFilled,
  MicFilled,
  AlbumSharp,
  PlaylistPlayFilled,
  SearchOffFilled,
  ManageSearchFilled,
} from "@vicons/material";
import CollapseTransition from "@ivanv/vue-collapse-transition/src/CollapseTransition.vue";
import debounce from "@/utils/debounce";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
const router = useRouter();
const music = musicStore();

// 输入框内容
const inputValue = ref(null);

// 输入框激活状态
const inputActive = ref(false);

// 输入框激活事件
const inputFocus = () => {
  inputActive.value = true;
  music.showPlayList = false;
  getSearchHotData();
};

// 搜索相关数据
const searchData = reactive({
  hot: [], // 热搜
  suggest: {}, // 搜索建议
});

// 获取搜索相关数据
const getSearchHotData = () => {
  getSearchHot().then((res) => {
    searchData.hot = res.data;
  });
};
const getSearchSuggestData = (keywords) => {
  searchData.suggest = [];
  getSearchSuggest(keywords).then((res) => {
    console.log(res);
    searchData.suggest = res.result;
  });
};

// 点击搜索结果
const toSearch = (val, type) => {
  switch (type) {
    case 0:
      // 直接搜索
      inputValue.value = val;
      router.push(`/search/songs?keywords=${val}`);
      break;
    case 1:
      // 歌曲页
      router.push(`/song?id=${val}`);
      break;
    case 10:
      // 专辑页
      router.push(`/album?id=${val}`);
      break;
    case 100:
      // 歌手页
      router.push(`/artist?id=${val}`);
      break;
    case 1000:
      // 歌单页
      router.push(`/playlist?id=${val}`);
      break;
    default:
      break;
  }
};

// 回车搜索
const inputkeydown = (e) => {
  if (e.key === "Enter" && inputValue.value != null) {
    console.log("执行搜索" + inputValue.value.trim());
    inputActive.value = false;
    router.push({
      path: "/search/songs",
      query: {
        keywords: inputValue.value.trim(),
      },
    });
  }
};

onMounted(() => {
  // 获取热搜
  getSearchHotData();
  // 搜索框失焦
  document.addEventListener("click", () => {
    inputActive.value = false;
  });
});

onUnmounted(() => {
  document.removeEventListener("click", () => {
    inputActive.value = false;
  });
});

// 监听输入框内容
watch(
  () => inputValue.value,
  (value) => {
    if (value.trim()) {
      debounce(() => {
        console.log(value.trim());
        getSearchSuggestData(value.trim());
      }, 500);
    }
  }
);
</script>

<style lang="scss" scoped>
.searchInp {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  .input {
    width: 200px;
    transition: all 0.3s;
    &.focus {
      width: 280px;
      :deep(input) {
        color: $mainColor;
      }
    }
  }
  .list {
    position: absolute;
    top: 40px;
    right: 0;
    border-radius: 8px;
    width: 280px;
    z-index: 3;
    :deep(.n-scrollbar) {
      max-height: 80vh;
      .n-scrollbar-rail {
        width: 0;
      }
      .n-scrollbar-content {
        padding: 12px;
        .hot-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          margin-bottom: 8px;
          cursor: pointer;
          border-radius: 8px;
          padding: 6px;
          transition: all 0.3s;

          &:nth-last-of-type(1) {
            margin-bottom: 0;
          }

          &:hover {
            background-color: var(--n-border-color);
          }
          .num {
            width: 30px;
            height: 30px;
            min-width: 30px;
            text-align: center;
            line-height: 30px;
            font-size: 16px;
            font-weight: bold;
            margin-right: 8px;
            &.hot {
              color: #ff5656;
            }
          }
          .title {
            display: flex;
            flex-direction: column;
            .name {
              font-size: 16px;
              display: flex;
              flex-direction: row;
              align-items: center;
              img {
                height: 16px;
                width: auto;
                margin-left: 6px;
                margin-bottom: 2px;
              }
              .tag {
                transform: translateY(-1px);
                margin-left: 6px;
                height: 18px;
                color: $mainColor;
                background-color: $mainSecondaryColor;
                border-color: $mainColor;
              }
            }
            .tip {
              font-size: 12px;
            }
          }
        }
        .suggest-tip {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
        }
        .suggest-all {
          .loading {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            .n-icon {
              margin-bottom: 4px;
            }
          }
          .suggest-item {
            margin-bottom: 12px;
            &:nth-last-of-type(1) {
              margin-bottom: 0;
            }
            .type {
              color: #ff5656;
              display: flex;
              flex-direction: row;
              align-items: center;
              margin-bottom: 4px;
              .n-icon {
                margin-bottom: 2px;
              }
              .name {
                margin-left: 4px;
              }
            }
            .names {
              display: block;
              padding: 14px 18px 14px 22px;
              cursor: pointer;
              transition: all 0.3s;
              border-radius: 8px;
              &:hover {
                background-color: var(--n-border-color);
              }
            }
          }
        }
      }
    }
  }
}
</style>