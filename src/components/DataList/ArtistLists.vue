<template>
  <div class="artistlists">
    <Transition mode="out-in">
      <n-grid
        x-gap="30"
        y-gap="34"
        cols="3 mb:4 s:5 l:6"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
        v-if="listData[0]"
      >
        <n-gi
          class="item"
          v-for="item in listData"
          :key="item"
          @click="router.push(`/artist?id=${item.id}`)"
        >
          <div class="cover">
            <n-avatar
              round
              class="coverImg"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=200y200'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon :component="PersonSearchFilled" />
          </div>
          <div class="name text-hidden">{{ item.name }}</div>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="loading"
        x-gap="20"
        y-gap="26"
        cols="3 mb:4 s:5 l:6"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
      >
        <n-gi class="item" v-for="n in loadingNum" :key="n">
          <n-skeleton class="pic" :sharp="false" />
          <n-skeleton text style="width: 60%" />
        </n-gi>
      </n-grid>
    </Transition>
  </div>
</template>

<script setup>
import { PersonSearchFilled } from "@vicons/material";
import { useRouter } from "vue-router";

const router = useRouter();
const props = defineProps({
  // 列表数据
  listData: {
    type: Object,
    default: [],
  },
  // 折叠栅格
  gridCollapsed: {
    type: Boolean,
    default: false,
  },
  // 折叠后行数
  gridCollapsedRows: {
    type: Number,
    default: 1,
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
    default: 6,
  },
});
</script>

<style lang="scss" scoped>
.artistlists {
  padding-top: 20px;
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .item {
    text-align: center;
    cursor: pointer;
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px 0 #00000020;
      border-radius: 50%;
      transition: all 0.3s;
      .n-avatar {
        filter: brightness(1);
        transform: scale(1);
        width: 100%;
        height: 100%;
        transition: all 0.3s;
      }
      .n-icon {
        opacity: 0;
        transform: scale(0.8);
        position: absolute;
        color: #fff;
        font-size: 5vh;
        transition: all 0.3s;
      }
      &:hover {
        box-shadow: 0 4px 16px 0 #00000040;
        .n-icon {
          opacity: 1;
          transform: scale(1);
        }
        .n-avatar {
          filter: brightness(0.8);
          transform: scale(1.05);
        }
      }
      &:active {
        .n-avatar {
          transform: scale(1);
        }
      }
    }
    .name {
      margin-top: 14px;
      // font-size: 2vh;
      // font-weight: bold;
      font-size: 15px;
      transition: all 0.3s;
      cursor: pointer;
      &:hover {
        color: $mainColor;
      }
    }
  }
  .loading {
    .pic {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 50% !important;
      margin-bottom: 20px;
    }
  }
}
</style>