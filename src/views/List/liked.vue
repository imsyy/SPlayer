<!-- 歌单列表 -->
<template>
  <div :class="['liked', { small: listScrolling }]">
    <Transition name="fade" mode="out-in">
      <div v-if="playlistDetailData" class="detail">
        <div class="cover">
          <n-image
            :src="playlistDetailData.coverSize?.m || playlistDetailData.cover"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="playlistDetailData.cover"
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
            :src="playlistDetailData.coverSize?.m || playlistDetailData.cover"
          />
          <!-- 遮罩 -->
          <div class="cover-mask" />
          <!-- 播放量 -->
          <div class="play-count">
            <SvgIcon name="Play" />
            <span class="num">{{ formatNumber(playlistDetailData.playCount || 0) }}</span>
          </div>
        </div>
        <div class="data">
          <n-h2 class="name text-hidden"> 我喜欢的音乐 </n-h2>
          <n-collapse-transition :show="!listScrolling" class="collapse">
            <!-- 简介 -->
            <n-ellipsis
              v-if="playlistDetailData.description"
              :line-clamp="1"
              :tooltip="{
                trigger: 'click',
                placement: 'bottom',
                width: 'trigger',
              }"
            >
              {{ playlistDetailData.description }}
            </n-ellipsis>
            <!-- 信息 -->
            <n-flex class="meta">
              <div class="item">
                <SvgIcon name="Person" :depth="3" />
                <n-text>{{ playlistDetailData.creator?.name || "未知用户名" }}</n-text>
              </div>
              <div v-if="playlistDetailData.updateTime" class="item">
                <SvgIcon name="Update" :depth="3" />
                <n-text>{{ formatTimestamp(playlistDetailData.updateTime) }}</n-text>
              </div>
              <div v-else-if="playlistDetailData.createTime" class="item">
                <SvgIcon name="Time" :depth="3" />
                <n-text>{{ formatTimestamp(playlistDetailData.createTime) }}</n-text>
              </div>
              <div v-if="playlistDetailData.tags?.length" class="item">
                <SvgIcon name="Tag" :depth="3" />
                <n-flex class="tags">
                  <n-tag
                    v-for="(item, index) in playlistDetailData.tags"
                    :key="index"
                    :bordered="false"
                    round
                    @click="
                      router.push({
                        name: 'discover-playlists',
                        query: { cat: item },
                      })
                    "
                  >
                    {{ item }}
                  </n-tag>
                </n-flex>
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
                {{
                  loading
                    ? `正在更新... (${
                        playlistData.length === playlistDetailData.count ? 0 : playlistData.length
                      }/${playlistDetailData.count})`
                    : "播放"
                }}
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
                v-if="playlistData?.length"
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
        :data="playlistDataShow"
        :loading="loading"
        :height="songListHeight"
        :playListId="playlistId"
        @scroll="listScroll"
        @removeSong="removeSong"
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
import type { DropdownOption, MessageReactive } from "naive-ui";
import { songDetail } from "@/api/song";
import { playlistDetail, playlistAllSongs } from "@/api/playlist";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { coverLoaded, formatNumber, fuzzySearch, renderIcon } from "@/utils/helper";
import { renderToolbar } from "@/utils/meta";
import { debounce, isObject } from "lodash-es";
import { useDataStore, useStatusStore } from "@/stores";
import { openBatchList, openUpdatePlaylist } from "@/utils/modal";
import { formatTimestamp } from "@/utils/time";
import { isLogin } from "@/utils/auth";
import player from "@/utils/player";

const router = useRouter();
const dataStore = useDataStore();
const statusStore = useStatusStore();

// 是否激活
const isActivated = ref<boolean>(false);

// 歌单数据
const playlistData = shallowRef<SongType[]>([]);
const playlistDetailData = ref<CoverType | null>(null);

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 歌单 ID
const playlistId = computed<number>(() => dataStore.userLikeData.playlists?.[0]?.id);

// 加载提示
const loading = ref<boolean>(true);
const loadingMsg = ref<MessageReactive | null>(null);

// 列表是否滚动
const listScrolling = ref<boolean>(false);

// 列表应该展示数据
const playlistDataShow = computed(() =>
  searchValue.value ? searchData.value : playlistData.value,
);

// 列表高度
const songListHeight = computed(() => {
  return statusStore.mainContentHeight - (listScrolling.value ? 120 : 240);
});

// 是否处于我喜欢页面
const isLikedPage = computed(() => router.currentRoute.value.name === "like-songs");

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "编辑歌单",
    key: "edit",
    props: {
      onClick: () => {
        if (!playlistDetailData.value || !playlistId.value) return;
        openUpdatePlaylist(playlistId.value, playlistDetailData.value, () =>
          getPlaylistDetail(playlistId.value, { getList: false, refresh: false }),
        );
      },
    },
    icon: renderIcon("EditNote"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(playlistDataShow.value, false, playlistId.value),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/playlist?id=${playlistId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取歌单基础信息
const getPlaylistDetail = async (
  id: number,
  options: {
    getList: boolean;
    refresh: boolean;
  } = {
    getList: true,
    refresh: false,
  },
) => {
  if (!id) return;
  // 设置加载状态
  loading.value = true;
  const { getList, refresh } = options;
  // 清空数据
  clearInput();
  if (!refresh) resetPlaylistData(getList);
  // 获取歌单内容
  getPlaylistData(id, getList, refresh);
};

// 重置歌单数据
const resetPlaylistData = (getList: boolean) => {
  playlistDetailData.value = null;
  if (getList) {
    playlistData.value = [];
    listScrolling.value = false;
  }
};

// 获取歌单
const getPlaylistData = async (id: number, getList: boolean, refresh: boolean) => {
  // 加载缓存
  loadLikedCache();
  // 获取歌单详情
  const detail = await playlistDetail(id);
  playlistDetailData.value = formatCoverList(detail.playlist)[0];
  // 不需要获取列表或无歌曲
  if (!getList || playlistDetailData.value.count === 0) {
    loading.value = false;
    return;
  }
  // 如果已登录且歌曲数量少于 800，直接加载所有歌曲
  if (isLogin() === 1 && (playlistDetailData.value?.count as number) < 800) {
    const ids: number[] = detail.privileges.map((song: any) => song.id as number);
    const result = await songDetail(ids);
    playlistData.value = formatSongsList(result.songs);
  } else {
    await getPlaylistAllSongs(id, playlistDetailData.value.count || 0, refresh);
  }
  // 更新我喜欢
  dataStore.setLikeSongsList(playlistDetailData.value, playlistData.value);
  loading.value = false;
};

// 加载缓存
const loadLikedCache = () => {
  if (isObject(dataStore.likeSongsList.detail)) {
    playlistDetailData.value = dataStore.likeSongsList.detail;
  }
  if (dataStore.likeSongsList.data.length) {
    playlistData.value = dataStore.likeSongsList.data;
  }
};

// 获取歌单全部歌曲
const getPlaylistAllSongs = async (
  id: number,
  count: number,
  // 是否为刷新列表
  refresh: boolean = false,
) => {
  loading.value = true;
  // 加载提示
  loadingMsgShow(!refresh);
  // 循环获取
  let offset: number = 0;
  const limit: number = 500;
  const listData: SongType[] = [];
  do {
    const result = await playlistAllSongs(id, limit, offset);
    const songData = formatSongsList(result.songs);
    listData.push(...songData);
    if (!refresh) playlistData.value = playlistData.value.concat(songData);
    // 更新数据
    offset += limit;
  } while (offset < count && isLikedPage.value);
  if (refresh) playlistData.value = listData;
  // 关闭加载
  loadingMsgShow(false);
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
  if (!playlistDetailData.value || !playlistData.value?.length) return;
  player.updatePlayList(playlistData.value, undefined, playlistId.value);
}, 300);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") return;
  // 获取搜索结果
  const result = fuzzySearch(val, playlistData.value);
  searchData.value = result;
}, 300);

// 加载提示
const loadingMsgShow = (show: boolean = true) => {
  if (show) {
    loadingMsg.value?.destroy();
    loadingMsg.value = window.$message.loading("该歌单歌曲数量过多，请稍等", {
      duration: 0,
      closable: true,
    });
  } else {
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 删除指定索引歌曲
const removeSong = (ids: number[]) => {
  if (!playlistData.value) return;
  playlistData.value = playlistData.value.filter((song) => !ids.includes(song.id));
};

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    getPlaylistDetail(playlistId.value, { getList: true, refresh: true });
  }
});

onDeactivated(() => loadingMsgShow(false));
onUnmounted(() => loadingMsgShow(false));

onMounted(async () => {
  const data: any = await dataStore.getUserLikePlaylist();
  const id = data?.detail?.id;
  if (id) getPlaylistDetail(id);
});
</script>

<style lang="scss" scoped>
.liked {
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
      .cover-mask {
        position: absolute;
        top: 0;
        left: 0;
        height: 30%;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
        transition: opacity 0.3s;
      }
      .play-count {
        position: absolute;
        display: flex;
        align-items: center;
        top: 10px;
        right: 12px;
        color: #fff;
        font-weight: bold;
        z-index: 2;
        transition: opacity 0.3s;
        .n-icon {
          color: #fff;
          font-size: 16px;
          margin-right: 4px;
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
          .tags {
            margin-left: 4px;
            .n-tag {
              font-size: 13px;
              padding: 0 16px;
              line-height: 0;
              cursor: pointer;
              transition:
                transform 0.3s,
                background-color 0.3s,
                color 0.3s;
              &:hover {
                background-color: rgba(var(--primary), 0.14);
              }
              &:active {
                transform: scale(0.95);
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
        .cover-mask,
        .play-count {
          opacity: 0;
        }
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
