<!-- 专辑列表 -->
<template>
  <div :class="['album', { small: listScrolling }]">
    <Transition name="fade" mode="out-in">
      <div v-if="albumDetailData" class="detail">
        <div class="cover">
          <n-image
            :src="albumDetailData.coverSize?.m || albumDetailData.cover"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="albumDetailData.cover"
            :renderToolbar="renderToolbar"
            show-toolbar-tooltip
            class="cover-img"
            @load="coverLoaded"
          >
            <template #placeholder>
              <div class="cover-loading">
                <img src="/images/album.jpg?assest" class="loading-img" alt="loading-img" />
              </div>
            </template>
          </n-image>
          <!-- 封面背板 -->
          <n-image
            class="cover-shadow"
            preview-disabled
            :src="albumDetailData.coverSize?.m || albumDetailData.cover"
          />
        </div>
        <div class="data">
          <n-h2 class="name">
            <n-ellipsis :line-clamp="1" :tooltip="{ placement: 'bottom' }">
              {{ albumDetailData.name || "未知专辑" }}
            </n-ellipsis>
          </n-h2>
          <n-collapse-transition :show="!listScrolling" class="collapse">
            <!-- 简介 -->
            <n-ellipsis
              v-if="albumDetailData.description"
              :line-clamp="1"
              :tooltip="{
                trigger: 'click',
                placement: 'bottom',
                width: 'trigger',
              }"
            >
              {{ albumDetailData.description }}
            </n-ellipsis>
            <!-- 信息 -->
            <n-flex class="meta">
              <div class="item">
                <SvgIcon name="Person" :depth="3" />
                <div
                  v-if="Array.isArray(albumDetailData.artists)"
                  class="artists text-hidden"
                  @click="openJumpArtist(albumDetailData.artists)"
                >
                  <n-text
                    v-for="(ar, arIndex) in albumDetailData.artists"
                    :key="arIndex"
                    class="ar"
                  >
                    {{ ar.name || "未知艺术家" }}
                  </n-text>
                </div>
                <div
                  v-else
                  class="artists text-hidden"
                  @click="openJumpArtist(albumDetailData.artists || '')"
                >
                  <n-text class="ar"> {{ albumDetailData.artists || "未知艺术家" }} </n-text>
                </div>
              </div>
              <div class="item">
                <SvgIcon name="Music" :depth="3" />
                <n-text>{{ albumDetailData.count }}</n-text>
              </div>
              <div v-if="albumDetailData.updateTime" class="item">
                <SvgIcon name="Update" :depth="3" />
                <n-text>{{ albumDetailData.updateTime }}</n-text>
              </div>
              <div v-else-if="albumDetailData.createTime" class="item">
                <SvgIcon name="Time" :depth="3" />
                <n-text>{{ formatTimestamp(albumDetailData.createTime) }}</n-text>
              </div>
            </n-flex>
          </n-collapse-transition>
          <n-flex class="menu" justify="space-between">
            <n-flex class="left" align="flex-end">
              <n-button
                :focusable="false"
                :disabled="loading"
                :loading="loading"
                type="primary"
                strong
                secondary
                round
                @click="playAllSongs"
              >
                <template #icon>
                  <SvgIcon name="Play" />
                </template>
                {{ loading ? "加载中..." : "播放" }}
              </n-button>
              <n-button :focusable="false" strong secondary round>
                <template #icon>
                  <SvgIcon :name="isLikeAlbum ? 'Favorite' : 'FavoriteBorder'" />
                </template>
                {{ isLikeAlbum ? "取消收藏" : "收藏专辑" }}
              </n-button>
              <!-- 更多 -->
              <n-dropdown :options="moreOptions" trigger="click" placement="bottom-start">
                <n-button :focusable="false" class="more" circle strong secondary>
                  <template #icon>
                    <SvgIcon name="List" />
                  </template>
                </n-button>
              </n-dropdown>
            </n-flex>
            <n-flex class="right">
              <!-- 模糊搜索 -->
              <n-input
                v-if="albumData?.length"
                v-model:value="searchValue"
                :input-props="{ autocomplete: 'off' }"
                class="search"
                placeholder="模糊搜索"
                clearable
                round
                @input="listSearch"
              >
                <template #prefix>
                  <SvgIcon name="Search" />
                </template>
              </n-input>
            </n-flex>
          </n-flex>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="albumDataShow"
        :loading="loading"
        :height="songListHeight"
        hidden-album
        @scroll="listScroll"
      />
      <n-empty
        v-else
        :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CoverType, SongType } from "@/types/main";
import type { DropdownOption } from "naive-ui";
import { songDetail } from "@/api/song";
import { albumDetail } from "@/api/album";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { coverLoaded, fuzzySearch, renderIcon } from "@/utils/helper";
import { renderToolbar } from "@/utils/meta";
import { useDataStore, useStatusStore } from "@/stores";
import { debounce } from "lodash-es";
import { formatTimestamp } from "@/utils/time";
import { openJumpArtist } from "@/utils/modal";
import player from "@/utils/player";

const router = useRouter();
const dataStore = useDataStore();
const statusStore = useStatusStore();

// 是否激活
const isActivated = ref<boolean>(false);

// 专辑数据
const loading = ref<boolean>(true);
const albumData = shallowRef<SongType[]>([]);
const albumDetailData = ref<CoverType | null>(null);

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 专辑 ID
const albumId = computed<number>(() => Number(router.currentRoute.value.query.id as string));

// 列表是否滚动
const listScrolling = ref<boolean>(false);

// 是否处于收藏专辑
const isLikeAlbum = computed(() =>
  dataStore.userLikeData.albums.some((album) => album.id === albumDetailData.value?.id),
);

// 列表应该展示数据
const albumDataShow = computed(() => (searchValue.value ? searchData.value : albumData.value));

// 列表高度
const songListHeight = computed(() => {
  return statusStore.mainContentHeight - (listScrolling.value ? 120 : 240);
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/album?id=${albumId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取专辑基础信息
const getAlbumDetail = async (id: number, refresh: boolean = false) => {
  if (!id) return;
  loading.value = true;
  // 清空数据
  clearInput();
  if (!refresh) {
    albumData.value = [];
    albumDetailData.value = null;
  }
  // 获取专辑详情
  const detail = await albumDetail(id);
  albumDetailData.value = formatCoverList(detail.album)[0];
  // 获取专辑歌曲
  const ids: number[] = detail.songs.map((song: any) => song.id as number);
  const result = await songDetail(ids);
  albumData.value = formatSongsList(result.songs);
  loading.value = false;
};

// 列表滚动
const listScroll = (e: Event) => {
  // 滚动高度
  const scrollTop = (e.target as HTMLElement).scrollTop;
  listScrolling.value = scrollTop > 10;
};

// 清除输入
const clearInput = () => {
  searchValue.value = "";
  searchData.value = [];
};

// 播放全部歌曲
const playAllSongs = debounce(() => {
  if (!albumDetailData.value || !albumData.value?.length) return;
  player.updatePlayList(albumData.value);
}, 300);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") return;
  // 获取搜索结果
  const result = fuzzySearch(val, albumData.value);
  searchData.value = result;
}, 300);

onBeforeRouteUpdate((to) => {
  clearInput();
  const id = Number(to.query.id as string);
  if (id) getAlbumDetail(id);
});

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    getAlbumDetail(albumId.value, albumDetailData.value?.id === albumId.value);
  }
});

onDeactivated(() => {
  listScrolling.value = false;
});

onMounted(() => {
  getAlbumDetail(albumId.value);
});
</script>

<style lang="scss" scoped>
.album {
  display: flex;
  flex-direction: column;
  .detail {
    position: absolute;
    display: flex;
    height: 240px;
    width: 100%;
    padding: 12px 0 30px 0;
    will-change: height, opacity;
    z-index: 1;
    transition:
      height 0.3s,
      opacity 0.3s;
    .cover {
      position: relative;
      display: flex;
      width: auto;
      height: 100%;
      aspect-ratio: 1/1;
      margin-right: 20px;
      border-radius: 8px;
      transition:
        opacity 0.3s,
        margin 0.3s,
        transform 0.3s;
      :deep(img) {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.35s ease-in-out;
      }
      .cover-img {
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        transition:
          opacity 0.3s,
          filter 0.3s,
          transform 0.3s;
      }
      .cover-shadow {
        position: absolute;
        top: 6px;
        height: 100%;
        width: 100%;
        filter: blur(12px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
        :deep(img) {
          opacity: 1;
        }
      }
      &:active {
        transform: scale(0.98);
      }
    }
    .data {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-right: 60px;
      :deep(.n-skeleton) {
        margin-bottom: 12px;
        border-radius: 8px;
        height: 32px;
      }
      :deep(.n-ellipsis) {
        margin-bottom: 8px;
        cursor: pointer;
      }
      .name {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 12px;
        transition:
          font-size 0.3s var(--n-bezier),
          color 0.3s var(--n-bezier);
      }
      .collapse {
        position: absolute;
        left: 0;
        top: 60px;
        margin-bottom: 12px;
      }
      .meta {
        .item {
          display: flex;
          align-items: center;
          .n-icon {
            font-size: 20px;
            margin-right: 4px;
          }
          .ar {
            display: inline-flex;
            cursor: pointer;
            &::after {
              content: "/";
              margin: 0 4px;
            }
            &:last-child {
              &::after {
                display: none;
              }
            }
          }
        }
      }
      .menu {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        .n-button {
          height: 40px;
          transition: all 0.3s var(--n-bezier);
        }
        .more {
          width: 40px;
        }
        .search {
          height: 40px;
          width: 130px;
          display: flex;
          align-items: center;
          border-radius: 25px;
          transition: all 0.3s var(--n-bezier);
          &.n-input--focus {
            width: 200px;
          }
        }
      }
    }
  }
  .song-list,
  .loading,
  .n-empty {
    padding-top: 240px;
    transition:
      padding 0.3s,
      opacity 0.3s;
  }
  &.small {
    .detail {
      height: 120px;
      .cover {
        margin-right: 12px;
      }
      .data {
        .name {
          font-size: 22px;
        }
        .menu {
          .n-button,
          .search {
            height: 32px;
            --n-font-size: 13px;
            --n-padding: 0 14px;
            --n-icon-size: 16px;
          }
        }
      }
    }
    .song-list,
    .loading,
    .n-empty {
      padding-top: 120px;
    }
  }
}
</style>
