<template>
  <n-modal
    class="s-modal"
    v-model:show="createPlaylistShow"
    preset="card"
    title="新建歌单"
    :bordered="false"
    :on-after-leave="closeCreatePlaylist"
  >
    <n-input
      style="margin-bottom: 12px"
      v-model:value="createName"
      type="text"
      placeholder="请输入新歌单标题"
    />
    <n-checkbox v-model:checked="createPrivacy"> 设置为隐私歌单 </n-checkbox>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeCreatePlaylist"> 取消 </n-button>
        <n-button
          type="primary"
          @click="createPlaylistBtn(createName, createPrivacy)"
        >
          新建
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { userStore } from "@/store";
import { createPlaylist } from "@/api/playlist";

const user = userStore();

// 新建歌单数据
const createPlaylistShow = ref(false);
const createPrivacy = ref(false);
const createName = ref(null);

// 新建歌单
const createPlaylistBtn = (name, privacy = false) => {
  if (createName.value) {
    createPlaylist(name, privacy ? "10" : null).then((res) => {
      if (res.code === 200) {
        closeCreatePlaylist();
        $message.success("歌单新建成功");
        user.setUserPlayLists();
      } else {
        $message.error("歌单新建失败，请重试");
      }
    });
  } else {
    $message.info("请输入歌单名称");
  }
};

// 开启新建歌单
const openCreatePlaylist = () => {
  createPlaylistShow.value = true;
};

// 取消新建歌单
const closeCreatePlaylist = () => {
  createName.value = null;
  createPrivacy.value = false;
  createPlaylistShow.value = false;
};

// 暴露方法
defineExpose({
  openCreatePlaylist,
});
</script>
