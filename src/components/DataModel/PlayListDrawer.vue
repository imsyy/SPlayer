<template>
  <n-drawer
    class="playlist-drawer"
    v-model:show="playListShow"
    :z-index="2000"
    :width="400"
    :trap-focus="false"
    :block-scroll="false"
    placement="right"
    to="#main"
    @after-leave="music.showPlayList = false"
    @mask-click="music.showPlayList = false"
  >
    <n-drawer-content title="播放列表" :native-scrollbar="false" closable>
      <Transition mode="out-in">
        <div v-if="music.getPlaylists[0]">
          <n-card
            hoverable
            :class="
              index === music.persistData.playSongIndex ? 'songs play' : 'songs'
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
              <div v-if="index !== music.persistData.playSongIndex" class="num">
                {{ index + 1 }}
              </div>
              <div v-else class="bar">
                <div
                  v-for="item in 3"
                  :key="item"
                  class="line"
                  :style="{
                    animationDelay: `0.${item * item}s`,
                    animationPlayState: music.getPlayState
                      ? 'running'
                      : 'paused',
                    height: `${Math.floor(Math.random() * 7) + 10}px`,
                  }"
                />
              </div>
            </div>
            <div class="right">
              <div class="name text-hidden">{{ item.name }}</div>
              <AllArtists class="text-hidden" :artistsData="item.artist" />
              <n-icon
                class="remove"
                size="18"
                :component="DeleteFour"
                @click.stop="music.removeSong(index)"
              />
            </div>
          </n-card>
        </div>
        <n-text v-else>暂无歌曲，请前往列表添加</n-text>
      </Transition>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { musicStore } from "@/store";
import { DeleteFour } from "@icon-park/vue-next";
import AllArtists from "@/components/DataList/AllArtists.vue";

const music = musicStore();

// 播放列表显隐
const playListShow = ref(false);

// 改变播放索引
const changeIndex = (index) => {
  music.persistData.playSongIndex = index;
  music.setPlayState(true);
};

// 监听播放列表显隐
const timeOut = ref(null);
watch(
  () => music.showPlayList,
  (val) => {
    playListShow.value = val;
    nextTick(() => {
      if (val && music.getPlaylists[0]) {
        const el = document.getElementById(
          `playlist${music.persistData.playSongIndex}`
        );
        if (el) {
          timeOut.value = setTimeout(() => {
            el.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 300);
        }
      } else {
        clearTimeout(timeOut.value);
      }
    });
  }
);

onMounted(() => {
  playListShow.value = music.showPlayList;
});

onBeforeUnmount(() => {
  clearTimeout(timeOut.value);
});
</script>

<style lang="scss" scoped>
.playlist-drawer {
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
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
      :deep(span) {
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
      .bar {
        display: flex;
        justify-content: space-evenly;
        align-items: flex-end;
        width: 20px;
        height: 20px;
        .line {
          width: 3px;
          height: 16px;
          background-color: $mainColor;
          border-radius: 4px;
          transition: all 0.3s;
          animation: lineMove 1s ease-in-out infinite;
        }
        @keyframes lineMove {
          0% {
            height: 16px;
          }
          50% {
            height: 10px;
          }
          100% {
            height: 16px;
          }
        }
      }
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
</style>
