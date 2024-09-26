<!-- 视频 -->
<template>
  <div class="video">
    <!-- 视频信息 -->
    <Transition name="fade" mode="out-in">
      <div v-if="videoData" class="info">
        <n-h2 class="name">
          <n-ellipsis :line-clamp="1" :tooltip="{ placement: 'bottom' }">
            {{ videoData.name || "未知视频" }}
          </n-ellipsis>
        </n-h2>
        <n-flex class="meta" align="center">
          <div class="item">
            <SvgIcon name="Video" :depth="3" />
            <n-text>{{ formatNumber(videoData.playCount || 0) }}</n-text>
          </div>
          <div class="item">
            <SvgIcon name="Chat" :depth="3" />
            <n-text>{{ formatNumber(videoData.commentCount || 0) }}</n-text>
          </div>
          <div class="item">
            <SvgIcon name="Time" :depth="3" />
            <n-text>{{ formatTimestamp(videoData.updateTime || videoData.createTime) }}</n-text>
          </div>
        </n-flex>
      </div>
      <div v-else class="info">
        <n-skeleton :repeat="2" text round />
      </div>
    </Transition>
    <!-- 视频播放器 -->
    <div class="player" v-visible>
      <Transition name="fade" mode="out-in">
        <video :key="videoData?.id" ref="videoRef" />
      </Transition>
    </div>
    <!-- 菜单 -->
    <Transition name="fade" mode="out-in">
      <n-flex :key="videoData?.id" class="menu" justify="space-between" align="center">
        <div
          class="artist"
          @click="
            router.push({
              name: 'artist',
              query: { id: artistData?.id },
            })
          "
        >
          <n-avatar :src="artistData?.cover || '/images/artist.jpg?assest'" class="cover" round />
          <n-text class="name">{{ artistData?.name || "未知歌手" }}</n-text>
        </div>
        <n-flex class="control">
          <!-- 点赞 -->
          <n-button :focusable="false" quaternary>
            <template #icon>
              <SvgIcon :name="videoData?.liked ? 'ThumbUp' : 'ThumbUpOff'" />
            </template>
            {{ formatNumber(videoData?.likedCount || 0) }}
          </n-button>
          <!-- 收藏 -->
          <n-button :focusable="false" quaternary>
            <template #icon>
              <SvgIcon name="Favorite" />
              <!-- FavoriteBorder -->
            </template>
            {{ formatNumber(videoData?.subCount || 0) }}
          </n-button>
          <!-- 分享 -->
          <n-button :focusable="false" quaternary>
            <template #icon>
              <SvgIcon name="Share" />
              <!-- FavoriteBorder -->
            </template>
            {{ formatNumber(videoData?.shareCount || 0) }}
          </n-button>
        </n-flex>
      </n-flex>
    </Transition>
    <!-- 简介及标签 -->
    <Transition name="fade" mode="out-in">
      <div v-if="videoData" class="desc">
        <n-divider />
        <n-ellipsis :line-clamp="3" :tooltip="{ placement: 'bottom', width: 'trigger' }">
          {{ videoData?.description || "该视频暂无简介" }}
        </n-ellipsis>
        <n-flex v-if="videoData?.tags" class="tags">
          <n-tag v-for="(item, index) in videoData.tags" :key="index" :bordered="false" round>
            {{ item }}
          </n-tag>
        </n-flex>
        <n-divider />
      </div>
      <div v-else class="desc">
        <n-skeleton :repeat="3" text round />
      </div>
    </Transition>
    <!-- 评论 -->
    <div class="comment">
      <n-flex class="title" justify="space-between">
        <n-h3 prefix="bar">
          评论
          <n-text class="num" depth="3">{{ videoData?.commentCount || 0 }}</n-text>
        </n-h3>
        <n-flex class="tag">
          <n-tag
            v-for="(item, key, index) in commentText"
            :key="index"
            :bordered="false"
            :type="key === commentType ? 'primary' : 'default'"
            round
          >
            {{ item }}
          </n-tag>
        </n-flex>
      </n-flex>
      <CommentList
        :data="commentData"
        :loading="commentLoading"
        :type="videoType === 'mv' ? 1 : 5"
        :loadMore="commentHasMore"
        @loadMore="loadMoreComment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoverType, CommentType } from "@/types/main";
import { useStatusStore } from "@/stores";
import { videoDetail, videoUrl, videoDetailInfo } from "@/api/video";
import { formatCommentList, formatCoverList } from "@/utils/format";
import { isArray, isEmpty } from "lodash-es";
import { formatNumber } from "@/utils/helper";
import { getComment } from "@/api/comment";
import player from "@/utils/player";
// Plyr
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { formatTimestamp } from "@/utils/time";

const router = useRouter();
const statusStore = useStatusStore();

// 是否激活
const isActivated = ref<boolean>(false);

// 视频参数
const videoId = computed<number>(() => Number(router.currentRoute.value.query.id as string));
const videoType = computed<"video" | "mv">(
  () => (router.currentRoute.value.query.type as "video" | "mv") || "mv",
);

// 视频数据
const videoRef = ref<HTMLVideoElement | null>(null);
const videoData = ref<CoverType | null>(null);
const videoPlayer = ref<Plyr | null>(null);

// 评论数据
const commentLoading = ref<boolean>(true);
const commentData = ref<CommentType[]>([]);
const commentType = ref<"hot" | "new">("hot");
const commentPage = ref<number>(1);
const commentHasMore = ref<boolean>(true);
const commentText = { hot: "最热", new: "最新" };

// 歌手数据
const artistData = computed(
  () => (isArray(videoData.value?.artists) && videoData.value?.artists?.[0]) || null,
);

// 播放器配置
const playerOptions: Plyr.Options = {
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
    "pip",
    "fullscreen",
  ],
  settings: ["captions", "quality", "speed"],
  ratio: "16:9",
  invertTime: false,
  autoplay: true,
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

// 初始化播放器
const initPlayer = () => {
  videoData.value = null;
  videoPlayer.value?.destroy();
  if (videoRef.value) videoPlayer.value = new Plyr(videoRef.value, playerOptions);
  // 播放器事件
  videoPlayer.value?.on("playing", () => {
    player.pause();
  });
};

// 获取视频数据
const getVideoData = async (id: number, type: "mv" | "video") => {
  try {
    if (!id || !videoPlayer.value) return;
    // 获取视频详情
    const detail = await videoDetail(id, type);
    const detailInfo = await videoDetailInfo(id, type);
    // 处理数据
    videoData.value = formatCoverList({ ...detail.data, ...detailInfo })[0];
    // 获取视频地址
    const brs = detail.data?.brs;
    if (isEmpty(brs)) {
      window.$message.error("播放地址获取失败");
      return;
    }
    const requests = brs.map(async (v: any) => {
      try {
        const result = await videoUrl(id, type, v.br);
        return {
          src: result.data.url.replace(/^http:/, "https:"),
          type: "video/mp4",
          size: result.data.r,
        };
      } catch (error) {
        console.error("视频地址加载失败：", error);
        return null;
      }
    });
    const sources = (await Promise.all(requests)).filter((source) => source !== null);
    // 更改播放地址
    videoPlayer.value.source = {
      type: "video",
      title: videoData.value.name,
      sources,
      poster: videoData.value.cover,
    };
    // 获取评论
    getCommentData(id);
  } catch (error) {
    console.error("Error getting video data:", error);
    window.$message.error("获取视频数据失败");
  }
};

// 获取评论数据
const getCommentData = async (id: number, clean: boolean = true) => {
  try {
    if (!id) return;
    commentLoading.value = true;
    if (clean) commentData.value = [];
    // 分页参数
    const cursor =
      commentPage.value > 1 && commentData.value?.length > 0
        ? commentData.value[commentData.value.length - 1]?.time
        : undefined;
    // 获取评论
    const result = await getComment(
      id,
      videoType.value === "mv" ? 1 : 5,
      commentPage.value,
      20,
      commentType.value === "hot" ? 2 : 3,
      cursor,
    );
    if (isEmpty(result.data?.comments)) {
      commentHasMore.value = false;
      commentLoading.value = false;
      return;
    }
    // 处理数据
    const formatData = formatCommentList(result.data.comments);
    commentData.value = commentData.value.concat(formatData);
    // 是否还有
    commentHasMore.value = result.data.hasMore;
    commentLoading.value = false;
  } catch (error) {
    console.error("Error getting comment data:", error);
    window.$message.error("获取评论数据失败");
  }
};

// 加载更多评论
const loadMoreComment = () => {
  commentPage.value++;
  if (commentHasMore.value) getCommentData(videoId.value, false);
};

// 关闭音乐播放
const closeMusic = (close: boolean = true) => {
  statusStore.showPlayBar = !close;
  if (close) player.pause();
};

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    closeMusic();
    if (videoId.value !== videoData.value?.id) {
      // initPlayer();
      getVideoData(videoId.value, videoType.value);
    }
  }
});

onDeactivated(() => {
  closeMusic(false);
});

onMounted(() => {
  console.log(11);

  closeMusic();
  // 初始化播放器
  initPlayer();
  // 获取视频数据
  getVideoData(videoId.value, videoType.value);
});

onUnmounted(() => {
  closeMusic(false);
});
</script>

<style lang="scss" scoped>
.video {
  --plyr-color-main: var(--primary-hex);
  --plyr-video-control-color-hover: var(--background-hex);
  --plyr-control-radius: 8px;
  .info {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    height: 60px;
    margin: 20px 0;
    .name {
      font-size: 28px;
      font-weight: bold;
      line-height: 30px;
      margin-bottom: 8px;
    }
    .meta {
      width: 100%;
      .item {
        display: flex;
        align-items: center;
        .n-icon {
          font-size: 18px;
          margin-right: 6px;
        }
      }
    }
  }
  .player {
    position: relative;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    :deep(.plyr) {
      height: 100%;
      width: 100%;
      max-height: 520px;
      border-radius: 12px;
      .plyr__control {
        &.plyr__control--overlaid {
          opacity: 1;
          background-color: rgba(var(--primary), 0.26);
          backdrop-filter: blur(10px);
        }
        &:hover {
          background-color: rgba(var(--primary), 0.56);
        }
      }
    }
    // &.hidden {
    //   :deep(.plyr) {
    //     position: fixed;
    //     right: 40px;
    //     bottom: 40px;
    //     width: 400px;
    //     height: auto;
    //     z-index: 999;
    //   }
    // }
  }
  .menu {
    height: 40px;
    margin: 20px 0;
    .artist {
      display: flex;
      align-items: center;
      margin-left: 8px;
      cursor: pointer;
      .cover {
        margin-right: 12px;
        width: 40px;
        height: 40px;
      }
      .name {
        display: inline-flex;
        flex-direction: column;
        font-size: 16px;
        font-weight: bold;
        &::after {
          content: "查看详情";
          font-size: 12px;
          font-weight: normal;
          opacity: 0.6;
        }
      }
    }
    .n-button {
      border-radius: 8px;
    }
  }
  .desc {
    padding: 0 6px;
    margin-bottom: 20px;
    .n-divider {
      margin: 12px 0;
    }
    :deep(.n-ellipsis) {
      cursor: pointer;
    }
    .tags {
      margin-top: 4px;
    }
  }
  .comment {
    .title {
      margin-bottom: 20px;
      .n-h {
        display: inline-flex;
        align-items: center;
        margin-bottom: 0;
        .num {
          margin-left: 6px;
          font-size: 14px;
          line-height: 18px;
        }
      }
    }
  }
}
</style>
