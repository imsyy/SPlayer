<template>
  <div class="update-playlist">
    <n-form ref="updateFormRef" :model="updateFormData" :rules="updateFormRules">
      <n-form-item :label="t('modal.playlist.name')" path="name">
        <n-input
          v-model:value="updateFormData.name"
          :disabled="isLiked"
          :placeholder="t('modal.playlist.namePlaceholder')"
        />
      </n-form-item>
      <n-form-item :label="t('modal.playlist.desc')" path="desc">
        <n-input
          v-model:value="updateFormData.desc"
          :autosize="{
            minRows: 3,
            maxRows: 6,
          }"
          :maxlength="800"
          :placeholder="t('modal.playlist.descPlaceholder')"
          type="textarea"
          show-count
          clearable
        />
      </n-form-item>
      <n-form-item :label="t('modal.playlist.tags')" path="tags">
        <n-select
          v-model:value="updateFormData.tags"
          :options="tagList"
          :placeholder="t('modal.playlist.tagsPlaceholder')"
          filterable
          multiple
          @update:value="checkTags"
        />
      </n-form-item>
    </n-form>
    <n-button class="create" type="primary" @click="toUpdatePlaylist">
      {{ t("modal.playlist.edit") }}
    </n-button>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { textRule } from "@/utils/rules";
import { useDataStore } from "@/stores";
import { debounce, isEmpty, size } from "lodash-es";
import { updatePlaylist } from "@/api/playlist";
import { updateUserLikePlaylist } from "@/utils/auth";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// 表单类型
interface UpdateFormType {
  name: string;
  desc?: string;
  tags?: string[];
}

const props = defineProps<{
  id: number;
  data: CoverType;
}>();

const emit = defineEmits<{ success: [] }>();

const dataStore = useDataStore();

// 是否为我喜欢
const isLiked = computed(() => dataStore.userLikeData.playlists?.[0]?.id === props.id);

// 表单数据
const updateFormRef = ref<FormInst | null>(null);
const updateFormData = ref<UpdateFormType>({
  name: isLiked.value ? t("menu.myLikeSongs") : props.data.name,
  desc: props.data.description,
  tags: props.data.tags,
});
const updateFormRules: FormRules = { name: textRule };

// 歌单分类数据
const tagList = computed<SelectOption[]>(() => {
  if (isEmpty(dataStore.catData?.cats)) return [];
  return Object.keys(dataStore.catData?.type).map((key) => ({
    type: "group",
    key,
    label: dataStore.catData?.type[key],
    children: dataStore.catData?.cats
      ?.filter((cat) => cat.category === Number(key))
      .map((cat) => ({
        label: cat.name,
        value: cat.name,
      })),
  }));
});

// 检查标签
const checkTags = (tags: string[]) => {
  if (size(tags) > 3) {
    updateFormData.value.tags = tags.slice(0, 3);
    window.$message.warning(t("modal.playlist.tagLimit"));
  }
};

// 更新歌单
const toUpdatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    // 是否输入
    await updateFormRef.value?.validate((errors) => errors);
    // 新建歌单
    const result = await updatePlaylist(
      props.id,
      updateFormData.value.name,
      updateFormData.value.desc ?? "",
      updateFormData.value.tags ?? [],
    );
    if (result.code === 200) {
      emit("success");
      window.$message.success(t("modal.playlist.editSuccess"));
      await updateUserLikePlaylist();
    } else {
      window.$message.error(result.message || t("modal.playlist.editFail"));
    }
  },
  300,
  { leading: true, trailing: false },
);

onMounted(() => dataStore.getPlaylistCatList());
</script>

<style lang="scss" scoped>
.update-playlist {
  .create {
    width: 100%;
  }
}
</style>
