<template>
  <div class="history">
    <div class="title">
      <n-text class="keyword">最近播放</n-text>
      <n-text class="size" depth="3">共 {{ dataStore.historyList?.length || 0 }} 首</n-text>
    </div>
    <n-flex class="menu">
      <n-button
        :focusable="false"
        :disabled="!dataStore.historyList?.length"
        type="primary"
        strong
        secondary
        round
        v-debounce="() => player.updatePlayList(dataStore.historyList)"
      >
        <template #icon>
          <SvgIcon name="Play" />
        </template>
        播放
      </n-button>
      <n-button
        :focusable="false"
        :disabled="!dataStore.historyList?.length"
        class="more"
        strong
        secondary
        round
        @click="cleanHistory"
      >
        <template #icon>
          <SvgIcon name="Delete" />
        </template>
        清空列表
      </n-button>
    </n-flex>
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="dataStore.historyList.length > 0"
        :data="dataStore.historyList"
        :loading="true"
        hiddenCover
        hiddenSize
      />
      <n-empty
        v-else
        description="暂无记录，快去播放一些歌曲吧"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from "@/stores";
import player from "@/utils/player";

const dataStore = useDataStore();

// 清空最近播放
const cleanHistory = () => {
  window.$dialog.warning({
    title: "清空列表",
    content: "确认清空最近播放列表？该操作不可撤销！",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: async () => {
      await dataStore.clearHistory();
      window.$message.success("最近播放列表已清空");
    },
  });
};
</script>

<style lang="scss" scoped>
.history {
  display: flex;
  flex-direction: column;
  height: 100%;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 8px;
      line-height: normal;
    }
    .size {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 12px;
    .n-button {
      height: 40px;
      transition: all 0.3s var(--n-bezier);
    }
  }
  .song-list {
    flex: 1;
    overflow: hidden;
  }
}
</style>
