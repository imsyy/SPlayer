<template>
  <div class="like-type">
    <!-- 分类 -->
    <n-flex class="type">
      <n-tag
        v-for="(item, index) in plTypeName"
        :key="index"
        :bordered="false"
        :class="['tag', { choose: index === plTypeChoose }]"
        round
        @click="changeType(index)"
      >
        {{ item }}
      </n-tag>
    </n-flex>
    <Transition name="fade" mode="out-in">
      <CoverList :key="plTypeChoose" :data="listData" :loading="true" type="playlist" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from "@/stores";

const dataStore = useDataStore();

// 歌单分类
const plTypeChoose = ref(0);
const plTypeName = ["我创建的", "我收藏的"];

// 歌单列表内容
const listData = computed(() =>
  dataStore.userLikeData.playlists
    ?.filter((pl) =>
      plTypeChoose.value === 0
        ? pl.userId === dataStore.userData.userId
        : pl?.userId !== dataStore.userData.userId,
    )
    .slice(plTypeChoose.value === 0 ? 1 : 0),
);

// 更换歌单类型
const changeType = (index: number) => (plTypeChoose.value = index);
</script>

<style lang="scss" scoped>
.type {
  margin-top: 20px;
  .n-tag {
    font-size: 14px;
    padding: 0 16px;
    &.choose {
      background-color: rgba(var(--primary), 0.14);
    }
  }
}
</style>
