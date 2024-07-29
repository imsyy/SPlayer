<!-- 最近播放 -->
<template>
  <div class="history">
    <n-h1 class="title">
      <n-text>最近播放</n-text>
      <n-text class="num" depth="3">共 {{ historyPlaylist?.length || 0 }} 首</n-text>
    </n-h1>
    <Transition name="fade" mode="out-in">
      <div v-if="historyPlaylist?.length" class="list">
        <n-flex class="menu">
          <n-button round strong secondary @click="cleanHistory">
            <template #icon>
              <n-icon>
                <SvgIcon icon="delete" />
              </n-icon>
            </template>
            清空列表
          </n-button>
        </n-flex>
        <SongList :data="historyPlaylist" :showCover="false" />
        <n-divider class="tip" dashed>
          <n-text :depth="3"> 最多展示 500 条播放历史 </n-text>
        </n-divider>
      </div>
      <n-empty v-else class="empty" description="你还没播放任何歌曲" />
    </Transition>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { musicData } from "@/stores";

const music = musicData();
const { historyPlaylist } = storeToRefs(music);

// 清除播放历史
const cleanHistory = () => {
  $dialog.warning({
    title: "清空列表",
    content: "确认清空最近播放列表？该操作不可撤销！",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: () => {
      historyPlaylist.value = [];
    },
  });
};
</script>

<style lang="scss" scoped>
.history {
  .title {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
    .num {
      margin-left: 12px;
      margin-bottom: 6px;
      font-size: 18px;
      font-weight: normal;
    }
  }
  .list {
    .menu {
      margin: 12px 0 20px 0;
    }
    .tip {
      font-size: 12px;
    }
  }
  .empty {
    margin-top: 40px;
  }
}
</style>
