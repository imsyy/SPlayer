<template>
  <div class="create-playlist">
    <n-tabs v-model:value="playlistType" type="segment" animated>
      <n-tab-pane :disabled="isLogin() !== 1" name="online" :tab="t('menu.onlinePlaylist')">
        <n-form ref="onlineFormRef" :model="onlineFormData" :rules="onlineFormRules">
          <n-form-item :label="t('menu.playlistName')" path="name">
            <n-input v-model:value="onlineFormData.name" :placeholder="t('menu.playlistNamePlaceholder')" />
          </n-form-item>
          <n-form-item :label="t('menu.playlistType')" path="type">
            <n-select v-model:value="onlineFormData.type" :options="onlinePlaylistType" />
          </n-form-item>
          <n-form-item :label="t('menu.setPrivate')" path="privacy" label-placement="left">
            <n-switch v-model:value="onlineFormData.privacy" />
          </n-form-item>
        </n-form>
      </n-tab-pane>
      <n-tab-pane name="local" :tab="t('menu.localPlaylist')">
        <n-empty :description="t('menu.notImplemented')" />
      </n-tab-pane>
    </n-tabs>
    <n-button class="create" type="primary" @click="toCreatePlaylist"> {{ t("modal.create") }} </n-button>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { useDataStore } from "@/stores";
import { textRule } from "@/utils/rules";
import { debounce } from "lodash-es";
import { createPlaylist } from "@/api/playlist";
import { isLogin, updateUserLikePlaylist } from "@/utils/auth";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const emit = defineEmits<{ close: [] }>();

// 表单类型
interface OnlineFormType {
  name: string;
  type: "NORMAL" | "VIDEO" | "SHARED";
  privacy?: boolean;
}

const dataStore = useDataStore();

// 歌单类别
const playlistType = ref<"online" | "local">(isLogin() === 1 ? "online" : "local");

// 在线歌单数据
const onlineFormRef = ref<FormInst | null>(null);
const onlineFormData = ref<OnlineFormType>({ name: "", type: "NORMAL", privacy: false });
const onlineFormRules: FormRules = { name: textRule };

// 在线歌单类型
const onlinePlaylistType = computed<SelectOption[]>(() => [
  {
    label: t("menu.typeNormal"),
    value: "NORMAL",
  },
  {
    label: t("menu.typeVideo"),
    disabled: true,
    value: "VIDEO",
  },
  {
    label: t("menu.typeShared"),
    disabled: true,
    value: "SHARED",
  },
]);

// 新建歌单
const toCreatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    if (playlistType.value === "online") {
      // 是否输入
      await onlineFormRef.value?.validate((errors) => errors);
      // 新建歌单
      const result = await createPlaylist(
        onlineFormData.value.name,
        onlineFormData.value.privacy,
        onlineFormData.value.type,
      );
      if (result.code === 200) {
        emit("close");
        window.$message.success(t("menu.createSuccess"));
        if (dataStore.userData.createdPlaylistCount) {
          dataStore.userData.createdPlaylistCount++;
        }
        await updateUserLikePlaylist();
      } else {
        window.$message.error(result.message || t("menu.createFailed"));
      }
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.create-playlist {
  .n-form {
    margin-top: 12px;
  }
  .create {
    width: 100%;
  }
  .n-empty {
    padding: 40px 0;
  }
}
</style>
