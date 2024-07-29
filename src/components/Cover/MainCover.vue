<!-- 封面列表 -->
<template>
  <Transition name="fade" mode="out-in">
    <n-grid
      v-if="data?.length"
      :cols="columns"
      :collapsed="gridCollapsed"
      :collapsed-rows="gridCollapsedRows"
      class="cover-lists"
      responsive="screen"
      x-gap="20"
      y-gap="20"
    >
      <n-gi
        v-for="(item, index) in data"
        :key="index"
        @click.stop="jumpLink(item, type)"
        @contextmenu="coverDropdownRef?.openDropdown($event, type, item.id)"
      >
        <n-card
          :class="['cover-item', type]"
          :content-style="{ padding: type === 'artist' ? 0 : 16 + 'px' }"
        >
          <div class="cover-img">
            <!-- 封面 -->
            <n-image
              :src="type === 'mv' ? item.coverSize : item.coverSize.m"
              class="cover-main-img"
              preview-disabled
              lazy
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div :class="['cover-loading', type]">
                  <img
                    class="loading-img"
                    :src="
                      type === 'mv'
                        ? '/imgs/pic/video.jpg?assest'
                        : type === 'artist'
                          ? '/imgs/pic/artist.jpg?assest'
                          : '/imgs/pic/album.jpg?assest'
                    "
                    alt="song"
                  />
                </div>
                <!-- <div :class="['cover-loading', type]">
                  <n-spin size="small" />
                </div> -->
              </template>
            </n-image>
            <!-- 封面背板 -->
            <n-image
              v-if="type === 'artist'"
              class="cover-main-shadow"
              lazy
              preview-disabled
              :src="item.coverSize.m"
            />
            <!-- 额外信息 -->
            <div v-if="item.desc" class="additional">
              <n-text class="add-desc">{{ item.desc }}</n-text>
            </div>
            <!-- 播放按钮 -->
            <CoverPlayBtn v-if="type !== 'artist'" :id="item.id" :type="type" />
            <n-icon v-else class="play-btn">
              <SvgIcon icon="account-music" />
            </n-icon>
          </div>
          <!-- 信息 -->
          <div class="cover-content">
            <n-text class="name">{{ item.name }}</n-text>
            <!-- 创建者 -->
            <n-text v-if="item?.creator" class="creator" depth="3">
              {{ item.creator?.nickname || item.creator || "未知" }}
            </n-text>
            <!-- 电台简介 -->
            <n-text v-if="item?.rcmdText" class="creator" depth="3">
              {{ item.rcmdText || "未知简介" }}
            </n-text>
            <!-- 歌手 -->
            <div v-if="item.artists && type !== 'dj'" class="artists">
              <n-text
                v-for="ar in item.artists"
                :key="ar.id"
                class="ar"
                @click.stop="router.push(`/artist?id=${ar.id}`)"
              >
                {{ ar.name || ar.userName }}
              </n-text>
            </div>
            <!-- 歌曲数量 -->
            <div v-if="type === 'artist' && item.size.music" class="size">
              <n-icon depth="3" size="16">
                <SvgIcon :icon="type !== 'artist' ? 'play-circle' : 'music-note'" />
              </n-icon>
              <n-text depth="3">
                {{ item.size.music }}
              </n-text>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
    <!-- 加载占位 -->
    <n-grid
      v-else
      :cols="columns"
      :collapsed="gridCollapsed"
      :collapsed-rows="gridCollapsedRows"
      class="cover-lists-loading"
      responsive="screen"
      x-gap="20"
      y-gap="20"
    >
      <n-gi v-for="item in loadSize" :key="item">
        <n-card :class="['cover-item', type]" content-style="padding: 16px">
          <n-skeleton class="cover-img" />
          <div class="cover-content">
            <n-skeleton text round :repeat="2" />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </Transition>
  <!-- 右键菜单 -->
  <CoverDropdown ref="coverDropdownRef" />
</template>

<script setup>
import { useRouter } from "vue-router";
import { siteSettings } from "@/stores";

const router = useRouter();
const settings = siteSettings();

const props = defineProps({
  // 封面类型
  type: {
    type: String,
    default: "playlist",
  },
  // 列表数据
  data: {
    type: Array,
    default: () => [],
  },
  // 自定义列数
  columns: {
    type: String,
    default: "2 s:3 m:4 l:5 xl:6",
  },
  // 折叠栅格
  gridCollapsed: {
    type: Boolean,
    default: false,
  },
  // 折叠后行数
  gridCollapsedRows: {
    type: Number,
    default: 3,
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
  },
});

// 右键菜单
const coverDropdownRef = ref(null);

// 默认加载数量
const loadSize = ref(props.loadingNum || settings.loadSize || 50);

// 跳转页面
const jumpLink = (data, type) => {
  console.log(data, type);
  try {
    switch (type) {
      case "mv":
        router.push({
          path: "/videos-player",
          query: {
            id: data?.id,
          },
        });
        break;
      case "playlist":
        router.push({
          path: "/playlist",
          query: {
            id: data?.id,
          },
        });
        break;
      case "album":
        router.push({
          path: "/album",
          query: {
            id: data?.id,
          },
        });
        break;
      case "artist":
        router.push({
          path: "/artist",
          query: {
            id: data?.id,
          },
        });
        break;
      case "dj":
        router.push({
          path: "/dj",
          query: {
            id: data?.id,
          },
        });
        break;
      default:
        break;
    }
  } catch (error) {
    $message.error("跳转出错，请上报错误至开发者");
    console.error("跳转出错：", error);
  }
};
</script>

<style lang="scss" scoped>
.cover-lists {
  width: 100%;
  .cover-item {
    height: 100%;
    border-radius: 8px;
    z-index: 0;
    transition:
      background-color 0.3s,
      transform 0.3s;
    cursor: pointer;
    :deep(.n-card__content) {
      padding: 12px !important;
    }
    .cover-img {
      position: relative;
      display: flex;
      border-radius: 8px;
      overflow: hidden;
      .cover-main-img {
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
      }
      .cover-main-shadow {
        opacity: 0;
        position: absolute;
        border-radius: 50%;
        top: 12px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
        transition: opacity 0.3s;
      }
      .additional {
        position: absolute;
        top: -80px;
        left: 0;
        z-index: 1;
        width: 100%;
        padding: 6px 10px;
        box-sizing: border-box;
        background: -webkit-linear-gradient(top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0));
        opacity: 0;
        transition:
          top 0.3s,
          opacity 0.3s;
        .add-desc {
          color: #ffffffd1;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
          -webkit-line-clamp: 2;
        }
      }
      .play-btn {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        right: 8px;
        bottom: 8px;
        opacity: 0;
        color: #efefefde;
        transform: translateY(6px);
        border-radius: 50%;
        overflow: hidden;
        z-index: 3;
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
    }
    .cover-content {
      width: 100%;
      margin-top: 16px;
      .name {
        font-size: 16px;
        -webkit-line-clamp: 2;
      }
      .artists {
        font-size: 13px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          display: inline-flex;
          opacity: 0.6;
          transition:
            color 0.3s,
            opacity 0.3s;
          cursor: pointer;
          &::after {
            content: "/";
            margin: 0 4px;
            transition: none;
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
      .creator {
        font-size: 12px;
      }
      .size {
        display: flex;
        align-items: center;
      }
    }
    &:hover {
      background-color: var(--n-close-color-hover);
      transform: translate3d(0, -2px, 0);
      .cover-img {
        .cover-main-img {
          transform: scale(1.1);
          filter: brightness(0.8);
        }
        .additional {
          top: 0;
          opacity: 1;
        }
        .play-btn {
          opacity: 1;
          transform: translateY(0);
          &:hover {
            transform: scale(1.1);
          }
          &:active {
            transform: scale(1);
          }
        }
      }
    }
    &:active {
      transform: scale(1);
    }
    // 歌手
    &.artist {
      border: none;
      background-color: transparent;
      .cover-img {
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        overflow: visible;
        box-shadow: 0 4px 16px #00000020;
        .cover-main-img {
          border-radius: 50%;
          overflow: hidden;
        }
        .play-btn {
          font-size: 50px;
          right: auto;
          bottom: auto;
        }
      }
      .cover-content {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        .name {
          -webkit-line-clamp: 1;
        }
      }
      &:hover {
        transform: none;
        .cover-main-img {
          transform: scale(1.05);
          filter: brightness(0.8);
        }
        .cover-main-shadow {
          opacity: 1;
        }
      }
      &:active {
        transform: none;
        .cover-main-img {
          transform: scale(1);
          filter: brightness(0.8);
        }
      }
    }
  }
}
// 加载占位
.cover-lists-loading {
  width: 100%;
  .cover-item {
    height: 100%;
    border-radius: 8px;
    .cover-img {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 8px;
    }
    .cover-content {
      margin-top: 16px;
    }
    &.mv {
      .cover-img {
        padding-bottom: 56%;
      }
    }
    &.artist {
      border: none;
      background-color: transparent;
      .cover-img {
        border-radius: 50%;
      }
    }
  }
}
</style>
