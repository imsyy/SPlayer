<!-- 专辑页面 -->
<template>
  <div v-if="albumId && Number(albumId)" class="album">
    <Transition name="fade" mode="out-in">
      <div v-if="albumDetail && Object.keys(albumDetail)?.length" class="detail">
        <div class="cover">
          <!-- 封面 -->
          <n-image
            :src="albumDetail.coverSize.l"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="albumDetail.cover"
            class="cover-img"
            show-toolbar-tooltip
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
          <!-- 封面背板 -->
          <n-image :src="albumDetail.coverSize.m" class="cover-shadow" preview-disabled />
        </div>
        <div class="data">
          <n-text class="name">
            {{ albumDetail.name || "未知专辑" }}
          </n-text>
          <n-text v-if="albumDetail.alia" class="alia" depth="3">{{ albumDetail.alia }}</n-text>
          <div v-if="albumDetail.artists" class="creator">
            <n-text
              v-for="(item, index) in albumDetail.artists"
              :key="index"
              class="ar"
              @click="router.push(`/artist?id=${item.id}`)"
            >
              {{ item.name }}
            </n-text>
          </div>
          <!-- 标签 -->
          <n-space v-if="albumDetail?.tags" class="tags">
            <n-tag
              v-for="(item, index) in albumDetail.tags"
              :key="index"
              :bordered="false"
              class="pl-tags"
              round
              @click="
                router.push({
                  path: '/discover/albums',
                  query: { cat: item },
                })
              "
            >
              {{ item }}
            </n-tag>
          </n-space>
          <!-- 数量 -->
          <n-space class="num">
            <div v-if="albumDetail.count" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="music-note" />
              </n-icon>
              <n-text depth="3">{{ albumDetail.count }}</n-text>
            </div>
            <div v-if="albumDetail.share" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="share" />
              </n-icon>
              <n-text depth="3">{{ formatNumber(albumDetail?.share || 0) }}</n-text>
            </div>
            <div v-if="albumDetail.publishTime" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="clock" />
              </n-icon>
              <n-text depth="3">{{ getTimestampTime(albumDetail.publishTime) }} 发布</n-text>
            </div>
          </n-space>
          <!-- 简介 -->
          <n-ellipsis
            v-if="albumDetail.description"
            :tooltip="false"
            class="description"
            expand-trigger="click"
            line-clamp="2"
          >
            <n-text depth="3">{{ albumDetail.description }}</n-text>
          </n-ellipsis>
          <n-text v-else class="description">太懒了吧，连简介都没写</n-text>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
    <!-- 功能区 -->
    <n-space class="menu" justify="space-between">
      <n-space class="left">
        <n-button
          :disabled="albumData === 'empty'"
          type="primary"
          class="play"
          tag="div"
          circle
          strong
          secondary
          @click="playAllSongs"
        >
          <template #icon>
            <n-icon size="32">
              <SvgIcon icon="play-arrow-rounded" />
            </n-icon>
          </template>
        </n-button>
        <n-button size="large" tag="div" round strong secondary @click="likeOrDislike(albumId)">
          <template #icon>
            <n-icon>
              <SvgIcon
                :icon="isLikeOrDislike(albumId) ? 'favorite-outline-rounded' : 'favorite-rounded'"
              />
            </n-icon>
          </template>
          {{ isLikeOrDislike(albumId) ? "收藏专辑" : "取消收藏" }}
        </n-button>
        <n-dropdown :options="moreOptions" trigger="hover" placement="bottom-start">
          <n-button size="large" tag="div" circle strong secondary>
            <template #icon>
              <n-icon>
                <SvgIcon icon="format-list-bulleted" />
              </n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-space>
      <n-space class="right">
        <!-- 模糊搜索 -->
        <Transition name="fade" mode="out-in">
          <n-input
            v-if="albumData !== 'empty' && albumData?.length"
            v-model:value="searchValue"
            :input-props="{ autoComplete: false }"
            class="search"
            placeholder="模糊搜索"
            clearable
            @input="localSearch"
          >
            <template #prefix>
              <n-icon size="18">
                <SvgIcon icon="search-rounded" />
              </n-icon>
            </template>
          </n-input>
        </Transition>
      </n-space>
    </n-space>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <SongList v-if="!searchValue" :data="albumData" :sourceId="albumId" :showAlbum="false" />
      <SongList
        v-else-if="searchData?.length"
        :data="searchData"
        :sourceId="albumId"
        :showAlbum="false"
      />
      <n-empty
        v-else
        :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <n-icon>
            <SvgIcon icon="search-off" />
          </n-icon>
        </template>
      </n-empty>
    </Transition>
  </div>
  <div v-else class="title">
    <n-text class="key">参数不完整</n-text>
    <n-button class="back" strong secondary @click="router.go(-1)"> 返回上一页 </n-button>
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { musicData, siteData } from "@/stores";
import { getAlbumDetail, likeAlbum } from "@/api/album";
import { formatNumber, fuzzySearch } from "@/utils/helper";
import { getTimestampTime } from "@/utils/timeTools";
import { fadePlayOrPause, initPlayer } from "@/utils/Player";
import { isLogin } from "@/utils/auth";
import debounce from "@/utils/debounce";
import formatData from "@/utils/formatData";
import SvgIcon from "@/components/Global/SvgIcon";

const router = useRouter();
const data = siteData();
const music = musicData();
const { userLikeData } = storeToRefs(data);
const { playList, playIndex, playSongData, playHeartbeatMode, playMode } = storeToRefs(music);

// 专辑 ID
const albumId = ref(router.currentRoute.value.query.id || null);

// 专辑数据
const albumDetail = ref(null);
const albumData = ref(null);

// 模糊搜索数据
const searchValue = ref(null);
const searchData = ref([]);

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon }, null) });
};

// 更多操作数据
const moreOptions = ref([
  {
    label: "打开源页面链接",
    key: "open",
    props: {
      onclick: () => {
        const id = albumId.value;
        if (id) window.open(`https://music.163.com/#/album?id=${id}`);
      },
    },
    icon: renderIcon("link"),
  },
]);

// 获取专辑信息
const getAlbumAllData = async (id, justDetail = false) => {
  if (!id) return false;
  // 清空数据
  albumDetail.value = null;
  if (!justDetail) albumData.value = null;
  // 获取数据
  const detail = await getAlbumDetail(id);
  // 基础信息
  albumDetail.value = formatData(detail.album, "album")[0];
  // 是否终止
  if (justDetail) return true;
  // 全部歌曲
  albumData.value = formatData(detail.songs, "song");
};

// 播放专辑全部歌曲
const playAllSongs = async () => {
  if (!albumData.value) return false;
  // 关闭心动模式
  playHeartbeatMode.value = false;
  // 更改模式和歌单
  playMode.value = "normal";
  playList.value = albumData.value.slice();
  // 是否处于专辑内
  const songId = playSongData.value?.id;
  const existingIndex = albumData.value.findIndex((song) => song.id === songId);
  // 若不处于
  if (existingIndex === -1 || !songId) {
    console.log("不在专辑内");
    playSongData.value = albumData.value[0];
    playIndex.value = 0;
    // 初始化播放器
    await initPlayer(true);
  } else {
    console.log("处于专辑内");
    playSongData.value = albumData.value[existingIndex];
    playIndex.value = existingIndex;
    // 播放
    fadePlayOrPause();
  }
  $message.info("已开始播放", { showIcon: false });
};

// 歌曲模糊搜索
const localSearch = debounce((val) => {
  const searchValue = val?.trim();
  // 是否为空
  if (!searchValue || searchValue === "") {
    return true;
  }
  // 返回结果
  const result = fuzzySearch(searchValue, albumData.value);
  searchData.value = result;
}, 300);

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const albums = userLikeData.value.albums;
  if (albums.length) {
    return !albums.some((item) => item.id === Number(id));
  }
  return true;
};

// 收藏 / 取消收藏歌单
const likeOrDislike = debounce(async (id) => {
  try {
    if (!isLogin()) return $message.warning("请登录后使用");
    const type = isLikeOrDislike(id) ? 1 : 2;
    const result = await likeAlbum(type, id);
    if (result.code === 200) {
      $message.success((type === 1 ? "收藏" : "取消收藏") + "成功");
      // 更新用户专辑
      await data.setUserLikeAlbums();
    } else {
      $message.error((type === 1 ? "收藏" : "取消收藏") + "失败，请重试");
    }
  } catch (error) {
    console.error("收藏出错：", error);
    $message.error("收藏操作出现错误");
  }
}, 300);

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name === "album") {
      albumId.value = val.query?.id;
      getAlbumAllData(albumId.value);
    }
  },
);

onBeforeMount(() => {
  getAlbumAllData(albumId.value);
});
</script>

<style lang="scss" scoped>
.album {
  .detail {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    margin-bottom: 20px;
    .cover {
      position: relative;
      display: flex;
      width: 200px;
      height: 200px;
      min-width: 200px;
      margin-right: 20px;
      border-radius: 8px;
      .cover-img {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        z-index: 1;
        transition:
          filter 0.3s,
          transform 0.3s;
        :deep(img) {
          width: 100%;
          opacity: 0;
          transition: opacity 0.35s ease-in-out;
        }
        &:active {
          transform: scale(0.98);
        }
      }
      .cover-shadow {
        position: absolute;
        top: 4px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
      }
    }
    .data {
      width: 100%;
      .name {
        font-size: 30px;
        font-weight: bold;
      }
      .alia {
        margin-top: 4px;
        font-size: 18px;
      }
      .creator {
        margin-top: 8px;
        display: flex;
        flex-direction: row;
        align-items: center;
        .ar {
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
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
      .tags {
        margin-top: 12px;
        .pl-tags {
          font-size: 13px;
          padding: 0 16px;
          line-height: 0;
          cursor: pointer;
          transition:
            transform 0.3s,
            background-color 0.3s,
            color 0.3s;
          &:hover {
            background-color: var(--main-second-color);
            color: var(--main-color);
          }
          &:active {
            transform: scale(0.95);
          }
        }
      }
      .num {
        margin-top: 12px;
        .num-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 4px;
            // color: var(--main-color);
          }
        }
      }
      .description {
        margin-top: 12px;
        margin-left: 2px;
        .n-text {
          display: initial;
        }
      }
      :deep(.n-skeleton) {
        &:first-child {
          width: 60%;
          margin-top: 0;
          height: 40px;
        }
        height: 30px;
        margin-top: 12px;
        border-radius: 8px;
      }
    }
  }
  .menu {
    align-items: center;
    margin: 26px 0;
    .left {
      align-items: center;
      .play {
        --n-width: 46px;
        --n-height: 46px;
      }
    }
    .right {
      .search {
        height: 40px;
        width: 130px;
        display: flex;
        align-items: center;
        border-radius: 40px;
        transition:
          width 0.3s,
          background-color 0.3s;
        &.n-input--focus {
          width: 200px;
        }
      }
    }
  }
}
.title {
  display: flex;
  flex-direction: column;
  .key {
    margin: 10px 0;
    font-size: 36px;
    font-weight: bold;
    margin-right: 8px;
  }
  .back {
    width: 98px;
  }
}
</style>
