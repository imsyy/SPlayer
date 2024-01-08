<!-- 新建歌单 -->
<template>
  <n-modal
    v-model:show="createPlaylistShow"
    :auto-focus="false"
    :bordered="false"
    class="create-playlist"
    title="新建歌单"
    preset="card"
    transform-origin="center"
    @after-leave="closeCreatePlaylist"
  >
    <n-input
      v-model:value="createName"
      placeholder="输入歌单标题"
      style="margin-bottom: 12px"
      maxlength="40"
      show-count
      clearable
    />
    <!-- 隐私歌单 -->
    <n-checkbox v-model:checked="createPrivacy"> 设为隐私歌单 </n-checkbox>
    <template #footer>
      <n-flex justify="end">
        <n-button @click="closeCreatePlaylist"> 取消 </n-button>
        <n-button
          :disabled="!createName"
          type="primary"
          @click="createPlaylistBtn(createName, createPrivacy)"
        >
          新建
        </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<script setup>
import { siteData } from "@/stores";
import { createPlaylist } from "@/api/playlist";

const data = siteData();

// 新建歌单数据
const createPlaylistShow = ref(false);
const createPrivacy = ref(false);
const createName = ref(null);

// 开启新建歌单弹窗
const openCreatePlaylist = () => {
  createPlaylistShow.value = true;
};

// 新建歌单
const createPlaylistBtn = async (name, privacy = false) => {
  const result = await createPlaylist(name, privacy ? "10" : null);
  if (result.code === 200) {
    closeCreatePlaylist();
    $message.success("新建歌单成功");
    await data.setUserLikePlaylists();
  } else {
    $message.error("新建歌单失败，请重试");
  }
};

// 关闭新建歌单
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
