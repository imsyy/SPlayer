<template>
  <CollapseTransition easing="ease-in-out">
    <n-card
      title="播放列表"
      closable
      class="playlistModel"
      v-show="music.showPlayList && music.getPlaylists.length"
      :header-style="{
        padding: '12px 16px',
        fontSize: '16px',
        backgroundColor: 'var(--n-border-color)',
        borderRadius: '8px',
      }"
      :content-style="{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
      }"
      @close="music.showPlayList = false"
      @click.stop
    >
      <n-scrollbar>
        <n-card
          hoverable
          :class="
            index == music.persistData.playSongIndex ? 'songs play' : 'songs'
          "
          :id="'playlist' + index"
          :content-style="{
            padding: '8px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }"
          v-for="(item, index) in music.getPlaylists"
          :key="item"
          @click="changeIndex(index)"
        >
          <div class="left">
            <div class="num">{{ index + 1 }}</div>
          </div>
          <div class="right">
            <div class="name text-hidden">{{ item.name }}</div>
            <AllArtists class="text-hidden" :artistsData="item.artist" />
            <n-icon
              class="remove"
              :component="RemoveCircleOutlineFilled"
              @click.stop="music.removeSong(index)"
            />
          </div>
        </n-card>
      </n-scrollbar>
    </n-card>
  </CollapseTransition>
</template>

<script setup>
import { musicStore } from "@/store";
import { RemoveCircleOutlineFilled } from "@vicons/material";
import AllArtists from "./AllArtists.vue";
import CollapseTransition from "@ivanv/vue-collapse-transition/src/CollapseTransition.vue";

const music = musicStore();

onMounted(() => {
  // 点击外部区域关闭播放列表
  document.addEventListener("click", () => {
    music.showPlayList = false;
  });
});

// 改变播放索引
const changeIndex = (index) => {
  music.persistData.playSongIndex = index;
  music.setPlayState(true);
};
</script>

<style lang="scss" scoped>
.playlistModel {
  position: absolute;
  bottom: 76px;
  min-width: 300px;
  right: 0;
  border-radius: 8px;
  border-top: none;
  box-shadow: var(--n-box-shadow);
  :deep(.n-card__content) {
    .n-scrollbar {
      max-height: 70vh;
      .n-scrollbar-content {
        padding: 12px;
        .songs {
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.3s;
          &:nth-last-of-type(1) {
            margin-bottom: 0;
          }
          &:active {
            transform: scale(0.98);
          }
          &:hover {
            .n-card__content {
              .right {
                .remove {
                  opacity: 1;
                }
              }
            }
          }
          &.play {
            background-color: $mainSecondaryColor;
            border-color: $mainColor;
            a,
            span,
            div,
            .n-icon {
              color: $mainColor;
            }
            .right {
              .remove {
                color: $mainColor;
                &:hover {
                  background-color: var(--n-action-color);
                }
              }
            }
          }

          .left {
            width: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
          }
          .right {
            flex: 1;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            padding-right: 42px;
            .name {
              pointer-events: none;
            }
            .artists {
              opacity: 0.8;
              font-size: 13px;
              pointer-events: none;
            }
            .remove {
              position: absolute;
              border-radius: 8px;
              right: 0;
              font-size: 22px;
              opacity: 0;
              transition: all 0.3s;
              color: #999;
              padding: 6px;
              &:hover {
                color: $mainColor;
                background-color: var(--n-border-color);
              }
            }
          }
        }
      }
    }
    .n-scrollbar-rail {
      width: 0;
    }
  }
}
</style>