<!-- 视频 - 播放页 -->
<template>
  <div class="video-player">
    <div class="player">
      <!-- 视频信息 -->
      <Transition name="fade" mode="out-in">
        <div v-if="videoData" class="detail">
          <n-text class="title">{{ videoData.name }}</n-text>
          <n-flex class="detail-tag">
            <!-- 播放量 -->
            <div v-if="videoData?.playCount" class="tag-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="video" />
              </n-icon>
              <n-text depth="3">{{ formatNumber(videoData.playCount) }}</n-text>
            </div>
            <!-- 评论量 -->
            <div
              v-if="videoData?.commentCount"
              class="tag-item"
              style="cursor: pointer"
              @click="scrollToComment"
            >
              <n-icon depth="3" size="16">
                <SvgIcon icon="comment-text-multiple" />
              </n-icon>
              <n-text depth="3">{{ formatNumber(videoData.commentCount) }}</n-text>
            </div>
            <!-- 发布时间 -->
            <div v-if="videoData?.publishTime" class="tag-item">
              <n-icon depth="3" size="18">
                <SvgIcon icon="clock" />
              </n-icon>
              <n-text depth="3">{{ videoData.publishTime }}</n-text>
            </div>
          </n-flex>
        </div>
        <div v-else class="detail">
          <n-skeleton :repeat="2" text round />
        </div>
      </Transition>
      <!-- 视频播放器 -->
      <Transition name="fade" mode="out-in">
        <video :key="videoData?.id" ref="videoRef" class="plyr" />
      </Transition>
      <!-- 详细信息 -->
      <Transition name="fade" mode="out-in">
        <div :key="videoData?.id" class="menu">
          <!-- 点赞 -->
          <n-button quaternary @click="videoLike">
            <template #icon>
              <n-icon>
                <SvgIcon :icon="videoData?.liked ? 'thumb-up' : 'thumb-up-outline'" />
              </n-icon>
            </template>
            {{
              videoData?.liked
                ? videoData?.likedCount || 0
                : formatNumber(videoData?.likedCount || 0)
            }}
          </n-button>
          <!-- 收藏 -->
          <n-button quaternary @click="videoCollection">
            <template #icon>
              <n-icon>
                <SvgIcon
                  :icon="
                    isLikeOrDislike(videoData?.id) ? 'favorite-outline-rounded' : 'favorite-rounded'
                  "
                />
              </n-icon>
            </template>
            {{
              isLikeOrDislike(videoData?.id)
                ? formatNumber(videoData?.subCount || 0)
                : videoData?.subCount || 0
            }}
          </n-button>
          <!-- 分享 -->
          <n-button quaternary>
            <template #icon>
              <n-icon>
                <SvgIcon icon="share" />
              </n-icon>
            </template>
            {{ formatNumber(videoData?.shareCount || 0) }}
          </n-button>
          <!-- 更多操作 -->
          <n-dropdown :options="moreOptions" trigger="hover" placement="bottom-end">
            <n-button class="more" quaternary>
              <template #icon>
                <n-icon>
                  <SvgIcon icon="format-list-bulleted" />
                </n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </div>
      </Transition>
      <!-- 简介及标签 -->
      <Transition name="fade" mode="out-in">
        <div v-if="videoData" class="content">
          <n-divider />
          <n-ellipsis
            v-if="videoData?.desc"
            :tooltip="false"
            class="video-desc"
            expand-trigger="click"
            line-clamp="3"
          >
            {{ videoData.desc }}
          </n-ellipsis>
          <n-text v-else>该视频暂无简介</n-text>
          <n-flex v-if="videoData?.videoGroup" class="video-tag">
            <n-tag
              v-for="(item, index) in videoData?.videoGroup"
              :key="index"
              :bordered="false"
              class="video-tags"
              round
            >
              {{ item.name }}
            </n-tag>
          </n-flex>
          <n-divider id="to-comments" />
        </div>
        <div v-else class="content">
          <n-skeleton :repeat="3" text round />
        </div>
      </Transition>
      <!-- 视频评论 -->
      <div class="comments">
        <!-- 热门评论 -->
        <template v-if="commentPage === 1 && hotCommentData !== 'no-comment'">
          <n-h6 class="title" prefix="bar">热门评论 </n-h6>
          <CommentList :data="hotCommentData" :loadingNum="10" type="mv" />
        </template>
        <!-- 全部评论 -->
        <n-h6 class="title" prefix="bar">
          <n-text>全部评论</n-text>
          <n-text v-if="commentData?.totalCount" class="num" depth="3">
            {{ commentData.totalCount }} +
          </n-text>
        </n-h6>
        <CommentList :data="commentData?.comments" type="mv" />
        <!-- 分页 -->
        <Pagination
          :totalCount="commentData?.totalCount"
          :pageNumber="commentPage"
          @pageNumberChange="pageNumberChange"
        />
      </div>
    </div>
    <div class="video-more">
      <!-- 歌手信息 -->
      <Transition name="fade" mode="out-in">
        <div v-if="videoData?.artists" class="artist-detail">
          <n-h6 prefix="bar"> 歌手信息 </n-h6>
          <n-card
            v-for="(item, index) in videoData.artists"
            :key="index"
            :content-style="{ display: 'flex', alignItems: 'center', padding: '16px' }"
            class="artists"
          >
            <n-image
              :src="item?.img1v1Url?.replace(/^http:/, 'https:') + '?param=100y100'"
              class="cover"
              preview-disabled
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img class="loading-img" src="/images/pic/avatar.jpg?assest" alt="song" />
                </div>
              </template>
            </n-image>
            <div class="desc">
              <n-text class="name">{{ item.name }}</n-text>
              <n-button
                class="open"
                size="small"
                tertiary
                round
                @click="router.push(`/artist?id=${item.id}`)"
              >
                <template #icon>
                  <n-icon size="14">
                    <SvgIcon icon="account-music" />
                  </n-icon>
                </template>
                歌手详情
              </n-button>
            </div>
          </n-card>
        </div>
        <div v-else class="artist-detail">
          <n-h6 prefix="bar"> 歌手信息 </n-h6>
          <n-skeleton class="artists" />
        </div>
      </Transition>
      <!-- 相关视频 -->
      <div class="simi-video">
        <n-h6 prefix="bar"> 相关视频 </n-h6>
        <!-- 列表 -->
        <MainCover :data="simiVideo" columns="1" type="mv" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { storeToRefs } from "pinia";
import {
  getVideoDetail,
  getVideoInfo,
  getVideoUrl,
  getSimiVideo,
  likeVideo,
  likeMv,
} from "@/api/video";
import { getComment, getHotComment } from "@/api/comment";
import { resourceLike } from "@/api/other";
import { fadePlayOrPause } from "@/utils/Player";
import { siteStatus, siteData } from "@/stores";
import { useRouter } from "vue-router";
import { formatNumber } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import formatData from "@/utils/formatData";
import throttle from "@/utils/throttle";
import SvgIcon from "@/components/Global/SvgIcon";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

const data = siteData();
const status = siteStatus();
const router = useRouter();
const { userLikeData } = storeToRefs(data);

// 视频 id
const videoId = ref(router.currentRoute.value.query.id);
const isVideo = ref(router.currentRoute.value.query.is_video);

// 播放器数据
const videoData = ref(null);
const videoRef = ref(null);
const player = ref(null);

// 相关视频
const simiVideo = ref(null);

// 评论数据
const commentPage = ref(1);
const commentData = ref(null);
const hotCommentData = ref(null);

// 播放器配置
const playerOptions = {
  controls: [
    "play-large",
    "play",
    "progress",
    "current-time",
    "mute",
    "volume",
    "captions",
    "settings",
    "airplay",
    "fullscreen",
  ],
  settings: ["captions", "quality", "speed"],
  ratio: "16:9",
  invertTime: false,
  autoplay: false,
  quality: {
    default: 1080,
    options: [1080, 720, 480, 240],
  },
  i18n: {
    play: "播放",
    pause: "暂停",
    speed: "速度",
    settings: "设置",
    normal: "正常",
    quality: "画质",
    pip: "画中画",
    enterFullscreen: "开启全屏",
    exitFullscreen: "退出全屏",
    mute: "音量",
    unmute: "静音",
  },
  tooltips: {
    controls: true,
  },
};

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon }, null) });
};

// 更多操作数据
const moreOptions = [
  {
    label: "打开源页面链接",
    key: "open",
    props: {
      onclick: () => {
        window.open(`https://music.163.com/#/mv?id=${videoId.value}`);
      },
    },
    icon: renderIcon("link"),
  },
];

// 初始化播放器
const initPlayer = () => {
  player.value?.destroy();
  player.value = new Plyr(videoRef.value, playerOptions);
  // 播放器事件
  player.value?.on("playing", async () => {
    status.showPlayBar = false;
    fadePlayOrPause("pause");
  });
  player.value?.on("pause", async () => {
    status.showPlayBar = true;
  });
};

// 获取视频数据
const getVideoData = async (id) => {
  try {
    if (!id) return false;
    // 获取视频详情
    const videoDetail = await getVideoDetail(id);
    const videoInfo = await getVideoInfo(id);
    videoData.value = { ...videoDetail.data, ...videoInfo };
    // 获取视频地址
    const requests = videoDetail.data.brs.map(async (v) => {
      try {
        const result = await getVideoUrl(id, v.br);
        return {
          src: result.data.url.replace(/^http:/, "https:"),
          type: "video/mp4",
          size: result.data.r,
        };
      } catch (urlError) {
        console.error("视频地址加载失败：", urlError);
        throw urlError;
      }
    });
    const sources = await Promise.all(requests);
    // 播放器配置
    player.value.source = {
      type: "video",
      title: videoData.value.name,
      sources,
      poster: videoData.value.cover.replace(/^http:/, "https:"),
    };
    // 获取相关视频
    getSimiVideoData(id);
    // 获取评论
    getCommentData(id);
  } catch (detailError) {
    console.error("视频详情加载失败：", detailError);
    $message.error("视频详情加载失败");
  }
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const mvs = userLikeData.value.mvs;
  if (mvs.length) {
    return !mvs.some((item) => Number(item.vid) === Number(id));
  }
  return true;
};

// 获取相关视频
const getSimiVideoData = async (id) => {
  simiVideo.value = null;
  const result = await getSimiVideo(id);
  // 处理数据
  simiVideo.value = formatData(result.mvs, "mv");
};

// 视频点赞
const videoLike = throttle(
  async () => {
    try {
      if (!isLogin()) return $message.warning("请登录后使用");
      const isLike = videoData.value?.liked;
      if (isLike === undefined || !videoData.value?.id) return false;
      // 点赞或取消
      const result = await resourceLike(videoData.value.id, isLike ? 2 : 1, 1);
      if (result.code === 200) {
        const videoInfo = await getVideoInfo(videoData.value.id);
        videoData.value.liked = videoInfo.liked;
        videoData.value.likedCount = videoInfo.likedCount;
      }
    } catch (error) {
      console.error("点赞出错：", error);
    }
  },
  3000,
  "请稍后再操作",
);

// 视频收藏
const videoCollection = throttle(
  async () => {
    try {
      if (!isLogin()) return $message.warning("请登录后使用");
      const id = videoData.value.id;
      const type = isLikeOrDislike(id) ? 1 : 2;
      const result = isVideo.value ? await likeVideo(type, id) : await likeMv(type, id);
      if (result.code === 200) {
        $message.success((type === 1 ? "收藏" : "取消收藏") + "成功");
        // 更新用户专辑
        if (!isVideo.value) await data.setUserLikeMvs();
      } else {
        $message.error((type === 1 ? "收藏" : "取消收藏") + "失败，请重试");
      }
    } catch (error) {
      console.error("收藏出错：", error);
      $message.error("收藏操作出现错误");
    }
  },
  3000,
  "请稍后再操作",
);

// 获取评论数据
const getCommentData = async (id, pageNo = 1, sortType = 3, pageSize = 20) => {
  try {
    // 计算 cursor
    const cursor =
      pageNo !== 1 && commentData.value?.cursor !== "0" ? commentData.value.cursor : null;
    // 获取热门评论和普通评论
    const [hotComments, comments] = await Promise.all([
      pageNo === 1 ? getHotComment(id, 1, 10) : null,
      getComment(id, 1, pageNo, sortType, pageSize, cursor),
    ]);
    // 更新数据
    commentData.value = comments?.data;
    hotCommentData.value = hotComments?.hotComments?.[0] ? hotComments.hotComments : "no-comment";
  } catch (error) {
    console.error("获取评论数据出错：", error);
    $message.error("获取评论数据出错");
  }
};

// 滚动至评论
const scrollToComment = () => {
  const commentDom = document.getElementById("to-comments");
  if (commentDom) {
    commentDom.scrollIntoView({ behavior: "smooth" });
  }
};

// 评论分页变化
const pageNumberChange = async (page) => {
  commentPage.value = page;
  await getCommentData(router.currentRoute.value.query.id, page);
  scrollToComment();
};

// 检查是否具有视频 id
const isHasVideoId = (id) => {
  if (!id) {
    $message.error("参数不完整");
    return router.go(-1);
  }
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name == "videos-player") {
      videoData.value = null;
      simiVideo.value = null;
      videoId.value = val.query.id;
      isVideo.value = val.query.is_video;
      commentData.value = null;
      hotCommentData.value = null;
      commentPage.value = 1;
      isHasVideoId(val.query.id);
      getVideoData(videoId.value);
    }
  },
);

onMounted(() => {
  // 若无 id
  isHasVideoId(videoId.value);
  // 初始化播放器
  initPlayer();
  // 获取视频数据
  getVideoData(videoId.value);
});

onBeforeUnmount(() => {
  status.showPlayBar = true;
});
</script>

<style lang="scss" scoped>
.video-player {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: row;
  --plyr-color-main: var(--main-color);
  --plyr-control-radius: 8px;
  .player {
    flex: 1;
    :deep(.plyr) {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
    }
    .detail {
      height: 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      margin-bottom: 20px;
      .title {
        margin: 0 0 6px 6px;
        font-size: 22px;
        font-weight: bold;
      }
      .detail-tag {
        margin-left: 6px;
        .tag-item {
          display: flex;
          align-items: center;
          flex-direction: row;
          .n-icon {
            margin-right: 4px;
          }
        }
      }
    }
    .menu {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-top: 16px;
      .n-button {
        border-radius: 8px;
        margin-right: 12px;
      }
      .more {
        margin-right: 0;
        margin-left: auto;
      }
    }
    .content {
      margin-top: 12px;
      padding: 0 6px;
      .n-divider {
        margin: 12px 0;
      }
      .video-tag {
        margin-top: 12px;
        .video-tags {
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
    }
    .comments {
      margin-top: 24px;
      .title {
        margin-left: 6px;
        display: flex;
        align-items: center;
        .num {
          font-size: 12px;
          margin-left: 6px;
        }
      }
    }
  }
  .video-more {
    width: 280px;
    margin: 36px 0 0 24px;
    .artists {
      height: 94px;
      border-radius: 8px;
      margin-bottom: 20px;
      .cover {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        margin-right: 16px;
        box-shadow: 0 0 6px 4px #00000024;
        .cover-loading {
          border-radius: 50%;
        }
      }
      .desc {
        .name {
          font-size: 16px;
          font-weight: bold;
          margin-left: 2px;
          margin-bottom: 6px;
        }
        .open {
          font-size: 13px;
        }
      }
    }
    .simi-video {
      position: sticky;
      top: 20px;
      margin-top: 36px;
    }
  }
  @media (max-width: 700px) {
    .player {
      width: 100%;
      .detail {
        height: 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        margin-bottom: 20px;
        .title {
          display: inline-block;
          margin: 0;
          -webkit-line-clamp: 2;
        }
      }
    }
    .video-more {
      display: none;
    }
  }
}
</style>
