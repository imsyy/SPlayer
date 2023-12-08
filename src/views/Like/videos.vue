<template>
  <div class="like-videos">
    <Transition name="fade" mode="out-in">
      <div v-if="userLikeData.mvs?.length" class="list">
        <!-- 列表 -->
        <MainCover :data="likeVideosData" columns="1 s:2 m:3 l:4 xl:5" type="mv" />
      </div>
      <n-empty
        v-else
        description="当前暂无收藏视频"
        class="tip"
        style="margin-top: 60px"
        size="large"
      />
    </Transition>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import formatData from "@/utils/formatData";

const data = siteData();
const { userLikeData } = storeToRefs(data);

// 处理视频数据
const likeVideosData = computed(() => {
  return formatData(userLikeData.value.mvs, "mv");
});
</script>
