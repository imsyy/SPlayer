<!-- 添加到歌单 -->
<template>
  <div class="playlist-add">
    <n-tabs :default-value="isLocal ? 'local' : 'online'" type="segment" animated>
      <n-tab-pane :disabled="isLocal" name="online" tab="在线歌单">
        <n-scrollbar style="max-height: 70vh">
          <n-list class="playlists-list" hoverable clickable>
            <!-- 新建歌单 -->
            <n-list-item class="playlist add" @click="openCreatePlaylist">
              <template #prefix>
                <SvgIcon name="Add" :size="20" />
              </template>
              <n-thing title="创建新歌单" />
            </n-list-item>
            <!-- 已有歌单 -->
            <n-list-item
              v-for="(item, index) in onlinePlaylists"
              :key="index"
              class="playlist"
              @click="addPlaylist(item?.id, index)"
            >
              <template #prefix>
                <n-image
                  :src="item?.coverSize?.s || '/images/album.jpg?assest'"
                  class="cover"
                  preview-disabled
                  lazy
                  @load="coverLoaded"
                >
                  <template #placeholder>
                    <div class="cover-loading">
                      <img class="loading-img" src="/images/album.jpg?assest" alt="loading-img" />
                    </div>
                  </template>
                </n-image>
              </template>
              <n-thing :title="index === 0 ? '我喜欢的音乐' : item.name">
                <template #description>
                  <n-text depth="3" class="size">{{ item.count }} 首音乐</n-text>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-scrollbar>
      </n-tab-pane>
      <n-tab-pane name="local" tab="本地歌单">
        <n-empty description="暂未实现" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { MessageReactive } from "naive-ui";
import { useDataStore } from "@/stores";
import { coverLoaded } from "@/utils/helper";
import { playlistTracks } from "@/api/playlist";
import { debounce } from "lodash-es";
import { isLogin, updateUserLikePlaylist, updateUserLikeSongs } from "@/utils/auth";
import { openCreatePlaylist } from "@/utils/modal";

const props = defineProps<{
  data: SongType[];
  isLocal: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();

// 加载提示
const loadingMsg = ref<MessageReactive>();

// 在线歌单
const onlinePlaylists = computed(() => {
  return (
    dataStore.userLikeData.playlists.filter(
      (playlist) => playlist.userId === dataStore.userData?.userId,
    ) || []
  );
});

// 添加到歌单
const addPlaylist = debounce(
  async (id: number, index: number) => {
    if (isLogin() === 2) {
      window.$message.warning("该登录模式暂不支持该操作");
      return;
    }
    loadingMsg.value = window.$message.loading("正在添加歌曲至歌单", { duration: 0 });
    const ids = props.data.map((item) => item.id).filter((item) => item !== 0);
    const result = await playlistTracks(id, ids);
    if (loadingMsg.value) loadingMsg.value.destroy();
    if (result.status === 200) {
      if (result.body?.code !== 200) {
        window.$message.error(result.body?.message || "添加失败，请重试");
        return;
      }
      emit("close");
      window.$message.success("添加歌曲至歌单成功");
      if (index === 0) await updateUserLikeSongs();
      await updateUserLikePlaylist();
    } else {
      window.$message.error(result?.message || "添加失败，请重试");
    }
  },
  500,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.playlists-list {
  .playlist {
    border-radius: 8px;
    :deep(.n-list-item__prefix) {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: var(--n-border-color);
      overflow: hidden;
      transition: background-color 0.3s;
    }
  }
}
.n-empty {
  padding: 40px 0;
}
</style>
