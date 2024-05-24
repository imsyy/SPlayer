<!-- 评论列表 -->
<template>
  <Transition name="fade" mode="out-in">
    <div v-if="data?.length" class="comment-list">
      <n-grid cols="1 1200:2" x-gap="20" y-gap="20">
        <n-gi v-for="(item, index) in data" :key="index">
          <n-card
            :content-style="{ display: 'flex', flexDirection: 'row', padding: '16px' }"
            class="comments"
          >
            <!-- 用户信息 -->
            <div class="user">
              <!-- 头像 -->
              <div class="avatar">
                <n-image
                  :src="item.user?.avatarUrl.replace(/^http:/, 'https:') + '?param=100y100'"
                  class="cover"
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
                      <img class="loading-img" src="/imgs/pic/avatar.png?assest" alt="avatar" />
                    </div>
                  </template>
                </n-image>
                <!-- 网易音乐人 -->
                <img
                  v-if="item.user.vipRights?.redVipAnnualCount > 0"
                  class="package"
                  :src="item.user.vipRights.musicPackage?.iconUrl.replace(/^http:/, 'https:')"
                  title="网易音乐人"
                />
              </div>
              <!-- 特权 -->
              <div v-if="item.user.vipRights?.redVipLevel > 0" class="associator">
                <img
                  v-if="item.user.vipRights.associator"
                  :src="item.user.vipRights.associator.iconUrl.replace(/^http:/, 'https:')"
                  alt="associator"
                  title="黑胶会员"
                />
              </div>
            </div>
            <!-- 内容 -->
            <div class="content">
              <!-- 评论 -->
              <div class="review">
                <span class="name">{{ item.user?.nickname || "未知用户名" }}：</span>
                <span class="text">{{ getCommentText(item?.content) }}</span>
              </div>
              <!-- 回复 -->
              <div v-if="item.beReplied?.length" class="recover">
                <span class="name">@ {{ item.beReplied[0].user.nickname }}：</span>
                <span class="text">{{ getCommentText(item.beReplied[0].content) }}</span>
              </div>
              <!-- 功能区 -->
              <div class="menu">
                <!-- 时间 -->
                <div v-if="item?.time" class="menu-item">
                  <n-icon depth="3" size="16">
                    <SvgIcon icon="clock" />
                  </n-icon>
                  <n-text depth="3">{{ getCommentTime(item.time) }}</n-text>
                </div>
                <!-- 位置 -->
                <div v-if="item.ipLocation?.location" class="menu-item">
                  <n-icon depth="3" size="18">
                    <SvgIcon icon="ip" />
                  </n-icon>
                  <n-text depth="3">{{ item.ipLocation.location }}</n-text>
                </div>
                <!-- 点赞 -->
                <div
                  :class="['menu-item', 'like', item?.liked ? 'liked' : null]"
                  @click="toLikeComment(item)"
                >
                  <n-icon size="18">
                    <SvgIcon :icon="item?.liked ? 'thumb-up' : 'thumb-up-outline'" />
                  </n-icon>
                  <span>
                    {{ item?.liked ? item?.likedCount || 0 : formatNumber(item?.likedCount || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </div>
    <!-- <div v-if="data?.length" class="comment-list"></div> -->
    <div v-else class="comment-list">
      <n-skeleton v-for="item in loadingNum" :key="item" class="comments" />
    </div>
  </Transition>
</template>

<script setup>
import { useRouter } from "vue-router";
import { likeComment } from "@/api/comment";
import { getCommentTime } from "@/utils/timeTools";
import { formatNumber } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import emojiData from "@/assets/emoji.json";
import throttle from "@/utils/throttle";

const router = useRouter();
const props = defineProps({
  // 列表数据
  data: {
    type: Array,
    default: () => [],
  },
  // 评论类型
  type: {
    type: String,
    default: "song",
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
    default: 20,
  },
});

// 获取评论类型
const getCommentType = () => {
  switch (props.type) {
    case "song":
      return 0;
    case "mv":
      return 1;
    case "playlist":
      return 2;
    case "album":
      return 3;
    case "video":
      return 5;
    default:
      return 0;
  }
};

// 获取评论内容
const getCommentText = (text) => {
  try {
    if (!text) return null;
    // 正则
    const emojiRegex = /\[(\S+?)\]/g;
    // 替换内容为表情
    const replacedText = text.replace(emojiRegex, (match, emojiName) => {
      // 在 emojiData 中查找匹配的 emojiName 对应的 emoji
      const emojiObject = emojiData.find((emoji) => emoji.emjName === emojiName);
      // 如果找到了对应的 emoji，则返回该 emoji，否则返回原始字符串
      return emojiObject ? emojiObject.emoji : match;
    });
    return replacedText;
  } catch (error) {
    console.error("表情替换出错：", error);
    return text;
  }
};

// 点赞评论
const toLikeComment = throttle(
  async (data) => {
    try {
      if (isLogin()) {
        const isLike = data?.liked;
        if (isLike === undefined) return false;
        // 点赞或取消
        const result = await likeComment(
          router.currentRoute.value.query.id,
          data?.commentId,
          isLike ? 2 : 1,
          getCommentType(),
        );
        if (result.code === 200) {
          data.liked = !isLike;
          data.likedCount += isLike ? -1 : 1;
        }
      } else {
        $message.warning("请登录后使用");
        if (typeof $changeLogin !== "undefined") $changeLogin();
      }
    } catch (error) {
      console.error("点赞出错：", error);
      $message.error("点赞出错，请重试");
    }
  },
  3000,
  "请稍后再操作",
);
</script>

<style lang="scss" scoped>
.comment-list {
  .comments {
    min-height: 128px;
    height: 100%;
    margin-bottom: 20px;
    border-radius: 8px;
    &:last-child {
      margin-bottom: 0;
    }
    .user {
      min-width: 60px;
      width: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 16px;
      .avatar {
        display: flex;
        justify-content: center;
        position: relative;
        width: 54px;
        height: 54px;
        .cover {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          box-shadow: 0 6px 8px -2px rgb(0 0 0 / 16%);
          :deep(img) {
            width: 100%;
            opacity: 0;
            transition: opacity 0.35s ease-in-out;
          }
          .cover-loading {
            background-color: transparent;
            .loading-img {
              border-radius: 50%;
              overflow: hidden;
            }
          }
        }
        .package {
          position: absolute;
          height: 16px;
          right: 0;
          bottom: 0;
          background-color: #fff;
          border: 1px solid #fff3;
          border-radius: 50%;
        }
      }
      .associator {
        display: flex;
        flex-direction: column;
        margin-top: 12px;
        justify-content: space-evenly;
        align-items: center;
        img {
          height: 16px;
          &:nth-of-type(1) {
            margin-bottom: 6px;
          }
        }
      }
      @media (max-width: 678px) {
        min-width: 48px;
        width: 48px;
        .avatar {
          width: 40px;
          height: 40px;
          .package {
            height: 12px;
          }
        }
      }
    }
    .content {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      .review {
        .name {
          font-weight: bold;
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
        }
      }
      .recover {
        width: 100%;
        padding: 4px 8px;
        border-radius: 8px;
        background-color: var(--main-second-color);
        font-size: 13px;
        margin-top: 6px;
        box-sizing: border-box;
        .name {
          font-weight: bold;
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
        }
      }
      .menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-top: 12px;
        width: 100%;
        .menu-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          &:first-child {
            margin-right: 8px;
          }
          &.like {
            margin-right: 0;
            margin-left: auto;
            opacity: 0.8;
            transition:
              color 0.3s,
              opacity 0.3s;
            cursor: pointer;
            &:hover,
            &.liked {
              color: var(--main-color);
              opacity: 1;
            }
          }
          .n-icon {
            margin-right: 6px;
          }
        }
      }
    }
  }
}
</style>
