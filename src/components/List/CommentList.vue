<template>
  <Transition name="fade" mode="out-in">
    <n-flex v-if="data.length > 0" :size="20" :class="['comment-list', { transparent }]" vertical>
      <n-flex v-for="(item, index) in data" :key="index" :size="20" class="comments">
        <div v-if="!transparent" class="user">
          <div class="avatar">
            <n-image
              :src="
                item.user?.avatarUrl &&
                item.user.avatarUrl.replace(/^http:/, 'https:') + '?param=100y100'
              "
              class="cover"
              preview-disabled
              lazy
              @load="coverLoaded"
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img src="/images/avatar.jpg?assest" class="loading-img" alt="loading-img" />
                </div>
              </template>
            </n-image>
            <!-- 音乐人 -->
            <img
              v-if="item.user.isAnnualCount"
              class="annual"
              alt="annual"
              src="/images/annual.png?assest"
              title="网易音乐人"
            />
          </div>
          <!-- 会员 -->
          <img
            v-if="item.user.vipLevel && item.user.vipLevel > 0"
            :src="item.user.vipIconUrl && item.user.vipIconUrl.replace(/^http:/, 'https:')"
            class="vip"
            alt="vip"
            title="黑胶会员"
          />
        </div>
        <!-- 内容 -->
        <div class="data">
          <!-- 评论 -->
          <div class="content">
            <n-text class="name">{{ item.user.name || "未知用户名" }}：</n-text>
            <n-text class="text">{{ getContent(item.content) }}</n-text>
          </div>
          <!-- 回复 -->
          <div class="reply" v-if="item.beReplied">
            <n-text class="name" :depth="3">
              @ {{ item.beReplied.user.name || "未知用户名" }}：
            </n-text>
            <n-text class="text">{{ getContent(item.beReplied.content) }}</n-text>
          </div>
          <!-- 信息 -->
          <n-flex class="meta" align-items="center">
            <div class="item">
              <SvgIcon name="Time" :depth="3" />
              <n-text :depth="3">{{ formatCommentTime(item.time) }}</n-text>
            </div>
            <div v-if="item.ip" :title="item.ip.ip" class="item">
              <SvgIcon name="IP" :depth="3" />
              <n-text :depth="3">{{ item.ip.location }}</n-text>
            </div>
            <!-- 点赞 -->
            <div class="item like" @click="likeComment(item)">
              <SvgIcon
                :name="item?.liked ? 'ThumbUp' : 'ThumbUpOff'"
                :depth="item?.liked ? 1 : 3"
              />
              <n-text :depth="item?.liked ? 1 : 3">{{ item.likedCount }}</n-text>
            </div>
          </n-flex>
        </div>
      </n-flex>
      <!-- 加载更多 -->
      <n-flex v-if="loadMore" class="load-more" justify="center">
        <n-button :loading="loading" size="large" strong secondary round @click="emit('loadMore')">
          加载更多
        </n-button>
      </n-flex>
    </n-flex>
    <div v-else-if="loading" :class="['comment-list', { transparent }]">
      <n-skeleton :repeat="20" />
    </div>
    <!-- 空列表 -->
    <n-empty v-else description="空空如也，怎么什么都没有啊" size="large" />
  </Transition>
</template>

<script setup lang="ts">
import type { CommentType } from "@/types/main";
import { coverLoaded } from "@/utils/helper";
import { formatCommentTime } from "@/utils/time";
import { debounce } from "lodash-es";
import { isLogin } from "@/utils/auth";
import { openUserLogin } from "@/utils/modal";
import emoji from "@/assets/data/emoji.json";
import { commentLike } from "@/api/comment";

const props = defineProps<{
  data: CommentType[];
  loading: boolean;
  type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  loadMore?: boolean;
  // 透明
  transparent?: boolean;
}>();

const emit = defineEmits<{
  // 加载更多
  loadMore: [];
}>();

// 获取评论内容
const getContent = (content: string) => {
  try {
    if (!content) return;
    content = content.trim();
    // 正则
    const emojiRegex = /\[(\S+?)\]/g;
    // 替换内容为表情
    const replacedText = content.replace(emojiRegex, (match, emojiName) => {
      // 在 emojiData 中查找匹配的 emojiName 对应的 emoji
      const emojiObject = emoji.find((emoji) => emoji.emjName === emojiName);
      // 如果找到了对应的 emoji，则返回该 emoji，否则返回原始字符串
      return emojiObject ? emojiObject.emoji : match;
    });
    return replacedText;
  } catch (error) {
    console.error(error);
    return content;
  }
};

// 评论点赞
const likeComment = debounce(async (data: CommentType) => {
  if (!isLogin()) {
    openUserLogin();
    return;
  }
  // 是否点赞
  const isLiked = data.liked;
  // 点赞或取消
  const result = await commentLike(data.id, isLiked ? 2 : 1, props.type);
  if (result.code === 200) {
    data.liked = !isLiked;
    if (data.likedCount) data.likedCount += isLiked ? -1 : 1;
  } else {
    window.$message.error(result.msg || "评论点赞失败");
  }
}, 300);
</script>

<style lang="scss" scoped>
.comment-list {
  margin-bottom: 20px;
  :deep(.n-skeleton) {
    min-height: 128px;
    border-radius: 12px;
    margin-bottom: 20px;
  }
  .comments {
    min-height: 128px;
    border-radius: 12px;
    padding: 16px;
    border: 2px solid rgba(var(--primary), 0.12);
    background-color: var(--surface-container-hex);
    .user {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
      width: 60px;
      .avatar {
        position: relative;
        display: flex;
        justify-content: center;
        width: 54px;
        height: 54px;
        .cover {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          :deep(img) {
            width: 100%;
            height: 100%;
            opacity: 0;
            transition: opacity 0.35s ease-in-out;
          }
        }
        .annual {
          position: absolute;
          height: 16px;
          right: 0;
          bottom: 0;
          background-color: #fff;
          border: 1px solid #fff3;
          border-radius: 50%;
        }
      }
      .vip {
        height: 16px;
        margin-top: 12px;
      }
    }
    .data {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      .content {
        .name {
          font-weight: bold;
          cursor: pointer;
          &:hover {
            color: var(--primary-hex);
          }
        }
      }
      .reply {
        width: 100%;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 13px;
        margin-top: 6px;
        background-color: rgba(var(--primary), 0.12);
      }
      .meta {
        padding-top: 12px;
        margin-top: auto;
        .item {
          display: flex;
          align-items: center;
          .n-icon {
            font-size: 16px;
            margin-right: 4px;
          }
        }
        .like {
          margin-left: auto;
          cursor: pointer;
          &:hover {
            .n-icon,
            .n-text {
              color: var(--primary-hex);
              :deep(svg) {
                opacity: 1;
              }
            }
          }
        }
      }
    }
  }
  &.transparent {
    .comments {
      border-color: transparent;
      background-color: rgba(var(--main-color), 0.08);
      .content {
        font-size: 16px;
      }
    }
  }
}
</style>
