<template>
  <n-modal
    class="s-modal"
    v-model:show="playlistUpdateModal"
    preset="card"
    :title="$t('menu.update')"
    :bordered="false"
    :on-after-leave="closeUpdateModal"
  >
    <n-form
      ref="playlistUpdateRef"
      :rules="playlistUpdateRules"
      :label-width="80"
      :model="playlistUpdateValue"
    >
      <n-form-item :label="$t('other.plName')" path="name">
        <n-input
          v-model:value="playlistUpdateValue.name"
          :placeholder="$t('other.plNameTip')"
        />
      </n-form-item>
      <n-form-item :label="$t('other.plDes')" path="desc">
        <n-input
          v-model:value="playlistUpdateValue.desc"
          type="textarea"
          :placeholder="$t('other.plDesTip')"
          :autosize="{
            minRows: 3,
            maxRows: 5,
          }"
        />
      </n-form-item>
      <n-form-item :label="$t('other.plTag')" path="tags">
        <n-select
          multiple
          v-model:value="playlistUpdateValue.tags"
          :placeholder="$t('other.plTagTip')"
          :options="playlistTags"
          @click="openSelect"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeUpdateModal">
          {{ $t("general.dialog.cancel") }}
        </n-button>
        <n-button type="primary" @click="toUpdatePlayList">
          {{ $t("general.dialog.editor") }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { playlistUpdate } from "@/api/playlist";
import { formRules } from "@/utils/formRules";
import { musicStore, userStore } from "@/store";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { textRule } = formRules();
const music = musicStore();
const user = userStore();

// 更新歌单数据
const playlistUpdateId = ref(null);
const playlistUpdateRef = ref(null);
const playlistUpdateModal = ref(false);
const playlistUpdateRules = {
  name: textRule,
};
const playlistUpdateValue = ref({
  name: null,
  desc: null,
  tags: null,
});

// 更新歌单
const toUpdatePlayList = (e) => {
  e.preventDefault();
  playlistUpdateRef.value?.validate((errors) => {
    if (!errors) {
      console.log("通过");
      playlistUpdate(
        playlistUpdateId.value,
        playlistUpdateValue._value.name,
        playlistUpdateValue._value.desc,
        playlistUpdateValue._value.tags.join(";")
      ).then((res) => {
        console.log(res);
        if (res.code === 200) {
          $message.success(t("general.message.editorSuccess"));
          closeUpdateModal();
          user.setUserPlayLists();
        } else {
          $message.error(t("general.message.editorFailed"));
        }
      });
    } else {
      $loadingBar.error();
      $message.error(t("general.message.needCheck"));
    }
  });
};

// 歌单分类标签
const playlistTags = ref([]);
const openSelect = () => {
  if (music.catList.sub) {
    playlistTags.value = music.catList.sub.map((v) => ({
      label: v.name,
      value: v.name,
    }));
  } else {
    music.setCatList();
  }
};

// 开启编辑歌单
const openUpdateModal = (data) => {
  playlistUpdateValue.value = {
    name: data.name,
    desc: data.desc,
    tags: data.tags,
  };
  playlistUpdateId.value = data.id;
  playlistUpdateModal.value = true;
};

// 关闭更新歌单弹窗
const closeUpdateModal = () => {
  playlistUpdateModal.value = false;
  playlistUpdateId.value = null;
};

// 暴露方法
defineExpose({
  openUpdateModal,
});
</script>
