<template>
  <div class="playlists">
    <div class="data">
      <n-button
        class="add"
        type="primary"
        strong
        secondary
        round
        @click="createModelShow = true"
      >
        <template #icon>
          <n-icon :component="AddCircleRound" />
        </template>
        新建歌单
      </n-button>
      <n-modal
        class="create"
        v-model:show="createModelShow"
        style="width: 60vw; min-width: min(24rem, 100vw)"
        preset="card"
        title="新建歌单"
        :bordered="false"
        :on-after-leave="createClose"
      >
        <n-input
          style="margin-bottom: 12px"
          v-model:value="createName"
          type="text"
          placeholder="请输入新歌单标题"
        />
        <n-checkbox v-model:checked="createPrivacy">
          设置为隐私歌单
        </n-checkbox>
        <template #footer>
          <n-space justify="end">
            <n-button @click="createClose"> 取消 </n-button>
            <n-button
              type="primary"
              @click="createPlaylistBtn(createName, createPrivacy)"
            >
              新建
            </n-button>
          </n-space>
        </template>
      </n-modal>
    </div>
    <CoverLists :listData="music.getUserPlayLists.own" :showMore="true" />
  </div>
</template>

<script setup>
import { createPlaylist } from "@/api";
import { AddCircleRound } from "@vicons/material";
import { useRouter } from "vue-router";
import { musicStore, userStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";

const router = useRouter();
const music = musicStore();
const user = userStore();

// 新建歌单数据
let createModelShow = ref(false);
let createPrivacy = ref(false);
let createName = ref(null);

// 新建歌单
const createPlaylistBtn = (name, privacy = false) => {
  if (createName.value) {
    createPlaylist(name, privacy ? "10" : null).then((res) => {
      if (res.code === 200) {
        createClose();
        $message.success("歌单新建成功");
        music.setUserPlayLists();
      } else {
        $message.error("歌单新建失败，请重试");
      }
    });
  } else {
    $message.info("请输入歌单名称");
  }
};

// 取消新建歌单
const createClose = () => {
  createName.value = null;
  createPrivacy.value = false;
  createModelShow.value = false;
};

onMounted(() => {
  if (!music.getUserPlayLists.has) music.setUserPlayLists();
});
</script>

<style lang="scss" scoped>
.playlists {
  .data {
    width: 100%;
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>