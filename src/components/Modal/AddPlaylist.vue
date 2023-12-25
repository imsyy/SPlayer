<!-- 添加到歌单 -->
<template>
  <n-modal
    v-model:show="addToPlaylistShow"
    :auto-focus="false"
    :bordered="false"
    class="add-playlist"
    preset="card"
    title="添加到歌单"
    transform-origin="center"
    @after-leave="closeAddToPlaylist"
  >
    <n-scrollbar style="max-height: 70vh">
      <n-list class="playlists-list" hoverable clickable>
        <!-- 新建歌单 -->
        <n-list-item class="playlist add" @click="createPlaylistRef?.openCreatePlaylist()">
          <template #prefix>
            <n-icon size="20">
              <SvgIcon icon="add" />
            </n-icon>
          </template>
          <n-thing title="创建新歌单" />
        </n-list-item>
        <!-- 已有歌单 -->
        <n-list-item
          v-for="(item, index) in userLikeData.playlists.filter(
            (playlist) => playlist.userId === userData?.userId,
          )"
          :key="index"
          class="playlist"
          @click="addToPlayList(item.id, addToPlaylistId, index)"
        >
          <template #prefix>
            <n-image
              :src="item?.coverSize?.s || '/images/pic/album.jpg?assest'"
              class="cover"
              preview-disabled
              lazy
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img class="loading-img" src="/images/pic/album.jpg?assest" alt="song" />
                </div>
              </template>
            </n-image>
          </template>
          <n-thing :title="item.name">
            <template #description>
              <n-text depth="3" class="size">{{ item.count }} 首音乐</n-text>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-scrollbar>
  </n-modal>
  <!-- 新建歌单 -->
  <CreatePlaylist ref="createPlaylistRef" />
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import { addSongToPlayList } from "@/api/playlist";
import { isLogin } from "@/utils/auth";

const data = siteData();
const { userLikeData, userData } = storeToRefs(data);

// 子组件
const createPlaylistRef = ref(null);

// 收藏到歌单数据
const addToPlaylistShow = ref(false);
const addToPlaylistId = ref(null);

// 收藏到歌单
const addToPlayList = async (pid, tracks, index) => {
  const result = await addSongToPlayList(pid, tracks);
  console.log(result);
  if (result.status === 200) {
    closeAddToPlaylist();
    $message.success("添加歌曲至歌单成功");
    if (index === 0) await data.setUserLikeSongs();
  } else {
    $message.error(result?.message || "添加失败，请重试");
  }
};

// 开启收藏到歌单
const openAddToPlaylist = async (id) => {
  if (!isLogin()) return $message.warning("请登录后使用");
  addToPlaylistId.value = id;
  addToPlaylistShow.value = true;
  await data.setUserLikePlaylists();
};

// 关闭收藏到歌单
const closeAddToPlaylist = () => {
  addToPlaylistShow.value = false;
};

// 暴露方法
defineExpose({
  openAddToPlaylist,
});
</script>

<style lang="scss">
.add-playlist {
  width: 500px;
  border-radius: 8px;
  overflow: hidden;
  .n-card__content {
    padding: 0;
  }
  .playlist {
    &.add {
      .n-list-item__prefix {
        min-width: 50px;
        height: 50px;
        border-radius: 8px;
        background-color: var(--n-border-color-popover);
      }
    }
    .n-list-item__prefix {
      display: flex;
      align-items: center;
      justify-content: center;
      .cover {
        width: 50px;
        height: 50px;
        border-radius: 8px;
      }
    }
  }
}
</style>
