<template>
  <div class="videolists">
    <Transition mode="out-in">
      <n-grid
        id="list"
        x-gap="20"
        y-gap="26"
        cols="2 s:3 m:4 l:5"
        responsive="screen"
        v-if="listData[0]"
      >
        <n-gi
          class="item"
          v-for="item in listData"
          :key="item"
          @click="router.push(`/video?id=${item.id}`)"
        >
          <div class="cover">
            <n-avatar
              class="coverImg"
              lazy
              :intersection-observer-options="{
                root: '#list',
              }"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=464y260'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon class="play" size="40">
              <PlayOne theme="filled" />
            </n-icon>
            <div class="num">
              <n-icon size="14" :component="Youtube" />
              <span>{{ item.playCount }}</span>
            </div>
            <div class="time">
              <span>{{ item.duration }}</span>
            </div>
          </div>
          <div class="title">
            <span class="name text-hidden">{{ item.name }}</span>
            <AllArtists
              class="text-hidden"
              :artistsData="item.artist"
              v-if="item.artist"
            />
          </div>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="loading"
        x-gap="20"
        y-gap="26"
        cols="2 s:3 m:4 l:5"
        responsive="screen"
      >
        <n-gi class="item" v-for="n in 30" :key="n">
          <n-skeleton class="pic" :sharp="false" />
          <n-skeleton text :repeat="1" />
          <n-skeleton text style="width: 60%" />
        </n-gi>
      </n-grid>
    </Transition>
  </div>
</template>

<script setup>
import { PlayOne, Youtube } from "@icon-park/vue-next";
import { useRouter } from "vue-router";
import AllArtists from "./AllArtists.vue";

const router = useRouter();
const props = defineProps({
  // 列表数据
  listData: {
    type: Array,
    default: [],
  },
});
</script>

<style lang="scss" scoped>
.videolists {
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .item {
    width: 100%;
    height: 100%;
    .cover {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      .coverImg {
        border-radius: 8px;
        width: 100%;
        height: 100%;
        transition: all 0.3s;
      }
      .play {
        opacity: 0;
        position: absolute;
        color: #fff;
        padding: 0.5vw;
        background-color: #00000010;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border-radius: 50%;
        transform: scale(0.8);
        transition: all 0.3s;
      }
      .num,
      .time {
        position: absolute;
        color: #fff;
        background-color: #00000030;
        font-size: 12px;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
        padding: 4px 8px;
        transition: all 0.3s;
      }
      .num {
        display: flex;
        align-items: center;
        top: 0;
        right: 0;
        border-bottom-left-radius: 8px;
        .n-icon {
          margin-right: 4px;
        }
      }
      .time {
        left: 0;
        bottom: 0;
        border-top-right-radius: 8px;
      }
      &:hover {
        box-shadow: 0 15px 30px rgb(0 0 0 / 10%);
        .coverImg {
          filter: brightness(0.8);
          transform: scale(1.1);
        }
        .play {
          transform: scale(1);
          opacity: 1;
        }
        .description {
          opacity: 0;
        }
      }
      &:active {
        transform: scale(0.98);
      }
    }
    .title {
      display: flex;
      flex-direction: column;
      margin-top: 12px;
      .name {
        // font-size: 2vh;
        font-size: 15px;
        -webkit-line-clamp: 2;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: var(--main-color);
        }
      }
      .by {
        font-size: 12px;
        opacity: 0.6;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: var(--main-color);
        }
      }
      .artists {
        font-size: 12px;
      }
    }
  }
  .loading {
    .pic {
      height: 120px;
      width: 100%;
      border-radius: 8px !important;
      margin-bottom: 12px;
    }
  }
}
</style>
