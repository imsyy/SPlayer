<!-- 歌单页面 -->
<template>
  <div v-if="playlistId" class="playlist">
    <Transition name="fade" mode="out-in">
      <div v-if="playListDetail && Object.keys(playListDetail)?.length" class="detail">
        <div class="cover">
          <!-- 封面 -->
          <n-image
            :src="playListDetail.coverSize.l"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="playListDetail.cover"
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
          <n-image :src="playListDetail.coverSize.m" class="cover-shadow" preview-disabled />
        </div>
        <div class="data">
          <n-text class="name">
            {{
              userLikeData.playlists?.[0]?.id === playlistId
                ? "我喜欢的音乐"
                : playListDetail.name || "未知歌单"
            }}
          </n-text>
          <div class="creator">
            <n-avatar
              :src="
                (playListDetail.creator?.avatarUrl + '?param=300y$300').replace(/^http:/, 'https:')
              "
              fallback-src="/images/pic/avatar.jpg?assest"
              round
            />
            <n-text class="nickname">{{ playListDetail.creator?.nickname || "未知创建者" }}</n-text>
            <n-text v-if="playListDetail.createTime" class="create-time" depth="3">
              {{ getTimestampTime(playListDetail.createTime) }} 创建
            </n-text>
          </div>
          <!-- 标签 -->
          <n-space v-if="playListDetail?.tags" class="tags">
            <n-tag
              v-for="(item, index) in playListDetail.tags"
              :key="index"
              :bordered="false"
              class="pl-tags"
              round
              @click="
                router.push({
                  path: '/discover/playlists',
                  query: { cat: item },
                })
              "
            >
              {{ item }}
            </n-tag>
          </n-space>
          <!-- 数量 -->
          <n-space class="num">
            <div v-if="playListDetail.count" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="music-note" />
              </n-icon>
              <n-text depth="3">{{ playListDetail.count }}</n-text>
            </div>
            <div v-if="playListDetail.playCount" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="headphones" />
              </n-icon>
              <n-text depth="3">{{ formatNumber(playListDetail?.playCount || 0) }}</n-text>
            </div>
            <div v-if="playListDetail.updateTime" class="num-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="update-rounded" />
              </n-icon>
              <n-text depth="3">{{ getTimestampTime(playListDetail.updateTime) }}</n-text>
            </div>
          </n-space>
          <!-- 简介 -->
          <n-ellipsis
            v-if="playListDetail.description"
            :tooltip="false"
            class="description"
            expand-trigger="click"
            line-clamp="2"
          >
            <n-text depth="3">{{ playListDetail.description }}</n-text>
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
    <Transition name="fade" mode="out-in">
      <n-space :key="isUserPLayList" class="menu" justify="space-between">
        <n-space class="left">
          <n-button
            :disabled="playListData === 'empty'"
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
          <n-button
            v-if="!isUserPLayList"
            size="large"
            tag="div"
            round
            strong
            secondary
            @click="likeOrDislike(playlistId)"
          >
            <template #icon>
              <n-icon>
                <SvgIcon
                  :icon="
                    isLikeOrDislike(playlistId) ? 'favorite-outline-rounded' : 'favorite-rounded'
                  "
                />
              </n-icon>
            </template>
            {{ isLikeOrDislike(playlistId) ? "收藏歌单" : "取消收藏" }}
          </n-button>
          <n-button
            v-else
            size="large"
            tag="div"
            round
            strong
            secondary
            @click="playlistUpdateRef?.openUpdateModal(playListDetail)"
          >
            <template #icon>
              <n-icon>
                <SvgIcon icon="edit" />
              </n-icon>
            </template>
            编辑歌单
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
              v-if="playListData !== 'empty' && playListData?.length"
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
    </Transition>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <SongList v-if="!searchValue" :data="playListData" :sourceId="playlistId" />
      <SongList v-else-if="searchData?.length" :data="searchData" :sourceId="playlistId" />
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
    <!-- 歌单编辑 -->
    <PlaylistUpdate ref="playlistUpdateRef" @getPlayListDetailData="getPlayListDetailData" />
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
import {
  getPlayListDetail,
  getAllPlayList,
  delPlayList,
  setPlaylistPrivacy,
  likePlaylist,
} from "@/api/playlist";
import { getSongDetail } from "@/api/song";
import { formatNumber, fuzzySearch } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import { getTimestampTime } from "@/utils/timeTools";
import { fadePlayOrPause, initPlayer } from "@/utils/Player";
import debounce from "@/utils/debounce";
import formatData from "@/utils/formatData";
import SvgIcon from "@/components/Global/SvgIcon";

const router = useRouter();
const data = siteData();
const music = musicData();
const { userLikeData, userData } = storeToRefs(data);
const { playList, playIndex, playSongData, playHeartbeatMode, playMode } = storeToRefs(music);

// 歌单 ID
const playlistId = ref(
  router.currentRoute.value.name === "like-songs"
    ? userLikeData.value.playlists?.[0]?.id || null
    : router.currentRoute.value.query.id,
);

// 子组件
const playlistUpdateRef = ref(null);

// 歌单数据
const isUserPLayList = ref(false);
const playListDetail = ref(null);
const playListData = ref(null);

// 模糊搜索数据
const searchValue = ref(null);
const searchData = ref([]);

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon }, null) });
};

// 更多操作数据
const moreOptions = ref([]);

// 更改更多操作数据
const changeMoreOptions = (detail) => {
  moreOptions.value = [
    {
      label: "公开隐私歌单",
      key: "privacy",
      show: detail?.privacy === 10 ? true : false,
      props: {
        onclick: () => {
          setPlaylistPrivacyData(playlistId.value);
        },
      },
      icon: renderIcon("list-lock-open"),
    },
    {
      label: "删除歌单",
      key: "delete",
      show: detail?.userId === userData.value?.userId ? true : false,
      props: {
        onclick: () => {
          deletePlayList();
        },
      },
      icon: renderIcon("delete"),
    },
    {
      label: "打开源页面链接",
      key: "open",
      props: {
        onclick: () => {
          const id = playlistId.value;
          if (id) window.open(`https://music.163.com/#/playlist?id=${id}`);
        },
      },
      icon: renderIcon("link"),
    },
  ];
};

// 获取歌单信息
const getPlayListDetailData = async (id, justDetail = false) => {
  if (!id) return false;
  // 清空数据
  playListDetail.value = null;
  if (!justDetail) playListData.value = null;
  // 获取数据
  const detail = await getPlayListDetail(id);
  // 基础信息
  playListDetail.value = formatData(detail.playlist, "playlist", true)[0];
  // 更改更多操作数据
  changeMoreOptions(detail.playlist);
  // 是否终止
  if (justDetail) return true;
  // 是否为用户歌单
  isUserPLayList.value = detail.playlist.userId === userData.value?.userId;
  // 判断登录
  if (isLogin() && isUserPLayList.value) {
    if (!detail.privileges) {
      playListData.value = "empty";
      return false;
    }
    const ids = detail.privileges.map((song) => song.id).join(",");
    const songsDetail = await getSongDetail(ids);
    console.log(songsDetail);
    playListData.value = formatData(songsDetail.songs, "song");
  } else {
    const limit = detail.playlist.trackCount || 0;
    const songsDetail = await getAllPlayList(id, limit);
    console.log(songsDetail);
    playListData.value = formatData(songsDetail.songs, "song");
  }
};

// 播放歌单全部歌曲
const playAllSongs = async () => {
  if (!playListData.value) return false;
  // 关闭心动模式
  playHeartbeatMode.value = false;
  // 更改模式和歌单
  playMode.value = "normal";
  playList.value = playListData.value.slice();
  // 是否处于歌单内
  const songId = music.getPlaySongData?.id;
  const existingIndex = playListData.value.findIndex((song) => song.id === songId);
  // 若不处于
  if (existingIndex === -1 || !songId) {
    console.log("不在歌单内");
    playSongData.value = playListData.value[0];
    playIndex.value = 0;
    // 初始化播放器
    await initPlayer(true);
  } else {
    console.log("处于歌单内");
    playSongData.value = playListData.value[existingIndex];
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
  const result = fuzzySearch(searchValue, playListData.value);
  searchData.value = result;
}, 300);

// 删除歌单
const deletePlayList = () => {
  if (router.currentRoute.value.name === "like-songs") {
    $message.warning("系统默认歌单无法删除");
    return false;
  }
  // 歌单 id
  $dialog.warning({
    title: "删除歌单",
    content: "确认删除这个歌单？该操作无法撤销！",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const result = await delPlayList(playlistId.value);
      if (result.code === 200) {
        $message.success("歌单删除成功");
        // 更新用户歌单
        await data.setUserLikePlaylists();
      }
    },
  });
};

// 公开隐私歌单
const setPlaylistPrivacyData = async (id) => {
  $dialog.warning({
    title: "公开歌单",
    content: "公开后将无法恢复为隐私歌单，是否确定将歌单公开？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      const result = await setPlaylistPrivacy(id);
      if (result.code === 200) {
        $message.success("歌单已公开");
        // 更新用户歌单
        await getPlayListDetailData(id);
      }
    },
  });
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const playlists = userLikeData.value.playlists;
  if (playlists.length) {
    return !playlists.some((item) => item.id === Number(id));
  }
  return true;
};

// 收藏 / 取消收藏歌单
const likeOrDislike = debounce(async (id) => {
  try {
    if (!isLogin()) return $message.warning("请登录后使用");
    const type = isLikeOrDislike(id) ? 1 : 2;
    const result = await likePlaylist(type, id);
    if (result.code === 200) {
      $message.success((type === 1 ? "收藏" : "取消收藏") + "成功");
      // 更新用户歌单
      await data.setUserLikePlaylists();
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
  async (val) => {
    if (val.name === "playlist" || val.name === "like-songs") {
      playlistId.value =
        router.currentRoute.value.name === "like-songs"
          ? userLikeData.value.playlists?.[0]?.id || null
          : val.query?.id;
      await getPlayListDetailData(playlistId.value);
    }
  },
);

onBeforeMount(async () => {
  await getPlayListDetailData(playlistId.value);
});
</script>

<style lang="scss" scoped>
.playlist {
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
        margin-bottom: 12px;
      }
      .creator {
        display: flex;
        flex-direction: row;
        align-items: center;
        .n-avatar {
          width: 28px;
          height: 28px;
          margin-right: 8px;
        }
        .nickname {
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
        }
        .create-time {
          margin-left: 12px;
          font-size: 13px;
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
