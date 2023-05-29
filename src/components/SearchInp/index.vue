<template>
  <div class="searchInp">
    <n-input
      :class="site.searchInputActive ? 'input focus' : 'input'"
      :input-props="{ autoComplete: false }"
      :placeholder="$t('nav.search.placeholder')"
      ref="searchInpRef"
      round
      clearable
      v-model:value="inputValue"
      @focus="inputFocus"
      @keydown="inputkeydown($event)"
      @click.stop
    >
      <template #prefix>
        <n-icon
          size="16"
          :class="site.searchInputActive ? 'active' : ''"
          :component="Search"
        />
      </template>
    </n-input>
    <CollapseTransition easing="ease-in-out">
      <n-card
        class="list"
        v-show="
          site.searchInputActive &&
          !inputValue &&
          (music.getSearchHistory[0] || searchData.hot[0])
        "
        content-style="padding: 0"
      >
        <n-scrollbar>
          <div
            class="history-list"
            v-if="music.getSearchHistory[0] && setting.searchHistory"
          >
            <div class="list-title">
              <n-icon size="16" :component="History" />
              <n-text>{{ $t("nav.search.history") }}</n-text>
            </div>
            <n-space>
              <n-tag
                v-for="item in music.getSearchHistory"
                :key="item"
                :bordered="false"
                round
                v-html="item"
                @click="toSearch(item, 0)"
              />
            </n-space>
            <div class="del" @click="delHistory">
              <n-icon size="16" :depth="3">
                <DeleteFour theme="filled" />
              </n-icon>
              <n-text :depth="3">{{ $t("nav.search.delHistory") }}</n-text>
            </div>
          </div>
          <div class="hot-list" v-if="searchData.hot[0]">
            <div class="list-title">
              <n-icon size="16">
                <Fire theme="filled" />
              </n-icon>
              <n-text>{{ $t("nav.search.hotList") }}</n-text>
            </div>
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
          </div>
        </n-scrollbar>
      </n-card>
    </CollapseTransition>
    <CollapseTransition easing="ease-in-out">
      <n-card
        class="list"
        v-show="site.searchInputActive && inputValue && searchData.suggest"
        content-style="padding: 0"
      >
        <n-scrollbar>
          <div
            class="suggest-tip"
            v-if="Object.keys(searchData.suggest).length === 0"
          >
            <n-icon size="16" :component="Find" />
            <span>{{ $t("nav.search.noSuggestions") }}</span>
          </div>
          <div class="suggest-all" v-else>
            <div class="loading" v-show="!searchData.suggest.order">
              <n-icon size="16" :component="Find" />
              <span>{{ $t("nav.search.searchTip") }}</span>
            </div>
            <div class="suggest-item" v-if="searchData.suggest.songs">
              <div class="type">
                <n-icon size="18">
                  <MusicOne theme="filled" />
                </n-icon>
                <span class="name">{{ $t("nav.search.songs") }}</span>
              </div>
              <span
                class="names"
                v-for="songs in searchData.suggest.songs"
                :key="songs"
                @click="toSearch(songs.id, 1)"
              >
                {{ songs.name }} - {{ songs.artists[0].name }}</span
              >
            </div>
            <div class="suggest-item" v-if="searchData.suggest.artists">
              <div class="type">
                <n-icon size="18">
                  <Voice theme="filled" />
                </n-icon>
                <span class="name">{{ $t("nav.search.artists") }}</span>
              </div>
              <span
                class="names"
                v-for="artists in searchData.suggest.artists"
                :key="artists"
                @click="toSearch(artists.id, 100)"
                v-html="artists.name"
              />
            </div>
            <div class="suggest-item" v-if="searchData.suggest.albums">
              <div class="type">
                <n-icon size="18">
                  <RecordDisc theme="filled" />
                </n-icon>
                <span class="name">{{ $t("nav.search.albums") }}</span>
              </div>
              <span
                class="names"
                v-for="albums in searchData.suggest.albums"
                :key="albums"
                @click="toSearch(albums.id, 10)"
              >
                {{ albums.name }} - {{ albums.artist.name }}
              </span>
            </div>
            <div class="suggest-item" v-if="searchData.suggest.playlists">
              <div class="type">
                <n-icon size="18">
                  <Record theme="filled" />
                </n-icon>
                <span class="name">{{ $t("nav.search.playlists") }}</span>
              </div>
              <span
                class="names"
                v-for="playlists in searchData.suggest.playlists"
                :key="playlists"
                @click="toSearch(playlists.id, 1000)"
              >
                {{ playlists.name }}
              </span>
            </div>
          </div>
        </n-scrollbar>
      </n-card>
    </CollapseTransition>
  </div>
</template>

<script setup>
import { getSearchHot, getSearchSuggest } from "@/api/search";
import {
  Search,
  MusicOne,
  Voice,
  RecordDisc,
  Record,
  Find,
  Fire,
  History,
  DeleteFour,
} from "@icon-park/vue-next";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { musicStore, settingStore, siteStore } from "@/store";
import CollapseTransition from "@ivanv/vue-collapse-transition/src/CollapseTransition.vue";
import debounce from "@/utils/debounce";

const { t } = useI18n();
const router = useRouter();
const music = musicStore();
const setting = settingStore();
const site = siteStore();

// 输入框内容
const inputValue = ref(null);
const searchInpRef = ref(null);

// 输入框激活事件
const inputFocus = () => {
  searchInpRef.value?.focus();
  site.searchInputActive = true;
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
      // 写入搜索历史
      music.setSearchHistory(inputValue.value.trim());
      router.push({
        path: "/search/songs",
        query: {
          keywords: val,
          page: 1,
        },
      });
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
    searchInpRef.value?.blur();
    site.searchInputActive = false;
    // 写入搜索历史
    music.setSearchHistory(inputValue.value.trim());
    router.push({
      path: "/search/songs",
      query: {
        keywords: inputValue.value.trim(),
      },
    });
  }
};

// 删除搜索历史
const delHistory = () => {
  $dialog.warning({
    class: "s-dialog",
    title: t("general.dialog.delete"),
    content: t("nav.search.tip"),
    positiveText: t("general.dialog.delete"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      music.setSearchHistory(null, true);
      $message.success(t("general.message.deleteSuccess"));
    },
  });
};

onMounted(() => {
  // 获取热搜
  getSearchHotData();
  // 搜索框失焦
  document.addEventListener("click", () => {
    searchInpRef.value?.blur();
    site.searchInputActive = false;
  });
});

onUnmounted(() => {
  document.removeEventListener("click", () => {
    searchInpRef.value?.blur();
    site.searchInputActive = false;
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

// 监听播放列表显隐
watch(
  () => music.showPlayList,
  (val) => {
    if (val) {
      searchInpRef.value?.blur();
      site.searchInputActive = false;
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
    @media (max-width: 450px) {
      width: 40px;
    }
    &.focus {
      width: 280px;
      :deep(input) {
        color: var(--main-color);
      }
      @media (max-width: 450px) {
        width: 60vw;
      }
      @media (max-width: 380px) {
        width: 54vw;
      }
      @media (max-width: 320px) {
        width: 50vw;
      }
    }
    :deep(.n-input__prefix) {
      .n-icon {
        transition: color 0.3s;
        &.active {
          color: var(--main-color);
        }
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

    @media (max-width: 450px) {
      position: fixed;
      width: 100%;
      top: 58px;
      right: 0;
      left: 0;
      border-radius: 0 0 8px 8px;
      z-index: 2006;
      &::after {
        position: absolute;
        right: 0;
        top: 0;
        content: "×";
        padding: 4px 12px;
        font-size: 12px;
        background-color: var(--n-action-color);
        border-radius: 0 0 0 14px;
      }
    }
    :deep(.n-scrollbar) {
      max-height: 80vh;
      @media (max-width: 450px) {
        max-height: calc(100vh - 60px);
        min-height: calc(100vh - 60px);
        box-sizing: border-box;
      }
      .n-scrollbar-rail {
        width: 4px;
      }
      .n-scrollbar-container {
        @media (max-width: 450px) {
          padding-top: 8px;
        }
        .n-scrollbar-content {
          padding: 12px;
          .list-title {
            color: var(--main-color);
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            .n-text {
              margin-left: 4px;
              font-size: 14px;
              color: var(--main-color);
              line-height: 0;
            }
          }
          .history-list {
            margin-bottom: 18px;
            .n-space {
              margin: 12px 0;
              .n-tag {
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s;
                &:hover {
                  background-color: var(--main-second-color);
                  color: var(--main-color);
                }
                &:active {
                  transform: scale(0.95);
                }
              }
            }
            .del {
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              cursor: pointer;
              .n-icon {
                margin-right: 4px;
              }
            }
          }
          .hot-list {
            margin-top: 6px;
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
                  color: var(--main-color);
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
                    transform: scale(0.9);
                    margin-left: 6px;
                    height: 18px;
                    color: var(--main-color);
                    background-color: var(--main-second-color);
                    border-color: var(--main-color);
                  }
                }
                .tip {
                  font-size: 12px;
                }
              }
            }
          }
          .suggest-tip {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            .n-icon {
              margin-right: 6px;
            }
          }
          .suggest-all {
            .loading {
              display: flex;
              flex-direction: row;
              justify-content: center;
              align-items: center;
              .n-icon {
                margin-right: 6px;
              }
            }
            .suggest-item {
              margin-bottom: 12px;
              &:nth-last-of-type(1) {
                margin-bottom: 0;
              }
              .type {
                color: var(--main-color);
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
}
</style>
