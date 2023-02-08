<template>
  <div class="history">
    <div class="title" v-if="music.getPlayHistory[0]">
      <span class="key">播放历史</span>
    </div>
    <div class="title" v-else>
      <span class="key">暂无播放历史</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        返回上一页
      </n-button>
    </div>
    <DataLists
      v-if="music.getPlayHistory[0]"
      :listData="music.getPlayHistory"
    />
  </div>
</template>

<script setup>
import { musicStore } from "@/store";
import { useRouter } from "vue-router";
import DataLists from "@/components/DataList/DataLists.vue";

const music = musicStore();
const router = useRouter();
</script>

<style lang="scss" scoped>
.history {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
}
</style>
