<template>
  <n-modal
    v-model:show="playlistUpdateShow"
    :bordered="false"
    :on-after-leave="closeUpdateModal"
    title="编辑歌单"
    preset="card"
  >
    <n-form
      ref="playlistUpdateRef"
      :rules="playlistUpdateRules"
      :label-width="80"
      :model="playlistUpdateValue"
    >
      <n-form-item label="歌单名称" path="name">
        <n-input v-model:value="playlistUpdateValue.name" placeholder="请输入歌单名称" />
      </n-form-item>
      <n-form-item label="歌单简介" path="desc">
        <n-input
          v-model:value="playlistUpdateValue.desc"
          :autosize="{
            minRows: 3,
            maxRows: 6,
          }"
          type="textarea"
          placeholder="请输入歌单简介"
          maxlength="800"
          show-count
          clearable
        />
      </n-form-item>
      <n-form-item label="歌单标签" path="tags">
        <n-select
          v-model:value="playlistUpdateValue.tags"
          :options="playlistTags"
          placeholder="请选择歌单标签"
          multiple
          @click="openSelect"
        />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-flex justify="end">
        <n-button @click="closeUpdateModal"> 取消 </n-button>
        <n-button type="primary" @click="toUpdatePlayList"> 编辑 </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import { playlistUpdate } from "@/api/playlist";
import { formRules } from "@/utils/formRules";

const data = siteData();
const { textRule } = formRules();
const { plCatList } = storeToRefs(data);

// 更新歌单数据
const playlistUpdateId = ref(null);
const playlistUpdateRef = ref(null);
const playlistUpdateShow = ref(false);
const playlistUpdateRules = {
  name: textRule,
};
const playlistUpdateValue = ref({
  name: null,
  desc: null,
  tags: null,
});
const playlistTags = ref([]);

// 发射事件
const emit = defineEmits(["getPlayListDetailData"]);

// 更新歌单
const toUpdatePlayList = (e) => {
  e.preventDefault();
  playlistUpdateRef.value?.validate(async (errors) => {
    if (!errors) {
      const result = await playlistUpdate(
        playlistUpdateId.value,
        playlistUpdateValue._value.name,
        playlistUpdateValue._value.desc,
        playlistUpdateValue._value.tags.join(";"),
      );
      if (result.code === 200) {
        // 更新歌单详情
        emit("getPlayListDetailData", playlistUpdateId.value, true);
        // 更新歌单列表
        await data.setUserLikePlaylists();
        // 关闭弹窗
        closeUpdateModal();
        $message.success("歌单编辑成功");
      } else {
        $message.error("歌单编辑失败，请重试");
      }
    } else {
      $message.error("请检查你的输入");
    }
  });
};

// 开启歌单分类标签
const openSelect = async () => {
  if (plCatList.value.catList?.length) {
    playlistTags.value = plCatList.value.catList.map((v) => ({
      label: v.name,
      value: v.name,
    }));
  } else {
    await data.setPlCatList();
  }
};

// 开启编辑歌单
const openUpdateModal = (data) => {
  console.log(data);
  playlistUpdateValue.value = {
    name: data.name,
    desc: data.desc || data.description,
    tags: data.tags,
  };
  playlistUpdateId.value = data.id;
  playlistUpdateShow.value = true;
};

// 关闭更新歌单弹窗
const closeUpdateModal = () => {
  playlistUpdateShow.value = false;
  playlistUpdateId.value = null;
};

// 暴露方法
defineExpose({
  openUpdateModal,
});
</script>
