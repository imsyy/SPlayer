<!-- 歌曲列表 -->
<template>
  <Transition name="fade" mode="out-in" @after-enter="checkHasPlaying">
    <div v-if="data !== 'empty' && data?.length && data[0] !== 'empty'" class="song-list">
      <div v-if="showTitle" class="song-list-header">
        <n-text class="num" depth="3"> # </n-text>
        <n-text :class="{ info: true, 'has-cover': data[0].cover && showCover }" depth="3">
          歌曲
        </n-text>
        <n-text v-if="data[0].album && showAlbum" class="album" depth="3"> 专辑 </n-text>
        <n-text v-if="data[0].duration" class="duration" depth="3"> 时长 </n-text>
        <n-text v-if="data[0].size" class="size" depth="3"> 大小 </n-text>
      </div>
      <n-card
        v-for="(item, index) in data.slice(
          (pageNumber - 1) * loadSize,
          (pageNumber - 1) * loadSize + loadSize,
        )"
        :id="'song-list-' + index"
        :key="index"
        :content-style="{
          padding: '16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }"
        :class="music.getPlaySongData?.id === item?.id ? 'songs play' : 'songs'"
        hoverable
        @dblclick.stop="playSong(data, item, songsIndex + index)"
        @contextmenu="
          songListDropdownRef?.openDropdown($event, data, item, songsIndex + index, sourceId)
        "
      >
        <!-- 序号 -->
        <n-text v-if="music.getPlaySongData?.id !== item?.id" class="num" depth="3">
          {{ songsIndex + index + 1 }}
        </n-text>
        <n-icon v-else class="play" size="22">
          <SvgIcon icon="music-note" />
        </n-icon>
        <!-- 封面 -->
        <div v-if="item.cover && showCover" class="cover">
          <n-image
            :src="item.coverSize.s"
            class="cover-img"
            preview-disabled
            lazy
            @load="
              (e) => {
                e.target.style.opacity = 1;
              }
            "
          >
            <template #placeholder>
              <div class="cover-loading">
                <img class="loading-img" src="/images/pic/song.jpg?assest" alt="song" />
              </div>
            </template>
          </n-image>
        </div>
        <!-- 信息 -->
        <div class="info">
          <div class="title">
            <!-- 名称 -->
            <n-text class="name" depth="2">{{ item?.name || "未知曲目" }}</n-text>
            <!-- 特权 -->
            <n-tag
              v-if="showPrivilege && item.fee === 1 && userData.detail?.profile?.vipType !== 11"
              :bordered="false"
              type="error"
              size="small"
              round
            >
              VIP
            </n-tag>
            <n-tag
              v-if="showPrivilege && item.fee === 4"
              :bordered="false"
              type="error"
              size="small"
              round
            >
              EP
            </n-tag>
            <!-- 云盘 -->
            <n-tag
              v-if="showPrivilege && item.pc"
              :bordered="false"
              class="cloud"
              type="info"
              size="small"
              round
            >
              <template #icon>
                <n-icon>
                  <SvgIcon icon="cloud" />
                </n-icon>
              </template>
            </n-tag>
            <!-- MV -->
            <n-tag
              v-if="item?.mv"
              :bordered="false"
              class="mv"
              type="warning"
              size="small"
              round
              @click.stop="router.push(`/videos-player?id=${item.mv}`)"
            >
              MV
            </n-tag>
          </div>
          <!-- 歌手 -->
          <div v-if="Array.isArray(item.artists)" class="artist">
            <n-text
              v-for="ar in item.artists"
              :key="ar.id"
              class="ar"
              @click.stop="router.push(`/artist?id=${ar.id}`)"
            >
              {{ ar.name }}
            </n-text>
          </div>
          <div v-else class="artist">
            <n-text class="ar"> {{ item.artists || "未知艺术家" }} </n-text>
          </div>
          <!-- 别名 -->
          <n-text v-if="item.alia" class="alia" depth="3">{{ item.alia }}</n-text>
        </div>
        <!-- 专辑 -->
        <template v-if="showAlbum">
          <n-text
            v-if="item.album"
            class="album"
            @click.stop="item.album !== 'string' ? router.push(`/album?id=${item.album.id}`) : null"
          >
            {{ typeof item.album === "string" ? item.album : item.album.name }}
          </n-text>
          <n-text v-else class="album">未知专辑</n-text>
        </template>
        <!-- 操作 -->
        <div class="action">
          <!-- 喜欢歌曲 -->
          <n-icon
            :depth="dataStore.getSongIsLike(item?.id) ? 0 : 3"
            class="favorite"
            size="20"
            @click.stop="
              dataStore.changeLikeList(item?.id, !dataStore.getSongIsLike(item?.id), item?.path)
            "
            @dblclick.stop
          >
            <SvgIcon
              :icon="
                dataStore.getSongIsLike(item?.id) ? 'favorite-rounded' : 'favorite-outline-rounded'
              "
            />
          </n-icon>
        </div>
        <!-- 时长 -->
        <n-text v-if="item.duration" class="duration" depth="3">{{ item.duration }}</n-text>
        <n-text v-else class="duration"> -- </n-text>
        <!-- 大小 -->
        <n-text v-if="item.size" class="size" depth="3">{{ item.size }}M</n-text>
      </n-card>
      <!-- 分页 -->
      <Pagination
        v-if="data.length >= loadSize && showPagination"
        :totalCount="data.length"
        :pageNumber="pageNumber"
        @pageNumberChange="pageNumberChange"
      />
      <!-- 右键菜单 -->
      <SongListDropdown ref="songListDropdownRef" @playSong="playSong" />
      <!-- 定位歌曲 -->
      <Transition name="shrink" mode="out-in">
        <n-card
          v-if="isHasPlayingDom"
          :bordered="false"
          :content-style="{
            padding: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }"
          class="scroll-to-song"
          @click="checkHasPlaying('scroll')"
        >
          <n-icon size="26">
            <SvgIcon icon="location" />
          </n-icon>
        </n-card>
      </Transition>
    </div>
    <!-- 空列表 -->
    <n-empty
      v-else-if="data === 'empty' || data?.[0] === 'empty'"
      description="空空如也，怎么一首歌都没有啊"
      style="margin-top: 60px"
      size="large"
    />
    <!-- 加载动画 -->
    <n-spin v-else class="loading" size="small">
      <template #description> 加载中 </template>
    </n-spin>
  </Transition>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { siteData, siteSettings, musicData } from "@/stores";
import { initPlayer, fadePlayOrPause, addSongToNext } from "@/utils/Player";

const router = useRouter();
const music = musicData();
const dataStore = siteData();
const settings = siteSettings();
const { userData } = storeToRefs(dataStore);
const { loadSize, playSearch } = storeToRefs(settings);
const { playList, playIndex, playSongData, playSongSource, playHeartbeatMode, playMode } =
  storeToRefs(music);

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 列表数据
  data: {
    type: [Array, String],
    default: () => [],
  },
  // 列表 id
  sourceId: {
    type: [Number, String],
    default: 0,
  },
  // 是否显示封面
  showCover: {
    type: Boolean,
    default: true,
  },
  // 是否显示分页
  showPagination: {
    type: Boolean,
    default: true,
  },
  // 是否显示特权
  showPrivilege: {
    type: Boolean,
    default: true,
  },
  // 是否显示专辑
  showAlbum: {
    type: Boolean,
    default: true,
  },
  // 是否显示表头
  showTitle: {
    type: Boolean,
    default: true,
  },
});

// 分页数据
const pageNumber = ref(1);

// 右键菜单
const songListDropdownRef = ref(null);

// 当前索引
const songsIndex = computed(() => {
  const page = props.showPagination
    ? pageNumber.value
    : Number(router.currentRoute.value.query?.page) || 1;
  return (page - 1) * loadSize.value;
});

// 正在播放元素
const isHasPlayingDom = ref(null);

// 检查是否有正在播放的歌曲
const checkHasPlaying = (isScoll = null) => {
  const songDom = document.querySelector(".songs.play");
  // 滚动至元素
  if (isScoll === "scroll" && songDom) {
    songDom?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  isHasPlayingDom.value = songDom ? true : false;
};

// 播放歌曲
const playSong = async (data, song, index) => {
  console.log(data, song, index);
  // 更改模式
  playMode.value = "normal";
  // 检查当前页面
  const isPage = router.currentRoute.value.matched?.[0].path || null;
  // 是否关闭心动模式
  if (isPage !== "/like-songs") playHeartbeatMode.value = false;
  // 是否为当前播放歌曲
  if (music.getPlaySongData?.id === song?.id) {
    // 继续播放
    fadePlayOrPause();
  } else {
    // 若为特殊状态
    if (
      (isPage === "/search" && !playSearch.value) ||
      isPage === "/history" ||
      playHeartbeatMode.value
    ) {
      console.log("仅播放当前歌曲");
      addSongToNext(song, true);
    } else {
      // 添加播放列表
      playList.value = data.slice();
      // 更改播放索引
      playIndex.value = index;
    }
    console.log("与当前播放歌曲不一致");
    playSongData.value = song;
    // 初始化播放器
    initPlayer(true);
  }
  // 附加来源
  playSongSource.value = Number(props.sourceId);
  // 检查是否有正在播放的歌曲
  nextTick().then(() => checkHasPlaying());
};

// 页数变化
const pageNumberChange = (page) => {
  pageNumber.value = page;
  nextTick().then(() => {
    const mainLayout = document.getElementById("main-layout");
    mainLayout?.scrollIntoView({ behavior: "smooth" });
    checkHasPlaying();
  });
};

// 监听歌曲变化
watch(
  () => music.getPlaySongData?.id,
  () => nextTick().then(() => checkHasPlaying()),
);

onMounted(() => {
  checkHasPlaying();
});

onBeforeUnmount(() => {
  isHasPlayingDom.value = false;
});
</script>

<style lang="scss" scoped>
.song-list {
  width: 100%;
  .song-list-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;
    padding: 0 16px;
    * {
      box-sizing: border-box;
    }
    .num {
      width: 30px;
      margin-right: 16px;
      text-align: center;
    }
    .info,
    .album {
      flex: 1;
    }
    .has-cover {
      margin-right: 66px;
    }
    .duration {
      width: 40px;
      text-align: center;
    }
    .size {
      width: 80px;
      padding-right: 10px;
      text-align: right;
    }
  }
  .songs {
    border-radius: 8px;
    margin-bottom: 12px;
    transition:
      transform 0.3s,
      border-color 0.3s,
      box-shadow 0.3s;
    cursor: pointer;
    .cover {
      width: 50px;
      height: 50px;
      min-width: 50px;
      border-radius: 8px;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      .cover-img {
        width: 100%;
        height: 100%;
        z-index: 1;
        transition:
          filter 0.3s,
          transform 0.3s;
        :deep(img) {
          width: 100%;
          opacity: 0;
          transition: opacity 0.35s ease-in-out;
        }
      }
    }
    .num,
    .play {
      width: 30px;
      height: 30px;
      min-width: 30px;
      border-radius: 8px;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-right: 20px;
      .title {
        display: flex;
        align-items: center;
        flex-direction: row;
        .name {
          font-size: 16px;
          font-weight: bold;
          transition: color 0.3s;
          -webkit-line-clamp: 2;
          &:hover {
            color: var(--main-color);
          }
        }
        .n-tag {
          margin-left: 8px;
          height: 18px;
          &.cloud {
            padding: 0 10px;
            align-items: center;
            justify-content: center;
            :deep(.n-tag__icon) {
              margin-right: 0;
              width: 100%;
            }
          }
          &.mv {
            cursor: pointer;
          }
        }
      }
      .artist {
        margin-top: 2px;
        font-size: 13px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          display: inline-flex;
          transition: opacity 0.3s;
          opacity: 0.6;
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
          &:hover {
            opacity: 0.8;
          }
        }
      }
      .alia {
        margin-top: 2px;
        font-size: 12px;
        opacity: 0.8;
      }
    }
    .album {
      flex: 1;
      padding-right: 20px;
      transition: color 0.3s;
      -webkit-line-clamp: 2;
      &:hover {
        color: var(--main-color);
      }
    }
    .action {
      width: 40px;
      display: flex;
      align-items: center;
      justify-content: space-evenly;
      .favorite {
        padding-top: 1px;
        transition: transform 0.3s;
        cursor: pointer;
        &:hover {
          transform: scale(1.15);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
    .duration {
      width: 40px;
      text-align: center;
    }
    .size {
      width: 80px;
      text-align: right;
    }
    &.play {
      background-color: var(--main-second-color);
      border-color: var(--main-color);
      a,
      span,
      .play {
        color: var(--main-color) !important;
      }
      .artist {
        .ar {
          opacity: 0.8;
          transition: opacity 0.3s;
          &:hover {
            opacity: 1;
          }
        }
      }
      .album {
        opacity: 0.8;
        transition: opacity 0.3s;
        &:hover {
          opacity: 1;
        }
      }
    }
    &:last-child {
      margin-bottom: 0;
    }
    &:hover {
      border-color: var(--main-color);
      box-shadow:
        0 1px 2px -2px var(--main-boxshadow-color),
        0 3px 6px 0 var(--main-boxshadow-color),
        0 5px 12px 4px var(--main-boxshadow-hover-color);
    }
    &:active {
      transform: scale(0.995);
    }
  }
  .scroll-to-song {
    position: absolute;
    width: 44px;
    height: 44px;
    right: calc(40px);
    bottom: 100px;
    border-radius: 50%;
    background-color: var(--n-color-embedded-popover);
    transition:
      transform 0.3s,
      opacity 0.3s;
    cursor: pointer;
    &:active {
      transform: scale(0.9);
    }
  }
}
.loading {
  margin: 60px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
