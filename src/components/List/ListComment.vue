<!-- 列表评论 -->
<template>
  <div ref="commentListRef" class="list-comment">
    <div
      :style="{ height: height === 'auto' ? 'auto' : `${height || commentListHeight}px` }"
      class="comment-container"
    >
      <n-scrollbar class="comment-scroll">
        <div class="comment-content">
          <template v-if="commentHotData">
            <div class="placeholder">
              <div class="title">
                <SvgIcon name="Fire" />
                <span>热门评论</span>
              </div>
            </div>
            <CommentList
              :data="commentHotData"
              :loading="commentHotData?.length === 0"
              :type="type"
              :res-id="id"
            />
          </template>
          <div class="placeholder">
            <div class="title">
              <SvgIcon name="Message" />
              <span>全部评论</span>
            </div>
          </div>
          <CommentList
            :data="commentData"
            :loading="commentLoading"
            :type="type"
            :load-more="commentHasMore"
            :res-id="id"
            @load-more="handleLoadMore"
          />
          <div class="placeholder" />
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentType } from "@/types/main";
import CommentList from "@/components/List/CommentList.vue";
import { useElementSize } from "@vueuse/core";
import { getComment, getHotComment } from "@/api/comment";
import { formatCommentList } from "@/utils/format";
import { isEmpty } from "lodash-es";

const props = withDefaults(
  defineProps<{
    // 资源 ID
    id: number;
    // 评论类型 0: 歌曲, 1: mv, 2: 歌单, 3: 专辑, 4: 电台节目, 5: 视频, 6: 动态, 7: 电台
    type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    // 高度
    height?: number | "auto"; // px
  }>(),
  {},
);

const commentListRef = ref<HTMLElement | null>(null);

// 列表高度
const { height: commentListHeight, stop: stopCalcHeight } = useElementSize(commentListRef);

// 评论数据
const commentLoading = ref<boolean>(false);
const commentData = ref<CommentType[]>([]);
const commentHotData = ref<CommentType[] | null>(null);
const commentPage = ref<number>(1);
const commentHasMore = ref<boolean>(true);

// 获取热门评论
const getHotCommentData = async () => {
  if (!props.id) return;
  try {
    const result = await getHotComment(props.id, props.type);
    const formatData = formatCommentList(result.hotComments);
    commentHotData.value = formatData?.length > 0 ? formatData : null;
  } catch (error) {
    console.error("Error getting hot comment data:", error);
    commentHotData.value = null;
  }
};

// 获取评论数据
const getCommentData = async (clean: boolean = true) => {
  if (!props.id) return;
  try {
    commentLoading.value = true;
    if (clean) {
      commentData.value = [];
      commentPage.value = 1;
      commentHasMore.value = true;
    }
    // 获取热门评论
    await getHotCommentData();
    // 分页参数
    const cursor =
      commentPage.value > 1 && commentData.value?.length > 0
        ? commentData.value[commentData.value.length - 1]?.time
        : undefined;
    // 获取评论
    const result = await getComment(props.id, props.type, commentPage.value, 20, 3, cursor);
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
    commentLoading.value = false;
  }
};

// 加载更多评论
const handleLoadMore = () => {
  if (!commentHasMore.value || commentLoading.value) return;
  commentPage.value += 1;
  getCommentData(false);
};

// 监听 id 变化，重置评论数据
watch(
  () => props.id,
  (newId) => {
    if (newId) {
      commentData.value = [];
      commentHotData.value = null;
      commentPage.value = 1;
      commentHasMore.value = true;
      getCommentData();
    }
  },
  { immediate: true },
);

// 如果高度是 auto，停止计算高度
watch(
  () => props.height,
  (newHeight) => {
    if (newHeight === "auto") stopCalcHeight();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.list-comment {
  height: 100%;
  .title {
    display: flex;
    align-items: center;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
    .n-icon {
      margin-right: 8px;
      font-size: 20px;
    }
  }
}
</style>
