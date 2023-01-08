<template>
  <div class="coverlists">
    <Transition mode="out-in">
      <n-grid
        x-gap="20"
        y-gap="26"
        responsive="screen"
        :cols="columns"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
        v-if="listData[0]"
      >
        <n-gi
          class="item"
          v-for="item in listData"
          :key="item"
          @click="toLink(item.id)"
        >
          <div class="cover">
            <n-avatar
              class="coverImg"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=300y300'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon class="play" :component="PlayArrowRound" />
            <div class="description">
              <div class="num" v-if="listType == 'playList'">
                <n-icon :component="HeadsetFilled" />
                <span>{{ item.playCount }}</span>
              </div>
              <div class="num" v-else>
                <span>{{ item.time }}</span>
              </div>
            </div>
          </div>
          <div class="title">
            <span class="name text-hidden">{{ item.name }}</span>
            <span v-if="listType == 'playList' && item.artist" class="by">
              By {{ item.artist.nickname }}
            </span>
            <AllArtists class="text-hidden" v-else :artistsData="item.artist" />
          </div>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="loading"
        x-gap="20"
        y-gap="26"
        :cols="columns"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
      >
        <n-gi class="item" v-for="n in loadingNum" :key="n">
          <n-skeleton class="pic" :sharp="false" />
          <n-skeleton text :repeat="1" />
          <n-skeleton text style="width: 60%" />
        </n-gi>
      </n-grid>
    </Transition>
  </div>
</template>

<script setup>
import { PlayArrowRound, HeadsetFilled } from "@vicons/material";
import { useRouter } from "vue-router";
import AllArtists from "./AllArtists.vue";

const router = useRouter();
const props = defineProps({
  // 列表数据
  listData: {
    type: Object,
    default: [],
  },
  // 列表类型
  listType: {
    type: String,
    default: "playList",
  },
  // 自定义列数
  columns: {
    type: String,
    default: "3 s:4 m:5 l:6",
  },
  // 折叠栅格
  gridCollapsed: {
    type: Boolean,
    default: false,
  },
  // 折叠后行数
  gridCollapsedRows: {
    type: Number,
    default: 2,
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
    default: 30,
  },
});

// 链接跳转
const toLink = (id) => {
  if (props.listType == "playList") {
    router.push({
      path: "/playlist",
      query: {
        id,
      },
    });
  } else if (props.listType == "album") {
    router.push({
      path: "/album",
      query: {
        id,
      },
    });
  }
};
</script>

<style lang="scss" scoped>
.coverlists {
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
        font-size: 5vh;
        color: #fff;
        padding: 0.5vw;
        background-color: #00000010;
        backdrop-filter: blur(10px);
        border-radius: 50%;
        transform: scale(0.8);
        transition: all 0.3s;
      }
      .description {
        position: absolute;
        right: 0;
        bottom: 0;
        color: #fff;
        background-color: #00000030;
        font-size: 12px;
        backdrop-filter: blur(4px);
        padding: 4px 8px;
        border-top-left-radius: 8px;
        transition: all 0.3s;
        .num {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 2px;
            transform: translateY(-1px);
          }
        }
      }
      &:hover {
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
          color: $mainColor;
        }
      }
      .by {
        font-size: 12px;
        opacity: 0.6;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: $mainColor;
        }
      }
      .artists {
        font-size: 12px;
      }
    }
  }
  .loading {
    .pic {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 8px !important;
      margin-bottom: 12px;
    }
  }
}
</style>