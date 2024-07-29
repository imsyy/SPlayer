<!-- 歌曲评论 -->
<template>
  <div class="comment">
    <!-- 歌曲信息 -->
    <Transition name="fade" mode="out-in">
      <n-card
        :key="songId"
        :content-style="{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '16px',
          height: '100%',
        }"
        class="song-detail"
      >
        <n-image
          :src="songDetail?.coverSize?.s || songDetail?.cover"
          class="cover-img"
          preview-disabled
          @load="
            (e) => {
              e.target.style.opacity = 1;
            }
          "
        >
          <template #placeholder>
            <div class="cover-loading">
              <img class="loading-img" src="/imgs/pic/song.jpg?assest" alt="loading-img" />
            </div>
          </template>
        </n-image>
        <div class="content">
          <div class="name">{{ songDetail?.name || "未知曲目" }}</div>
          <div v-if="commentType === 'normal'" class="artist">
            <n-icon depth="3" size="20">
              <SvgIcon icon="account-music" />
            </n-icon>
            <div v-if="songDetail?.artists && Array.isArray(songDetail?.artists)" class="all-ar">
              <span v-for="ar in songDetail.artists" :key="ar.id" class="ar">
                {{ ar.name }}
              </span>
            </div>
            <div v-else class="all-ar">
              <span class="ar"> {{ songDetail?.artists || "未知艺术家" }} </span>
            </div>
          </div>
          <div v-else-if="songDetail?.creator" class="artist dj">
            <n-icon depth="3" size="20">
              <SvgIcon icon="record" />
            </n-icon>
            <span class="all-ar dj-name">
              {{ songDetail.creator?.brand || "未知电台" }}
            </span>
          </div>
        </div>
      </n-card>
    </Transition>
    <!-- 所有评论 -->
    <Transition name="fade" mode="out-in">
      <div v-if="commentData !== 'empty'" class="all-comments">
        <!-- 评论跳转 -->
        <div id="to-comments" />
        <!-- 热门评论 -->
        <template v-if="commentPage === 1 && hotCommentData !== 'no-comment'">
          <n-h6 class="title" prefix="bar">热门评论 </n-h6>
          <CommentList :data="hotCommentData" :loadingNum="10" />
        </template>
        <!-- 全部评论 -->
        <n-h6 class="title" prefix="bar">
          <n-text>全部评论</n-text>
          <n-text v-if="commentData?.totalCount" class="num" depth="3">
            {{ commentData.totalCount }} +
          </n-text>
        </n-h6>
        <CommentList :data="commentData?.comments" />
        <!-- 分页 -->
        <Pagination
          :totalCount="commentData?.totalCount"
          :pageNumber="commentPage"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <n-empty
        v-else
        :description="`很抱歉，该歌曲暂无评论`"
        style="margin-top: 60px"
        size="large"
      />
    </Transition>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getSongDetail } from "@/api/song";
import { getDjProgramDetail } from "@/api/dj";
import { getComment, getHotComment, commentDj } from "@/api/comment";
import formatData from "@/utils/formatData";

const router = useRouter();

// 歌曲 id
const songId = ref(router.currentRoute.value.query.id);

// 评论类型
const commentType = ref(router.currentRoute.value.query.type || "normal");

// 歌曲信息
const songDetail = ref(null);

// 评论数据
const commentPage = ref(1);
const commentData = ref(null);
const hotCommentData = ref(null);

// 获取歌曲详情
const getSongDetailData = async (id) => {
  try {
    if (commentType.value === "normal") {
      const detail = await getSongDetail(id);
      const data = formatData(detail?.songs?.[0], "song");
      songDetail.value = data?.[0] ?? null;
    } else if (commentType.value === "dj") {
      const detail = await getDjProgramDetail(id);
      const data = formatData(detail?.program, "dj");
      songDetail.value = data?.[0] ?? null;
    }
  } catch (error) {
    console.error("获取歌曲详情失败：", error);
  }
};

// 获取评论数据
const getCommentData = async (id, pageNo = 1, sortType = 3, pageSize = 20) => {
  try {
    // 计算 cursor
    const cursor =
      pageNo !== 1 && commentData.value?.cursor !== "0" ? commentData.value.cursor : null;
    // 获取热门评论和普通评论
    if (commentType.value === "normal") {
      const [hotComments, comments] = await Promise.all([
        pageNo === 1 ? getHotComment(id, 0, 10) : null,
        getComment(id, 0, pageNo, sortType, pageSize, cursor),
      ]);
      // 更新数据
      if (comments?.data.totalCount === 0) return (commentData.value = "empty");
      commentData.value = comments?.data;
      hotCommentData.value = hotComments?.hotComments?.[0] ? hotComments.hotComments : "no-comment";
    } else if (commentType.value === "dj") {
      const offset = (pageNo - 1) * pageSize;
      const { hotComments, comments, total } = await commentDj(id, pageSize, offset, cursor);
      // 更新数据
      if (total === 0) return (commentData.value = "empty");
      commentData.value = { totalCount: comments?.length, comments };
      hotCommentData.value = hotComments?.[0] ? hotComments : "no-comment";
      console.log(commentData.value, hotCommentData.value);
    }
  } catch (error) {
    console.error("获取评论数据出错：", error);
    $message.error("获取评论数据出错");
  }
};

// 评论分页变化
const pageNumberChange = async (page) => {
  commentPage.value = page;
  await getCommentData(router.currentRoute.value.query.id, page);
  scrollToComment();
};

// 滚动至评论
const scrollToComment = () => {
  const commentDom = document.getElementById("to-comments");
  if (commentDom) {
    commentDom.scrollIntoView({ behavior: "smooth" });
  }
};

// 检查是否具有 id
const isHasCommentId = (id) => {
  if (!id) {
    $message.error("参数不完整");
    return router.go(-1);
  }
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name == "comment") {
      commentPage.value = 1;
      commentData.value = null;
      hotCommentData.value = null;
      getSongDetailData(val.query.id);
      getCommentData(val.query.id);
    }
  },
);

onMounted(() => {
  // 若无 id
  isHasCommentId(songId.value);
  // 获取歌曲详情
  getSongDetailData(songId.value);
  // 获取评论
  getCommentData(songId.value);
});
</script>

<style lang="scss" scoped>
.comment {
  .song-detail {
    height: 100px;
    border-radius: 8px;
    .cover-img {
      width: 66px;
      height: 66px;
      margin-right: 16px;
      border-radius: 8px;
      overflow: hidden;
      z-index: 1;
      box-shadow: 0 0 10px 6px #00000008;
      transition: opacity 0.1s ease-in-out;
      :deep(img) {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
    }
    .content {
      .name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      .artist {
        display: flex;
        align-items: center;
        .n-icon {
          margin-right: 4px;
        }
        .all-ar {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
          word-break: break-all;
          .ar {
            display: inline-flex;
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
    }
  }
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
</style>
