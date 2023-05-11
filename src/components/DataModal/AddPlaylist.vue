<template>
  <n-modal
    class="add-playlist s-modal"
    v-model:show="addToPlaylistModal"
    preset="card"
    :bordered="false"
    :on-after-leave="closeAddToPlaylist"
  >
    <template #header>
      添加到歌单
      <n-tag
        round
        class="tag"
        type="primary"
        :style="{
          marginLeft: '12px',
          fontSize: '13px',
          transform: 'translateY(-2px)',
          cursor: 'pointer',
        }"
        :bordered="false"
        @click="createPlaylistRef.openCreatePlaylist()"
      >
        新建歌单
      </n-tag>
    </template>
    <n-space vertical class="list" v-if="user.getUserPlayLists.own[0]">
      <div
        class="item"
        v-for="item in user.getUserPlayLists.own.slice(1)"
        :key="item"
        @click="addToPlayList(item.id, addToPlaylistId)"
      >
        <n-avatar
          class="pic"
          :src="
            item.cover
              ? item.cover.replace(/^http:/, 'https:') + '?param=60y60'
              : '/images/pic/default.png'
          "
          fallback-src="/images/pic/default.png"
        />
        <div class="desc">
          <n-text class="name">{{ item.name }}</n-text>
          <n-text class="num">{{ item.trackCount }}首</n-text>
        </div>
      </div>
    </n-space>
    <n-text v-else>歌单列表加载中</n-text>
  </n-modal>
  <!-- 新建歌单 -->
  <CreatePlaylist ref="createPlaylistRef" />
</template>

<script setup>
import { addSongToPlayList } from "@/api/playlist";
import { userStore } from "@/store";
import CreatePlaylist from "./CreatePlaylist.vue";

const user = userStore();
const createPlaylistRef = ref(null);

// 收藏到歌单数据
const addToPlaylistModal = ref(false);
const addToPlaylistId = ref(null);

// 收藏到歌单
const addToPlayList = (pid, tracks) => {
  console.log("添加" + tracks + "到" + pid);
  addSongToPlayList(pid, tracks).then((res) => {
    console.log(res);
    if (res.status === 200) {
      $message.success("添加歌曲至歌单成功");
      closeAddToPlaylist();
      user.setUserPlayLists();
    } else {
      $message.error("添加失败，请重试");
    }
  });
};

// 开启收藏到歌单
const openAddToPlaylist = (id) => {
  if (!user.userLogin) {
    $message.error("请登录账号后使用");
    return false;
  }
  if (!user.getUserPlayLists.has && !user.getUserPlayLists.isLoading) {
    user.setUserPlayLists();
  }
  addToPlaylistModal.value = true;
  addToPlaylistId.value = id;
  console.log("开启", addToPlaylistModal.value, addToPlaylistId.value);
};

// 关闭收藏到歌单
const closeAddToPlaylist = () => {
  addToPlaylistModal.value = false;
};

// 暴露方法
defineExpose({
  openAddToPlaylist,
});
</script>

<style lang="scss" scoped>
.add-playlist {
  .list {
    .item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        background-color: var(--n-border-color);
      }
      .pic {
        width: 60px;
        height: 60px;
      }
      .desc {
        margin-left: 12px;
        display: flex;
        flex-direction: column;
        .name {
          // font-weight: bold;
          font-size: 15px;
        }
        .num {
          margin-top: 2px;
          opacity: 0.8;
        }
      }
    }
  }
}
</style>
