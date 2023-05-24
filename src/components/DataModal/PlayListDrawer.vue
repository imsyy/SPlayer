<template>
  <n-drawer
    class="playlist-drawer"
    v-model:show="playListShow"
    :z-index="1"
    :width="400"
    :trap-focus="false"
    :block-scroll="false"
    placement="right"
    to="#mainContent"
    @after-leave="music.showPlayList = false"
    @mask-click="music.showPlayList = false"
  >
    <n-drawer-content :native-scrollbar="false" closable>
      <template #header>
        <div class="text">
          <n-text class="name">{{ $t("general.name.playlists") }}</n-text>
          <n-text class="num" :depth="3" v-if="music.getPlaylists.length > 0">
            {{
              $t("general.name.songSize", { size: music.getPlaylists.length })
            }}
          </n-text>
        </div>
      </template>
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
              <n-text
                v-if="index !== music.persistData.playSongIndex"
                :depth="3"
                class="num"
              >
                {{ index + 1 }}
              </n-text>
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
        <n-text v-else>{{ $t("other.playlistEmpty") }}</n-text>
      </Transition>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { musicStore } from "@/store";
import { DeleteFour } from "@icon-park/vue-next";
import { soundStop } from "@/utils/Player";
import { useI18n } from "vue-i18n";
import AllArtists from "@/components/DataList/AllArtists.vue";

const { t } = useI18n();
const music = musicStore();

// 播放列表显隐
const playListShow = ref(false);

// 改变播放索引
const changeIndex = (index) => {
  try {
    if (music.persistData.playSongIndex !== index) {
      if (typeof $player !== "undefined") soundStop($player);
      music.persistData.playSongIndex = index;
      music.isLoadingSong = true;
      music.setPlayState(true);
    }
  } catch (err) {
    console.error(t("general.message.operationFailed"), err);
    $message.error(t("general.message.operationFailed"));
  }
};

// 监听播放列表显隐
const timeOut = ref(null);
watch(
  () => music.showPlayList,
  (val) => {
    playListShow.value = val;
    nextTick().then(() => {
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
          }, 500);
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
  .text {
    display: flex;
    align-items: center;
    .num {
      font-size: 14px;
      &::before {
        content: "-";
        margin: 0 6px;
      }
    }
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
      background-color: var(--main-second-color);
      border-color: var(--main-color);
      a,
      span,
      div,
      .n-icon {
        color: var(--main-color);
      }
      :deep(span) {
        color: var(--main-color);
      }
      .right {
        .remove {
          color: var(--main-color);
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
          background-color: var(--main-color);
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
          color: var(--main-color);
          background-color: var(--n-border-color);
        }
      }
    }
  }
}
</style>