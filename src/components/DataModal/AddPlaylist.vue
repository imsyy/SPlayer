<template>
  <n-modal
    class="add-playlist s-modal"
    v-model:show="addToPlaylistModal"
    preset="card"
    :bordered="false"
    :on-after-leave="closeAddToPlaylist"
  >
    <template #header>
      {{ $t("menu.add") }}
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
        {{ $t("menu.create") }}
      </n-tag>
    </template>
    <Transition mode="out-in">
      <div v-if="user.getUserPlayLists.own[0]">
        <n-space vertical class="list">
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
              <n-text class="num">{{
                $t("general.name.songSize", {
                  size: item.trackCount,
                })
              }}</n-text>
            </div>
          </div>
        </n-space>
      </div>
      <n-text v-else>{{ $t("general.message.isLoading") }}</n-text>
    </Transition>
  </n-modal>
  <!-- 新建歌单 -->
  <CreatePlaylist ref="createPlaylistRef" />
</template>

<script setup>
import { addSongToPlayList } from "@/api/playlist";
import { userStore } from "@/store";
import { useI18n } from "vue-i18n";
import CreatePlaylist from "./CreatePlaylist.vue";

const { t } = useI18n();
const user = userStore();
const createPlaylistRef = ref(null);

// 收藏到歌单数据
const addToPlaylistModal = ref(false);
const addToPlaylistId = ref(null);

// 收藏到歌单
const addToPlayList = (pid, tracks) => {
  addSongToPlayList(pid, tracks).then((res) => {
    console.log(res);
    if (res.status === 200) {
      $message.success(t("general.message.addSuccess"));
      closeAddToPlaylist();
      user.setUserPlayLists();
    } else {
      $message.error(t("general.message.addFailure"));
    }
  });
};

// 开启收藏到歌单
const openAddToPlaylist = (id) => {
  if (!user.userLogin) {
    $message.error(t("general.message.needLogin"));
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
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
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
