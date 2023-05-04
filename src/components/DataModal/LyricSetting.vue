<template>
  <!-- 歌词设置 -->
  <n-modal
    :bordered="false"
    :z-index="10000"
    class="s-modal"
    v-model:show="LyricSettingModal"
    preset="card"
    title="歌词设置"
    transform-origin="center"
  >
    6666
  </n-modal>
</template>

<script setup>
// 歌词设置弹窗
const LyricSettingModal = ref(false);

// 开启歌词设置弹窗
const openLyricSetting = () => {
  LyricSettingModal.value = true;
};

// 暴露方法
defineExpose({
  openLyricSetting,
});
</script>
