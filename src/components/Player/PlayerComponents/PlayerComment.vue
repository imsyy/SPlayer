<!-- 播放器 - 评论 -->
<template>
  <div class="player-comment">
    <n-flex :wrap="false" align="center" class="song-data">
      <n-image
        :src="musicStore.songCover"
        :alt="musicStore.songCover"
        class="cover-img"
        preview-disabled
        @load="coverLoaded"
      >
        <template #placeholder>
          <div class="cover-loading">
            <img src="/images/song.jpg?asset" class="loading-img" alt="loading-img" />
          </div>
        </template>
      </n-image>
      <n-flex :size="2" class="song-info" vertical>
        <span class="title text-hidden">{{
          settingStore.hideBracketedContent
            ? removeBrackets(musicStore.playSong.name)
            : musicStore.playSong.name
        }}</span>
        <span class="artist text-hidden">
          {{
            Array.isArray(musicStore.playSong.artists)
              ? musicStore.playSong.artists.map((item) => item.name).join(" / ")
              : String(musicStore.playSong.artists)
          }}
        </span>
      </n-flex>
      <div class="actions">
        <n-flex class="close" align="center" justify="center" @click="openExcludeComment">
          <SvgIcon name="Tag" :size="20" />
        </n-flex>
        <n-flex
          class="close"
          align="center"
          justify="center"
          @click="statusStore.showPlayerComment = false"
        >
          <SvgIcon name="Music" :size="24" />
        </n-flex>
      </div>
    </n-flex>
    <n-scrollbar ref="commentScroll" class="comment-scroll">
      <template v-if="filteredCommentHotData && filteredCommentHotData.length > 0">
        <div class="placeholder">
          <div class="title">
            <SvgIcon name="Fire" />
            <span>热门评论</span>
          </div>
        </div>
        <CommentList
          :data="filteredCommentHotData"
          :loading="commentHotData?.length === 0"
          :type="songType"
          :res-id="songId"
          transparent
        />
      </template>
      <div class="placeholder">
        <div class="title">
          <SvgIcon name="Message" />
          <span>全部评论</span>
        </div>
      </div>
      <CommentList
        :data="filteredCommentData"
        :loading="commentLoading"
        :type="songType"
        :loadMore="commentHasMore"
        :res-id="songId"
        transparent
        @loadMore="loadMoreComment"
      />
      <div class="placeholder" />
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import type { CommentType } from "@/types/main";
import { useMusicStore, useStatusStore, useSettingStore } from "@/stores";
import { getComment, getHotComment } from "@/api/comment";
import { isEmpty } from "lodash-es";
import { formatCommentList, removeBrackets } from "@/utils/format";
import { NScrollbar } from "naive-ui";
import { coverLoaded } from "@/utils/helper";
import { openExcludeComment } from "@/utils/modal";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const commentScroll = ref<InstanceType<typeof NScrollbar> | null>(null);

// 是否展示
const isShowComment = computed<boolean>(() => statusStore.showPlayerComment);

// 歌曲 id
const songId = computed<number | string>(() => musicStore.playSong.id);

// 歌曲类型
const songType = computed<0 | 1 | 7 | 2 | 3 | 4 | 5 | 6>(() =>
  musicStore.playSong.type === "radio" ? 4 : 0,
);

// 评论数据
const commentLoading = ref<boolean>(true);
const commentData = ref<CommentType[]>([]);
const commentHotData = ref<CommentType[] | null>([]);
const commentPage = ref<number>(1);
const commentHasMore = ref<boolean>(true);

// 过滤后的数据
const filterComments = (comments: CommentType[] | null) => {
  if (!comments) return [];
  if (!settingStore.enableExcludeComments) return comments;
  const keywords = settingStore.excludeCommentKeywords || [];
  const regexes = settingStore.excludeCommentRegexes || [];

  if (!keywords.length && !regexes.length) return comments;

  return comments.filter((item) => {
    // 关键词过滤
    const hasKeyword = keywords.some((keyword) => item.content.includes(keyword));
    if (hasKeyword) return false;

    // 正则过滤
    const hasRegex = regexes.some((regexStr) => {
      try {
        const regex = new RegExp(regexStr);
        return regex.test(item.content);
      } catch (e) {
        return false;
      }
    });
    if (hasRegex) return false;

    return true;
  });
};

const filteredCommentData = computed(() => filterComments(commentData.value));
const filteredCommentHotData = computed(() => filterComments(commentHotData.value));

// 获取热门评论
const getHotCommentData = async () => {
  // 本地歌曲无法获取评论
  if (!songId.value || typeof songId.value !== "number") return;
  // 获取评论
  const result = await getHotComment(songId.value);
  // 处理数据
  const formatData = formatCommentList(result.hotComments);
  commentHotData.value = formatData?.length > 0 ? formatData : null;
  // 滚动到顶部
  commentScroll.value?.scrollTo({ top: 0, behavior: "smooth" });
};

// 获取歌曲评论
const getAllComment = async () => {
  // 本地歌曲无法获取评论
  if (!songId.value || typeof songId.value !== "number") return;
  commentLoading.value = true;
  // 分页参数
  const cursor =
    commentPage.value > 1 && commentData.value?.length > 0
      ? commentData.value[commentData.value.length - 1]?.time
      : undefined;
  // 获取评论
  const result = await getComment(songId.value, songType.value, commentPage.value, 20, 3, cursor);
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
};

// 加载更多
const loadMoreComment = () => {
  commentPage.value += 1;
  getAllComment();
};

// 歌曲id变化
watch(
  () => songId.value,
  () => {
    commentData.value = [];
    commentHotData.value = [];
    commentPage.value = 1;
    commentHasMore.value = true;
    if (!isShowComment.value) return;
    getHotCommentData();
    getAllComment();
  },
);

// 是否展示
watch(
  () => isShowComment.value,
  (newVal) => {
    if (!newVal) return;
    // 若不存在数据，重新获取
    if (!commentData.value?.length) {
      getHotCommentData();
      getAllComment();
    }
  },
);

onMounted(() => {
  if (!isShowComment.value) return;
  getHotCommentData();
  getAllComment();
});
</script>

<style lang="scss" scoped>
.player-comment {
  position: absolute;
  right: 0;
  width: 60%;
  flex: 1;
  width: 100%;
  height: calc(100vh - 160px);
  overflow: hidden;
  :deep(.n-text),
  :deep(.n-icon),
  :deep(.n-button) {
    color: rgb(var(--main-cover-color)) !important;
  }
  .song-data {
    height: 90px;
    margin: 0 60px 12px;
    padding: 0 16px;
    border-radius: 12px;
    background-color: rgba(var(--main-cover-color), 0.08);
    .cover-img {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      margin-right: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
    }
    .artist {
      opacity: 0.8;
    }
    .actions {
      margin-left: auto;
      display: flex;
      gap: 12px;
      .close {
        width: 40px;
        height: 40px;
        background-color: rgba(var(--main-cover-color), 0.08);
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        &:hover {
          background-color: rgba(var(--main-cover-color), 0.29);
        }
      }
    }
  }

  :deep(.comment-scroll) {
    height: calc(100vh - 262px);
    filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.2));
    mask: linear-gradient(
      180deg,
      hsla(0, 0%, 100%, 0) 0,
      hsla(0, 0%, 100%, 0.6) 2%,
      #fff 5%,
      #fff 90%,
      hsla(0, 0%, 100%, 0.6) 95%,
      hsla(0, 0%, 100%, 0)
    );
    .n-scrollbar-content {
      padding: 0 60px;
    }
    .n-skeleton {
      background-color: rgba(var(--main-cover-color), 0.08);
    }
  }
  .comment-list {
    margin: 0 auto;
    :deep(.comments) {
      .text {
        &::selection {
          color: rgb(var(--main-cover-color));
          background-color: rgba(var(--main-cover-color), 0.2);
        }
      }
    }
  }
  .placeholder {
    width: 100%;
    height: 100px;
    padding-bottom: 20px;
    display: flex;
    align-items: flex-end;
    &:last-child {
      height: 0;
      padding-top: 50%;
    }
    .title {
      display: flex;
      align-items: center;
      font-size: 22px;
      font-weight: bold;
      .n-icon {
        margin-right: 6px;
      }
    }
  }
}
</style>
