<!-- 播客列表 -->
<template>
  <div :class="['playlist', { small: listScrolling }]">
    <Transition name="fade" mode="out-in">
      <div v-if="radioDetailData" class="detail">
        <div class="cover">
          <n-image
            :src="radioDetailData.coverSize?.m || radioDetailData.cover"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="radioDetailData.cover"
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
            :src="radioDetailData.coverSize?.m || radioDetailData.cover"
          />
        </div>
        <div class="data">
          <n-h2 class="name text-hidden">
            {{ radioDetailData.name || "未知播客" }}
          </n-h2>
          <n-collapse-transition :show="!listScrolling" class="collapse">
            <!-- 简介 -->
            <n-ellipsis
              v-if="radioDetailData.description"
              :line-clamp="1"
              :tooltip="{
                trigger: 'click',
                placement: 'bottom',
                width: 'trigger',
              }"
            >
              {{ radioDetailData.description }}
            </n-ellipsis>
            <!-- 信息 -->
            <n-flex class="meta">
              <div class="item">
                <SvgIcon name="Person" :depth="3" />
                <n-text>{{ radioDetailData.creator?.name || "未知用户名" }}</n-text>
              </div>
              <div class="item">
                <SvgIcon name="Music" :depth="3" />
                <n-text>{{ radioDetailData.count || 0 }}</n-text>
              </div>
              <div v-if="radioDetailData.updateTime" class="item">
                <SvgIcon name="Update" :depth="3" />
                <n-text>{{ radioDetailData.updateTime }}</n-text>
              </div>
              <div v-else-if="radioDetailData.createTime" class="item">
                <SvgIcon name="Time" :depth="3" />
                <n-text>{{ formatTimestamp(radioDetailData.createTime) }}</n-text>
              </div>
              <div v-if="radioDetailData.tags?.length" class="item">
                <SvgIcon name="Tag" :depth="3" />
                <n-flex class="tags">
                  <n-tag
                    v-for="(item, index) in radioDetailData.tags"
                    :key="index"
                    :bordered="false"
                    round
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
                    ? isSamePlaylist
                      ? "更新中..."
                      : `加载中... (${
                          radioListData.length === radioDetailData.count ? 0 : radioListData.length
                        }/${radioDetailData.count})`
                    : "播放"
                }}
              </n-button>
              <n-button
                :focusable="false"
                strong
                secondary
                round
                @click="toSubRadio(radioId, !isLikeRadio)"
              >
                <template #icon>
                  <SvgIcon :name="isLikeRadio ? 'Favorite' : 'FavoriteBorder'" />
                </template>
                {{ isLikeRadio ? "取消订阅" : "订阅播客" }}
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
                v-if="radioListData?.length"
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
        :radioId="radioId"
        type="radio"
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
import type { DropdownOption, MessageReactive } from "naive-ui";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { coverLoaded, fuzzySearch, renderIcon } from "@/utils/helper";
import { renderToolbar } from "@/utils/meta";
import { debounce } from "lodash-es";
import { useDataStore, useStatusStore } from "@/stores";
import { radioAllProgram, radioDetail } from "@/api/radio";
import player from "@/utils/player";
import { formatTimestamp } from "@/utils/time";
import { toSubRadio } from "@/utils/auth";

const router = useRouter();
const dataStore = useDataStore();
const statusStore = useStatusStore();

// 播客数据
const radioListData = shallowRef<SongType[]>([]);
const radioDetailData = ref<CoverType | null>(null);

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 电台 ID
const oldRadioId = ref<number>(0);
const radioId = computed<number>(() => Number(router.currentRoute.value.query.id as string));

// 加载提示
const loading = ref<boolean>(true);
const loadingMsg = ref<MessageReactive | null>(null);

// 列表是否滚动
const listScrolling = ref<boolean>(false);

// 列表应该展示数据
const playlistDataShow = computed(() =>
  searchValue.value ? searchData.value : radioListData.value,
);

// 列表高度
const songListHeight = computed(() => {
  return statusStore.mainContentHeight - (listScrolling.value ? 120 : 240);
});

// 是否处于收藏播客
const isLikeRadio = computed(() => {
  return dataStore.userLikeData.djs.some((radio) => radio.id === radioDetailData.value?.id);
});

// 是否处于播客页面
const isPlaylistPage = computed<boolean>(() => router.currentRoute.value.name === "radio");

// 是否为相同播客
const isSamePlaylist = computed<boolean>(() => oldRadioId.value === radioId.value);

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "刷新播客",
    key: "refresh",
    props: {
      onClick: () => getRadioDetail(radioId.value),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/djradio?id=${radioId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取播客基础信息
const getRadioDetail = async (id: number) => {
  if (!id) return;
  // 设置加载状态
  loading.value = true;
  // 清空数据
  clearInput();
  // 获取播客详情
  radioDetailData.value = null;
  const detail = await radioDetail(id);
  radioDetailData.value = formatCoverList(detail.data)[0];
  // 获取全部节目
  await getRadioAllProgram(id, radioDetailData.value?.count as number);
};

// 获取播客全部歌曲
const getRadioAllProgram = async (id: number, count: number) => {
  if (!id || !count) return;
  loading.value = true;
  radioListData.value = [];
  // 加载提示
  if (count > 500) loadingMsgShow();
  // 循环获取
  let offset: number = 0;
  const limit: number = 500;
  do {
    const result = await radioAllProgram(id, limit, offset);
    const songData = formatSongsList(result.programs);
    radioListData.value = radioListData.value.concat(songData);
    // 更新数据
    offset += limit;
  } while (offset < count && isPlaylistPage.value);
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

// 加载提示
const loadingMsgShow = (show: boolean = true) => {
  if (show) {
    loadingMsg.value?.destroy();
    loadingMsg.value = window.$message.loading("该播客节目数量过多，请稍等", {
      duration: 0,
      closable: true,
    });
  } else {
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 播放全部歌曲
const playAllSongs = debounce(() => {
  if (!radioDetailData.value || !radioListData.value?.length) return;
  player.updatePlayList(radioListData.value, undefined, radioId.value);
}, 300);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") return;
  // 获取搜索结果
  const result = fuzzySearch(val, radioListData.value);
  searchData.value = result;
}, 300);

onBeforeRouteUpdate((to) => {
  const id = Number(to.query.id as string);
  if (id) {
    oldRadioId.value = id;
    getRadioDetail(id);
  }
});

onActivated(() => {
  // 是否为首次进入
  if (oldRadioId.value === 0) {
    oldRadioId.value = radioId.value;
  } else {
    // 是否不相同
    const isSame = oldRadioId.value === radioId.value;
    oldRadioId.value = radioId.value;
    // 刷新播客
    if (!isSame) getRadioDetail(radioId.value);
  }
});

onDeactivated(() => loadingMsgShow(false));
onUnmounted(() => loadingMsgShow(false));
onMounted(() => getRadioDetail(radioId.value));
</script>

<style lang="scss" scoped>
.playlist {
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
