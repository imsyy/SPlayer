<template>
  <div class="like-videos">
    <Transition name="fade" mode="out-in">
      <div v-if="userLikeData.djs?.length" class="list">
        <!-- 列表 -->
        <MainCover :data="userLikeData.djs" type="dj" />
      </div>
      <n-empty
        v-else
        description="当前暂无收藏电台"
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

const data = siteData();
const { userLikeData } = storeToRefs(data);
</script>
