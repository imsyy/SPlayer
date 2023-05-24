<template>
  <n-modal
    class="s-modal"
    v-model:show="createPlaylistShow"
    preset="card"
    :title="$t('menu.create')"
    :bordered="false"
    :on-after-leave="closeCreatePlaylist"
  >
    <n-input
      style="margin-bottom: 12px"
      v-model:value="createName"
      type="text"
      :placeholder="$t('other.newPlaylistName')"
    />
    <n-checkbox v-model:checked="createPrivacy">
      {{ $t("other.setPrivacy") }}
    </n-checkbox>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeCreatePlaylist">
          {{ $t("general.dialog.cancel") }}
        </n-button>
        <n-button
          type="primary"
          :disabled="!createName"
          @click="createPlaylistBtn(createName, createPrivacy)"
        >
          {{ $t("general.dialog.create") }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { userStore } from "@/store";
import { createPlaylist } from "@/api/playlist";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const user = userStore();

// 新建歌单数据
const createPlaylistShow = ref(false);
const createPrivacy = ref(false);
const createName = ref(null);

// 新建歌单
const createPlaylistBtn = (name, privacy = false) => {
  createPlaylist(name, privacy ? "10" : null).then((res) => {
    if (res.code === 200) {
      closeCreatePlaylist();
      $message.success(t("general.message.createSuccess"));
      user.setUserPlayLists();
    } else {
      $message.error(t("general.message.createFailed"));
    }
  });
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
