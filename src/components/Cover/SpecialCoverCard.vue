<!-- 特殊封面 - 子组件 -->
<template>
  <n-card
    :style="{
      '--special-cover-height': height,
    }"
    :content-style="{
      padding: '0px',
      display: 'flex',
      alignItems: 'center',
    }"
    class="special-cover"
  >
    <div :class="{ cover: true, date: showDate }">
      <n-image
        :src="data.cover"
        :img-props="{
          class: 'cover-img',
        }"
        class="cover-main-img"
        fallback-src="/imgs/pic/default.jpg?assest"
        preview-disabled
        @load="
          (e) => {
            e.target.style.opacity = 1;
          }
        "
      >
        <template #placeholder>
          <div class="cover-loading">
            <n-spin size="small" />
          </div>
        </template>
      </n-image>
      <!-- 播放按钮 -->
      <CoverPlayBtn v-if="showIcon" :id="data.id" class="play" />
      <!-- 日期 -->
      <div v-if="showDate" class="cover-date">
        <n-icon class="date-icon">
          <SvgIcon icon="calendar-blank" />
        </n-icon>
        <n-text class="date-num">{{ new Date().getDate() }}</n-text>
      </div>
    </div>
    <div class="content">
      <n-text class="name">{{ data.name }}</n-text>
      <n-text v-if="!showSongs && data.desc" class="desc" depth="3">{{ data.desc }}</n-text>
      <!-- 热榜专用 -->
      <div v-if="showSongs && data.tracks" class="songs-list">
        <div v-for="(song, i) in data.tracks" :key="i" class="songs">
          <n-text class="song-name">{{ i + 1 }}. {{ song.first }}</n-text>
          <n-text depth="3">{{ song.second }}</n-text>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup>
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 展示数据
  data: {
    type: Object,
    required: true,
  },
  // 显示歌曲
  showSongs: {
    type: Boolean,
    default: false,
  },
  // 显示图标
  showIcon: {
    type: Boolean,
    default: true,
  },
  // 显示日期
  showDate: {
    type: Boolean,
    default: false,
  },
  // 高度
  height: {
    type: String,
    default: "100px",
  },
});
</script>

<style lang="scss" scoped>
.special-cover {
  height: var(--special-cover-height);
  border-radius: 16px;
  overflow: hidden;
  transition:
    background-color 0.3s,
    transform 0.3s;
  cursor: pointer;
  .cover {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20px;
    &.date {
      .cover-main-img {
        :deep(img) {
          filter: blur(20px);
        }
      }
    }
    .cover-main-img {
      height: var(--special-cover-height);
      width: var(--special-cover-height);
      overflow: hidden;
      transition: filter 0.3s;
      :deep(img) {
        width: 100%;
        opacity: 0;
        transition: opacity 0.35s ease-in-out;
      }
    }
    .cover-date {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
      color: #ffffffe6;
      transition: opacity 0.3s;
      .date-icon {
        font-size: 64px;
      }
      .date-num {
        position: absolute;
        top: 20px;
        font-size: 20px;
        font-weight: bold;
        color: #ffffffe6;
      }
    }

    .play {
      position: absolute;
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition:
        transform 0.3s,
        opacity 0.3s;
      cursor: pointer;
      :deep(.play) {
        --n-width: 50px;
        --n-height: 50px;
        --n-font-size: 20px;
        .n-icon {
          font-size: 60px !important;
        }
      }
      &:hover {
        transform: scale(1.1);
      }
      &:active {
        transform: scale(1);
      }
    }
    .date {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }
  .content {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-right: 20px;
    .name {
      font-size: 20px;
      font-weight: bold;
      transition: font-size 0.3s;
      @media (max-width: 990px) {
        font-size: 18px;
      }
    }
    .desc {
      margin-top: 6px;
      -webkit-line-clamp: 2;
    }
    .songs-list {
      margin-top: 12px;
      width: 100%;
      .songs {
        margin-bottom: 6px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .n-text {
          display: initial;
        }
        .song-name {
          &::after {
            content: "-";
            margin: 0 4px;
          }
        }
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  &:hover {
    background-color: var(--n-close-color-hover);
    .cover-main-img {
      filter: brightness(0.8);
    }
    .play {
      opacity: 1;
      transform: scale(1);
    }
  }
  &:active {
    transform: scale(0.99);
  }
}
</style>
